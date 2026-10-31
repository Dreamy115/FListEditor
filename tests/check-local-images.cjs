// Optional real-browser check: npm install --no-save playwright
const {chromium} = require('playwright');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

(async () => {
  const root = path.resolve(__dirname, '..');
  execFileSync('python', ['build.py'], {cwd:root, stdio:'inherit'});
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(root,'dist/Folio-Profile-Studio.html')).href);
    await page.evaluate(() => FolioLocalImages.ready);
    await page.locator('#bbMode').click();
    const source = '[collapse=Portrait][img=12345]Portrait label[/img][/collapse]';
    await page.locator('#source').fill(source);
    await page.waitForFunction(() => document.querySelector('#preview .placeholder-image'));
    await page.locator('#preview .bbcode-collapse-header').click();
    const pixels = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 40; canvas.height = 30;
      const context = canvas.getContext('2d'); context.fillStyle = 'red'; context.fillRect(0,0,40,30);
      return canvas.toDataURL();
    });
    await page.route('https://preview.test/**', route => route.fulfill({contentType:'image/png',body:Buffer.from(pixels.split(',')[1],'base64')}));
    await page.locator('#preview .placeholder-image').click();
    assert.equal(await page.locator('#localImagePanel').isVisible(), true);
    assert.equal(await page.locator('#localImageId').inputValue(), '12345', 'Placeholder click selects its ID');
    await page.locator('#localImageFile').setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:Buffer.from(pixels.split(',')[1],'base64')});
    await page.waitForFunction(() => FolioLocalImages.get('12345')?.kind === 'file');
    assert.equal(await page.locator('#source').inputValue(), source);
    assert.equal(await page.locator('#preview .local-inline-image').getAttribute('alt'), 'Portrait label');
    assert.equal(await page.locator('#preview .collapsed').count(), 0, 'Updating attachments preserves open sections');
    assert.equal(await page.evaluate(() => FolioLocalImages.get('12345').url), pixels);
    const html = await page.evaluate(() => FolioScreenshot.html(document.getElementById('previewPage'),'Test'));
    assert.ok(html.includes(pixels), 'HTML embeds local image');
    assert.ok(await page.evaluate(async () => (await FolioScreenshot.capture(document.getElementById('previewPage'))).size > 1000));
    await page.locator('#closeImageMappings').click();
    await page.locator('#mixedMode').click();
    const adjacent = '{img:12345|portrait}{img:12345}';
    await page.locator('#source').fill(adjacent);
    await page.waitForFunction(() => document.querySelectorAll('#preview .local-inline-image').length === 2);
    const stacked = await page.locator('#preview .local-inline-image').evaluateAll(images => {
      const [first,second] = images.map(image => image.getBoundingClientRect());
      return first.height > 0 && second.top >= first.bottom;
    });
    assert.ok(stacked, 'Adjacent image macros stack vertically in the preview');
    assert.equal(await page.locator('#source').inputValue(), adjacent, 'Preview stacking never adds source newlines');
    await page.locator('#bbMode').click();
    for (const theme of ['flist-blue','classic']) {
      await page.locator('#theme').selectOption(theme);
      for (const [outer,inner] of [['left','left'],['left','center'],['left','right'],['center','left'],['right','center']]) {
        const code = `[${outer}][${inner}][img=12345][/img][img=12345][/img][/${inner}][/${outer}]`;
        await page.locator('#source').fill(code);
        await page.waitForFunction(() => document.querySelectorAll('#preview .local-inline-image').length === 2);
        const valid = await page.locator('#preview .local-inline-image').evaluateAll((images, alignment) => {
          const [first,second] = images.map(image => image.getBoundingClientRect());
          const block = images[0].parentElement.getBoundingClientRect();
          const position = alignment === 'left' ? first.left - block.left : alignment === 'right' ? block.right - first.right : (first.left + first.right - block.left - block.right) / 2;
          return first.height > 0 && second.top >= first.bottom && Math.abs(position) < 1;
        }, inner);
        assert.ok(valid, `${theme}: stacked images follow ${inner} alignment inside ${outer}`);
        assert.equal(await page.locator('#source').inputValue(), code);
      }
    }
    for (const mixed of [false,true]) {
      await page.locator(mixed ? '#mixedMode' : '#bbMode').click();
      await page.locator('#source').fill('before label after');
      await page.locator('#source').evaluate(element => element.setSelectionRange(7,12));
      await page.locator('[data-insert="inlineimg"]').click();
      await page.getByRole('button',{name:'Insert F-List image 12345',exact:true}).click();
      assert.equal(await page.locator('#source').inputValue(), mixed ? 'before {img:12345|label} after' : 'before [img=12345]label[/img] after');
      await page.locator('#undoEdit').click();
      assert.equal(await page.locator('#source').inputValue(), 'before label after', 'Image insertion is one undo action');
      await page.locator('#source').fill('');
      await page.locator('[data-insert="inlineimg"]').click();
      await page.locator('#customInlineImageId').fill('not-an-id');
      await page.getByRole('button',{name:'Insert ID',exact:true}).click();
      assert.equal(await page.locator('#inlineImagePicker').isVisible(), true);
      assert.equal(await page.locator('#source').inputValue(), '');
      await page.locator('#customInlineImageId').fill('98765');
      await page.getByRole('button',{name:'Insert ID',exact:true}).click();
      assert.equal(await page.locator('#source').inputValue(), mixed ? '{img:98765}' : '[img=98765][/img]');
      await page.locator('[data-insert="inlineimg"]').click();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#source').inputValue(), mixed ? '{img:98765}' : '[img=98765][/img]', 'Cancel leaves source unchanged');
    }
    await page.locator('#bbMode').click(); await page.locator('#source').fill(source);
    await page.waitForFunction(expected => {
      const saved = JSON.parse(localStorage.getItem('folio-f-list-studio-v1'));
      return saved?.mixed === false && saved.drafts.find(draft => draft.id === saved.active)?.content === expected;
    }, source);
    await page.reload(); await page.evaluate(() => FolioLocalImages.ready);
    await page.waitForFunction(() => document.querySelector('#preview .local-inline-image'));
    assert.equal(await page.locator('#source').inputValue(), source, 'Source survives reload unchanged');
    assert.equal(await page.evaluate(() => FolioLocalImages.get('12345').kind), 'file');
    await page.locator('#preview .bbcode-collapse-header').click();
    await page.locator('#preview .local-inline-image').click();
    assert.equal(await page.locator('#localImagePanel').isVisible(), true, 'Mapped image opens editor');
    await page.getByRole('button',{name:'Edit preview attachment for image 12345',exact:true}).click();
    assert.equal(await page.locator('#localImageId').inputValue(), '12345');
    await page.locator('#localImageUrl').fill('https://preview.test/portrait.png');
    await page.locator('#attachImageUrl').click();
    await page.waitForFunction(() => FolioLocalImages.get('12345')?.kind === 'url');
    assert.equal(await page.locator('#source').inputValue(), source);
    assert.equal(await page.locator('#preview .local-inline-image').getAttribute('src'), 'https://preview.test/portrait.png');
    await page.locator('#closeImageMappings').click();
    await page.locator('#preview .local-inline-image').press('Space');
    assert.equal(await page.locator('#localImageUrl').inputValue(), 'https://preview.test/portrait.png', 'Keyboard shortcut loads existing URL');
    await page.getByRole('button',{name:'Edit preview attachment for image 12345',exact:true}).click();
    await page.locator('#localImageUrl').fill('javascript:alert(1)');
    await page.locator('#attachImageUrl').click();
    await page.waitForFunction(() => !document.getElementById('attachImageUrl').disabled);
    assert.ok((await page.locator('#localImageStatus').textContent()).includes('HTTP or HTTPS'));
    assert.equal(await page.evaluate(() => FolioLocalImages.get('12345').url), 'https://preview.test/portrait.png');
    await page.getByRole('button',{name:'Remove preview attachment for image 12345',exact:true}).click();
    await page.waitForFunction(() => !FolioLocalImages.get('12345'));
    assert.equal(await page.locator('#source').inputValue(), source);
    assert.equal(await page.locator('#preview .placeholder-image').count(), 1);
    await page.locator('#closeImageMappings').click();
    assert.equal(await page.locator('#localImagePanel').isVisible(), false);
    await page.locator('#preview .placeholder-image').press('Enter');
    assert.equal(await page.locator('#localImageId').inputValue(), '12345');
    assert.equal(await page.locator('#localImageUrl').inputValue(), '', 'Unmapped shortcut clears stale URL');
    await page.locator('#closeImageMappings').click();
    const pending = page.waitForEvent('download'); await page.locator('#downloadCode').click();
    const exported = await pending;
    assert.equal(await fs.readFile(await exported.path(),'utf8'), source, 'BBCode export retains original image ID');
    await page.reload(); await page.evaluate(() => FolioLocalImages.ready);
    assert.equal(await page.evaluate(() => !!FolioLocalImages.get('12345')), false);
    assert.deepEqual(errors, []);
    console.log('Local file/URL mappings, editing, removal, persistence, exports and unchanged source passed');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
