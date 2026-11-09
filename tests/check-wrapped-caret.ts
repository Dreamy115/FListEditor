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
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.resolve('dist/Folio-Profile-Studio.html')).href);
    for (const width of [1440, 600]) {
      await page.setViewportSize({ width, height: 1000 });
      const failures = await page.evaluate(() => {
        const source = document.getElementById('source') as HTMLTextAreaElement,
          layer = document.getElementById('sourceHighlight') as HTMLElement,
          failures = [];
        for (const text of [
          'words with spaces '.repeat(30),
          'unbroken'.repeat(100),
          '**bold words** and *italic words* '.repeat(25),
          'text ◆ — © '.repeat(40),
          '[label](https://example.com/' + 'longpath'.repeat(50) + ')',
          '{color:red|' + 'longword'.repeat(50) + '}',
          '**' + 'longword'.repeat(50) + '**',
          '**◆ — © 漢字 😀 WWW** '.repeat(30),
          '*◆ — © 漢字 😀 WWW* '.repeat(30),
          '***◆ — © 漢字 😀 WWW*** '.repeat(30),
          '[b]◆ — © 漢字 😀 WWW[/b] '.repeat(30),
          ('text' + ' '.repeat(90) + 'after\t\t').repeat(10),
        ]) {
          source.value = text;
          source.dispatchEvent(new Event('input'));
          const mirror = layer.cloneNode(false) as HTMLElement;
          mirror.removeAttribute('id');
          mirror.textContent = text;
          layer.parentElement.append(mirror);
          const origin = layer.getBoundingClientRect(),
            expectedOrigin = mirror.getBoundingClientRect();
          const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
          let node,
            offset = 0;
          while ((node = walker.nextNode())) {
            for (let i = 0; i < node.length; i++, offset++) {
              if (offset >= text.length) break;
              const actual = document.createRange(),
                expected = document.createRange();
              actual.setStart(node, i);
              actual.setEnd(node, i + 1);
              expected.setStart(mirror.firstChild, offset);
              expected.setEnd(mirror.firstChild, offset + 1);
              const a = actual.getBoundingClientRect(),
                e = expected.getBoundingClientRect();
              if (
                Math.abs(a.left - origin.left - e.left + expectedOrigin.left) > 1 ||
                Math.abs(a.top - origin.top - e.top + expectedOrigin.top) > 1
              ) {
                failures.push({
                  text: text.slice(0, 35),
                  offset,
                  actual: [a.left - origin.left, a.top - origin.top],
                  expected: [e.left - expectedOrigin.left, e.top - expectedOrigin.top],
                });
                break;
              }
            }
            if (failures.at(-1)?.text === text.slice(0, 35)) break;
          }
          mirror.remove();
        }
        return failures;
      });
      assert.deepEqual(failures, []);
      for (const text of [
        'Normal text with several words on each wrapped row. '.repeat(30),
        'wrapped words and punctuation **bold** {color:red|text} '.repeat(30),
        '**◆ — © 漢字 😀 WWW** '.repeat(30),
      ]) {
        for (const scrollFraction of [0, 1]) {
          await page.locator('#source').fill(text);
          const points = await page.evaluate((scrollFraction) => {
            const layer = document.getElementById('sourceHighlight') as HTMLElement,
              source = document.getElementById('source') as HTMLTextAreaElement;
            source.scrollTop = (source.scrollHeight - source.clientHeight) * scrollFraction;
            source.dispatchEvent(new Event('scroll'));
            const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT),
              points = [];
            let node,
              offset = 0,
              lastTop;
            while ((node = walker.nextNode()))
              for (let i = 0; i < node.length; i++, offset++) {
                if (/[\uDC00-\uDFFF]/.test(node.data[i])) continue;
                const range = document.createRange();
                range.setStart(node, i);
                range.setEnd(node, i + 1);
                const rect = range.getBoundingClientRect(),
                  box = source.getBoundingClientRect();
                const startsRow = rect.top !== lastTop;
                lastTop = rect.top;
                if (
                  (offset % 17 === 0 || startsRow) &&
                  rect.top > box.top + 5 &&
                  rect.bottom < box.bottom - 5 &&
                  rect.width > 0
                )
                  points.push({
                    offset,
                    left: rect.left,
                    top: rect.top,
                    x: rect.left + rect.width * 0.25,
                    y: (rect.top + rect.bottom) / 2,
                  });
              }
            return points;
          }, scrollFraction);
          for (const point of points) {
            await page.locator('#source').fill(text);
            await page.locator('#source').evaluate((source, fraction) => {
              source.scrollTop = (source.scrollHeight - source.clientHeight) * fraction;
              source.dispatchEvent(new Event('scroll'));
            }, scrollFraction);
            await page.mouse.click(point.x, point.y);
            const actual = await page
              .locator('#source')
              .evaluate((source) => (source as HTMLTextAreaElement).selectionStart);
            assert.equal(actual, point.offset, JSON.stringify(point));
            const caret = await page.evaluate(() => {
              document.dispatchEvent(new Event('selectionchange'));
              const caret = document.querySelector<HTMLElement>('.source-selection-caret'),
                rect = caret.firstElementChild.getBoundingClientRect();
              return { hidden: caret.hidden, left: rect.left, top: rect.top };
            });
            assert.equal(caret.hidden, false);
            assert.ok(
              Math.abs(caret.left - point.left) < 1 && Math.abs(caret.top - point.top) < 1,
              JSON.stringify({ point, caret }),
            );
            await page.keyboard.insertText('X');
            assert.equal(
              await page.locator('#source').inputValue(),
              text.slice(0, point.offset) + 'X' + text.slice(point.offset),
              'Typing inserts at the visible character position',
            );
          }
        }
      }
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('#source').focus();
    assert.equal(
      await page
        .locator('.source-selection-caret span')
        .evaluate((bar) => getComputedStyle(bar).animationName),
      'none',
    );
    await page.emulateMedia({ forcedColors: 'active' });
    assert.equal(
      await page
        .locator('.source-selection-caret')
        .evaluate((caret) => getComputedStyle(caret).display),
      'none',
    );
    assert.notEqual(
      await page.locator('#source').evaluate((source) => getComputedStyle(source).caretColor),
      'rgba(0, 0, 0, 0)',
    );
    console.log('Wrapped source clicks, caret positions and typed insertion agree');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
