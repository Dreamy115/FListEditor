/** Cross-platform launcher for the existing in-browser regression fixtures. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../..', import.meta.url));

export async function runBrowserFixture(options: {
  script: string;
  resultId: string;
  widths: number[];
  globals?: Record<string, unknown>;
  gallery?: string[];
}): Promise<void> {
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    headless: true,
  });
  try {
    for (const width of options.widths) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      try {
        if (options.globals)
          await page.addInitScript((values) => Object.assign(window, values), options.globals);
        await page.goto(pathToFileURL(path.join(root, 'dist/Folio-Profile-Studio.html')).href, {
          waitUntil: 'domcontentloaded',
        });
        await page.addScriptTag({ path: path.join(root, 'tests', options.script) });
        await page.waitForFunction(
          (id: string) => document.getElementById(id)?.textContent,
          options.resultId,
          { timeout: 30_000 },
        );
        const result = JSON.parse((await page.locator('#' + options.resultId).textContent())!);
        assert.ok(result.passed, JSON.stringify({ width, ...result }));
        console.log(`${options.script} passed at ${width}px`);
      } finally {
        await page.close();
      }
    }
    for (const theme of options.gallery || []) {
      const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
      try {
        await page.addInitScript((values) => Object.assign(window, values), {
          ...options.globals,
          previewGalleryTheme: theme,
        });
        await page.goto(pathToFileURL(path.join(root, 'dist/Folio-Profile-Studio.html')).href, {
          waitUntil: 'domcontentloaded',
        });
        await page.addScriptTag({ path: path.join(root, 'tests/preview-gallery.browser.js') });
        const output = path.join(root, `dist/preview-${theme}.png`);
        await page.screenshot({ path: output });
        console.log(output);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}
