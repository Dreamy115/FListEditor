import { createContext } from './helpers/typescript';
import assert from './helpers/assert';
import fs from 'node:fs';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';

const { document, window } = parseHTML('<div class="frame"><div id="preview"></div></div>');
const context = createContext({ document, window, URL, setTimeout, clearTimeout });
for (const file of ['build/horizon-renderer.js', 'build/preview-state.js'])
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
const preview = document.getElementById('preview') as HTMLElement,
  frame = preview.parentElement;
const render = (text) => context.FolioHorizon.render(text);
const update = (text, key = 'first') =>
  context.FolioPreview.update(preview, frame, text, render, key);
const original =
  '[collapse=First]Body[collapse=Nested]Inner[/collapse][/collapse][collapse=Second]More[/collapse]';
update(original);
for (const header of [...preview.querySelectorAll<HTMLElement>('.bbcode-collapse-header')].slice(
  0,
  2,
))
  header.click();
frame.scrollTop = 140;
frame.scrollLeft = 7;
const replaceChildren = preview.replaceChildren.bind(preview);
preview.replaceChildren = (...nodes) => {
  assert.equal(
    (nodes[0] as HTMLElement).querySelectorAll<HTMLElement>('.bbcode-collapse:not(.collapsed)')
      .length,
    2,
    'Expanded sections are restored before insertion to avoid shrinking the scroll range',
  );
  replaceChildren(...nodes);
};
update(original + '\nEdit');
preview.replaceChildren = replaceChildren;
assert.equal(frame.scrollTop, 140);
assert.equal(frame.scrollLeft, 7);
assert.deepEqual(
  [...preview.querySelectorAll<HTMLElement>('.bbcode-collapse')].map((el) =>
    el.classList.contains('collapsed'),
  ),
  [false, false, true],
);
assert.equal(preview.querySelector<HTMLElement>('.bbcode-collapse-body').style.height, '');
assert.ok(preview.querySelector<HTMLElement>('.bbcode-collapse-header-up .fa-chevron-up'));
const root = preview.firstElementChild;
update(original + '\nEdit');
assert.equal(preview.firstElementChild, root);
update('[collapse=Inserted]New[/collapse]' + original + '\nEdit');
assert.deepEqual(
  [...preview.querySelectorAll<HTMLElement>('.bbcode-collapse')].map((el) =>
    el.classList.contains('collapsed'),
  ),
  [true, false, false, true],
);
update('[collapse=Other]Body[/collapse]', 'other');
assert.equal(frame.scrollTop, 0);
assert.ok(preview.querySelector<HTMLElement>('.collapsed'));
update('[collapse=Inserted]New[/collapse]' + original + '\nEdit');
assert.equal(frame.scrollTop, 140);
assert.equal(preview.querySelectorAll<HTMLElement>('.bbcode-collapse:not(.collapsed)').length, 2);
update('[collapse=Inserted]New[/collapse]' + original.replace('Nested', 'Renamed') + '\nEdit');
assert.equal(preview.querySelectorAll<HTMLElement>('.bbcode-collapse:not(.collapsed)').length, 2);
console.log('Preview scroll and collapse state checks passed');
