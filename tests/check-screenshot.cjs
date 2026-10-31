// Optional real-browser check: npm install --no-save playwright
const {chromium} = require('playwright');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const fs = require('node:fs/promises');

(async () => {
  const root = path.resolve(__dirname, '..');
  execFileSync('python', ['build.py'], {cwd:root, stdio:'inherit'});
  const browser = await chromium.launch({channel:'msedge', headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}, acceptDownloads:true});
    await page.goto(pathToFileURL(path.join(root,'dist/Folio-Profile-Studio.html')).href);
    await page.addScriptTag({path:path.join(__dirname,'screenshot.browser.js')});
    await page.waitForFunction(() => document.getElementById('screenshot-result')?.textContent, null, {timeout:30000});
    const result = JSON.parse(await page.locator('#screenshot-result').textContent());
    if (!result.passed) throw Error(result.error);
    const download = page.waitForEvent('download');
    await page.locator('#exportScreenshot').click();
    const file = await download;
    if (!file.suggestedFilename().endsWith('.png') || await file.failure()) throw Error('PNG download failed');
    await page.waitForFunction(() => !document.getElementById('exportScreenshot').disabled);
    const original = await page.locator('#previewPage').innerHTML();
    if (await page.locator('#exportPdf').count()) throw Error('PDF export must be removed');
    // Grant access to read back the actual PNG written by the click handler.
    await page.context().grantPermissions(['clipboard-read','clipboard-write']);
    let copiedDownload = false;
    const onDownload = () => { copiedDownload = true; };
    page.on('download', onDownload);
    await page.locator('#copyScreenshot').click();
    await page.waitForFunction(() => !document.getElementById('copyScreenshot').disabled);
    const clipboard = await page.evaluate(async () => {
      const items = await navigator.clipboard.read();
      const item = items.find(item => item.types.includes('image/png'));
      if (!item) return null;
      const blob = await item.getType('image/png');
      const image = await createImageBitmap(blob);
      const size = {type:blob.type, bytes:blob.size, height:image.height}; image.close(); return size;
    });
    page.off('download', onDownload);
    if (!clipboard || clipboard.bytes < 1000 || clipboard.height < 1000 || copiedDownload) throw Error('Copy must write the full PNG without downloading');
    if (await page.locator('#previewPage').innerHTML() !== original) throw Error('Copy changed preview');
    // Permission rejection should restore the button and offer the download route.
    await page.evaluate(() => {
      window.originalClipboardWrite = navigator.clipboard.write.bind(navigator.clipboard);
      navigator.clipboard.write = async () => { throw new DOMException('Denied', 'NotAllowedError'); };
    });
    await page.locator('#copyScreenshot').click();
    await page.waitForFunction(() => !document.getElementById('copyScreenshot').disabled);
    if (!(await page.locator('#toast').textContent()).includes('Allow clipboard access')) throw Error('Copy failure needs useful feedback');
    await page.evaluate(() => { navigator.clipboard.write = window.originalClipboardWrite; });
    for (const format of ['Html']) {
      const pending = page.waitForEvent('download');
      await page.locator('#export'+format).click();
      const exported = await pending;
      const extension = format.toLowerCase();
      if (!exported.suggestedFilename().endsWith('.'+extension) || await exported.failure()) throw Error(extension+' download failed');
      const content = await fs.readFile(await exported.path());
      {
        const htmlPage = await browser.newPage();
        await htmlPage.setContent(content.toString('utf8'));
        const valid = await htmlPage.evaluate(() => {
          const card = document.querySelector('.previewpage');
          return card && !document.querySelector('#source') &&
            card.textContent.includes('Long profile line') &&
            [...card.querySelectorAll('.bbcode-collapse-body')].every(body => body.hidden && body.clientHeight === 0) &&
            [...card.querySelectorAll('.bbcode-collapse-header')].every(header => header.getAttribute('aria-expanded') === 'false') &&
            getComputedStyle(card).backgroundColor !== 'rgba(0, 0, 0, 0)';
        });
        if (!valid) throw Error('HTML must open independently with styled, collapsed sections');
        const headers = htmlPage.locator('.bbcode-collapse-header');
        const bodies = htmlPage.locator('.bbcode-collapse-body');
        await headers.first().click();
        if (!await bodies.first().isVisible() || await bodies.nth(1).isVisible()) throw Error('Opening outer section must leave nested section collapsed');
        await headers.nth(1).click();
        if (!await bodies.nth(1).isVisible()) throw Error('Nested section must expand');
        await headers.nth(1).click();
        if (await bodies.nth(1).isVisible() || await headers.nth(1).getAttribute('aria-expanded') !== 'false') throw Error('Nested section must collapse');
        await headers.first().click();
        if (await bodies.first().isVisible()) throw Error('Outer section must collapse');
        await headers.first().press('Enter');
        if (!await bodies.first().isVisible() || await bodies.nth(1).isVisible()) throw Error('Reopening outer section must retain inner state');
        await headers.nth(1).press('Space');
        if (!await bodies.nth(1).isVisible() || await headers.nth(1).getAttribute('aria-expanded') !== 'true') throw Error('Space must expand nested section');
        for (const width of [1920, 1440, 800, 390]) {
          await htmlPage.setViewportSize({width,height:1000});
          const fillsPage = await htmlPage.evaluate(() => {
            const card = document.querySelector('.previewpage');
            const bounds = card.getBoundingClientRect();
            const padding = parseFloat(getComputedStyle(card).paddingLeft);
            const expectedPadding = Math.max(12, Math.min(160, (innerWidth - 1000) / 2));
            return Math.abs(padding - expectedPadding) < 1 && bounds.x === 0 && bounds.y === 0 &&
              Math.abs(bounds.width - document.documentElement.clientWidth) < 1 &&
              bounds.height >= innerHeight && getComputedStyle(document.body).padding === '0px' &&
              getComputedStyle(card).borderRadius === '0px';
          });
          if (!fillsPage) throw Error('HTML must fill viewport without outer spacing at '+width+'px');
        }
        await htmlPage.close();
      }
      await page.waitForFunction(id => !document.getElementById(id).disabled, 'export'+format);
      if (await page.locator('#previewPage').innerHTML() !== original) throw Error('Export changed preview');
    }
    console.log('PNG download, clipboard image and standalone HTML passed; nested content and preview state verified');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
