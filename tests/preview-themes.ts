import assert from './helpers/assert';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

(async () => {
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage({ acceptDownloads: true });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve('dist/Folio-Profile-Studio.html')).href);
    assert.deepEqual(
      await page
        .locator('#theme optgroup')
        .evaluateAll((nodes) => nodes.map((n) => (n as HTMLOptGroupElement).label)),
      ['F-List site schemes', 'Horizon appearances', 'Folio appearances'],
    );
    const colors = [];
    for (const theme of ['folio-midnight', 'folio-parchment', 'folio-classified']) {
      await page.selectOption('#theme', theme);
      colors.push(
        await page.locator('#previewPage').evaluate((n) => getComputedStyle(n).backgroundColor),
      );
      const download = page.waitForEvent('download');
      await page.click('#previewCssMenu summary');
      await page.click('#downloadPreviewCss');
      assert.equal((await download).suggestedFilename(), theme + '.css');
    }
    assert.notEqual(colors[0], colors[1]);
    const sidebar = await page
      .locator('.sidebar')
      .evaluate((n) => getComputedStyle(n).backgroundColor);
    await page.setInputFiles('#previewCssFile', {
      name: 'my-theme.css',
      mimeType: 'text/css',
      buffer: Buffer.from(
        '.previewpage {background:rgb(10,20,30)} .sidebar {background:red!important} @media(min-width:1px){.description {letter-spacing:2px}}',
      ),
    });
    await page.waitForFunction(
      () => document.querySelector<HTMLSelectElement>('#theme')!.value === 'custom-css',
    );
    await page.waitForFunction(
      () =>
        getComputedStyle(document.querySelector<HTMLElement>('#previewPage')!).backgroundColor ===
        'rgb(10, 20, 30)',
    );
    assert.equal(
      await page.locator('.sidebar').evaluate((n) => getComputedStyle(n).backgroundColor),
      sidebar,
    );
    assert.equal(
      await page.locator('#preview .bbcode').evaluate((n) => getComputedStyle(n).letterSpacing),
      '2px',
    );
    await page.reload();
    assert.equal(await page.locator('#theme').inputValue(), 'custom-css');
    assert.equal(await page.locator('#previewCssStatus').textContent(), 'my-theme.css');
    const png = await page.evaluate(async () => {
      const screenshot = globalThis.FolioScreenshot;
      const blob = await screenshot.capture(document.querySelector<HTMLElement>('#previewPage')!);
      return { size: blob.size, type: blob.type };
    });
    assert.equal(png.type, 'image/png');
    assert.ok(png.size > 1000);
    const html = await page.evaluate(() =>
      globalThis.FolioScreenshot.html(document.querySelector<HTMLElement>('#previewPage')!, 'Test'),
    );
    assert.ok(html.includes('rgb(10, 20, 30)'));
    await page.click('#previewCssMenu summary');
    await page.click('#clearPreviewCss');
    assert.equal(await page.locator('#theme').inputValue(), 'folio-midnight');
    assert.deepEqual(errors, []);
    console.log(
      'Preview theme groups, examples, custom CSS scoping, persistence, PNG/HTML export and clearing passed',
    );
  } finally {
    await browser.close();
  }
})().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
