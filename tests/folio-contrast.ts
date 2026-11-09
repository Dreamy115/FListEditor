import assert from './helpers/assert';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const names = [
  'red',
  'orange',
  'yellow',
  'green',
  'cyan',
  'blue',
  'purple',
  'pink',
  'black',
  'brown',
  'white',
  'gray',
];
function luminance(rgb: number[]) {
  return rgb
    .map((v) => v / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrast(a: number[], b: number[]) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
// Include gradient endpoints and the brightest/darkest decorative backgrounds.
const surfaces = {
  'folio-midnight': {
    body: ['#0a1824', '#173541', '#102431', '#193b48', '#0e202d', '#192f3d'],
    open: ['#193b48', '#17303e'],
    closed: ['#102431'],
  },
  'folio-parchment': {
    body: ['#f5e8c9', '#fff8df', '#ecdbb6', '#fff4d6', '#ecdbb6', '#e3d5b9'],
    open: ['#16392f', '#1b4035'],
    closed: ['#16392f', '#1b4035'],
  },
  'folio-classified': {
    body: ['#eeece3', '#e0e0d4', '#f8f7ef'],
    open: ['#343a34'],
    closed: ['#deded2'],
  },
};
(async () => {
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.resolve('dist/Folio-Profile-Studio.html')).href);
    const swatches = names.map((n) => `<span class="${n}Text">${n}</span>`).join(' ');
    await page.evaluate((swatches) => {
      const fixture = document.createElement('div');
      fixture.className = 'description';
      fixture.id = 'contrast-fixture';
      fixture.innerHTML = `<div data-context="body">${swatches}</div><blockquote>${swatches}</blockquote><div class="bbcode-collapse"><div class="bbcode-collapse-header" data-context="open">${swatches}</div><div class="bbcode-collapse-body">${swatches}</div></div><div class="bbcode-collapse collapsed"><div class="bbcode-collapse-header" data-context="closed">${swatches}</div></div>`;
      document.querySelector<HTMLElement>('#previewPage')!.append(fixture);
    }, swatches);
    let minimum = Infinity,
      checks = 0;
    for (const [theme, contexts] of Object.entries(surfaces)) {
      await page.selectOption('#theme', theme);
      for (const [context, backgrounds] of Object.entries(contexts)) {
        const colors = await page
          .locator(`#contrast-fixture [data-context="${context}"] span`)
          .evaluateAll((nodes) =>
            nodes.map((n) =>
              getComputedStyle(n)
                .color.match(/[\d.]+/g)!
                .slice(0, 3)
                .map(Number),
            ),
          );
        for (let i = 0; i < names.length; i++)
          for (const bg of backgrounds) {
            const ratio = contrast(colors[i], rgb(bg));
            minimum = Math.min(minimum, ratio);
            checks++;
            assert.ok(
              ratio >= 4.5,
              `${theme} ${context} ${names[i]} on ${bg}: ${ratio.toFixed(2)}:1`,
            );
          }
      }
    }
    console.log(
      `${checks} Folio named-color/surface checks passed; minimum ${minimum.toFixed(2)}:1`,
    );
  } finally {
    await browser.close();
  }
})().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
