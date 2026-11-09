import assert from './helpers/assert';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(pathToFileURL(path.resolve('index.html')).href);
    await page.route('https://preview.test/tall.svg', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      await route.fulfill({
        contentType: 'image/svg+xml',
        headers: { 'cache-control': 'no-store' },
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="2400"/>',
      });
    });
    for (const collapse of [false, true]) {
      const result = await page.evaluate(async (collapse) => {
        const source = document.getElementById('source') as HTMLTextAreaElement;
        const frame = document.querySelector<HTMLElement>('.frame');
        const lines = Array.from({ length: 150 }, (_, i) => 'Line ' + i).join('\n');
        source.value = collapse ? ':::collapse Long section\n' + lines + '\n:::' : lines;
        source.dispatchEvent(new Event('input'));
        if (collapse) {
          document.querySelector<HTMLElement>('.bbcode-collapse-header')!.click();
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        frame!.scrollTop = 1000;
        const before = frame!.scrollTop;
        source.focus();
        source.setSelectionRange(10, 10);
        source.setRangeText('Edited ');
        source.dispatchEvent(new Event('input'));
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { before, after: frame!.scrollTop };
      }, collapse);
      assert.ok(result.before > 0);
      assert.equal(result.after, result.before, JSON.stringify({ collapse, ...result }));
    }
    await page.locator('#bbMode').click();
    await page.evaluate(() => FolioLocalImages.ready);
    await page.locator('#source').fill('[img=12345]Tall image[/img]\nAfter image');
    await page.locator('#preview .placeholder-image').click();
    await page.locator('#localImageUrl').fill('https://preview.test/tall.svg');
    await page.locator('#attachImageUrl').click();
    await page.locator('#closeImageMappings').click();
    await page.waitForFunction(
      () => document.querySelector<HTMLImageElement>('#preview img')?.naturalHeight === 2400,
      null,
      { timeout: 5000 },
    );
    const imageScroll = await page.evaluate(async () => {
      const source = document.getElementById('source') as HTMLTextAreaElement,
        frame = document.querySelector<HTMLElement>('.frame');
      frame!.scrollTop = 1200;
      const before = frame!.scrollTop;
      source.value += '!';
      source.dispatchEvent(new Event('input'));
      await new Promise((resolve) => setTimeout(resolve, 350));
      return { before, after: frame!.scrollTop };
    });
    assert.equal(
      imageScroll.after,
      imageScroll.before,
      'Reloading images preserves preview scroll',
    );
    await page.setViewportSize({ width: 600, height: 900 });
    const pageScroll = await page.evaluate(async () => {
      const source = document.getElementById('source') as HTMLTextAreaElement;
      source.value = Array.from({ length: 150 }, (_, i) => 'Line ' + i).join('\n');
      source.dispatchEvent(new Event('input'));
      window.scrollTo(0, 2500);
      const before = window.scrollY;
      source.value += '!';
      source.dispatchEvent(new Event('input'));
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { before, after: window.scrollY };
    });
    assert.equal(pageScroll.after, pageScroll.before, 'Stacked preview preserves page scroll');
    console.log('Source edits preserve preview scroll in plain and expanded content');
  } finally {
    await browser.close();
  }
})().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
