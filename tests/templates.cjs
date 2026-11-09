const units = require('./helpers/typescript.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({});
units.load(context, 'app/state', { names: ['validateCustomTemplates'], effects: [] });
const validate = (value) => JSON.parse(JSON.stringify(context.validateCustomTemplates(value)));
assert.deepEqual(validate(undefined), []);
assert.deepEqual(validate({}), []);
assert.deepEqual(
  validate([
    null,
    {},
    { id: 'bad', name: ' ', content: '' },
    { id: 'one', name: '  Reusable profile  ', content: '# Name\n\n:::i\nLine one\nLine two\n:::' },
    { id: 'one', name: 'Duplicate', content: 'bad' },
    { id: 'large', name: 'Too large', content: 'x'.repeat(1500001) },
  ]),
  [{ id: 'one', name: 'Reusable profile', content: '# Name\n\n:::i\nLine one\nLine two\n:::' }],
);
assert.equal(validate([{ id: 'long', name: 'x'.repeat(120), content: '' }])[0].name.length, 100);
assert.equal(
  validate(
    Array.from({ length: 110 }, (_, i) => ({ id: String(i), name: 'Template ' + i, content: '' })),
  ).length,
  100,
);
console.log('Custom template storage validation checks passed');

// Sidebar labels must render names exactly, without decorative prefixes or
// stripping question marks that are part of the user's actual character name.
const { document } = require('linkedom').parseHTML('<div id="draftList"></div>');
const drafts = [
  { id: 'one', name: 'Character' },
  { id: 'two', name: '?User-chosen name' },
];
let selected;
const renderContext = vm.createContext({
  document,
  data: { drafts, active: 'one' },
  templateSession: null,
  $: (id) => document.getElementById(id),
  loadDraft: (id) => {
    selected = id;
  },
  renderTemplateTargets: () => {},
  clearDraftDrag: () => {},
});
units.load(renderContext, 'characters/characters', { names: ['renderDrafts'], effects: [] });
renderContext.renderDrafts();
assert.deepEqual(
  [...document.querySelectorAll('.draft span')].map((el) => el.textContent),
  drafts.map((d) => d.name),
);
document.querySelectorAll('.draft')[1].click();
assert.equal(selected, 'two');

// The separately loaded catalogue must compile and render through the real pipeline.
const { window, document: previewDocument } = require('linkedom').parseHTML('<html></html>');
const builtinContext = vm.createContext({ URL, window, document: previewDocument });
vm.runInContext(fs.readFileSync('src/templates.js', 'utf8'), builtinContext);
units.formatting(builtinContext);
vm.runInContext(fs.readFileSync('src/horizon-renderer.js', 'utf8'), builtinContext);
assert.deepEqual(Object.keys(builtinContext.FolioTemplates), [
  'dossier',
  'narrative',
  'compact',
  'archive',
]);
for (const [id, markdown] of Object.entries(builtinContext.FolioTemplates)) {
  const bbcode = builtinContext.markdownToBB(markdown);
  assert.deepEqual(
    Array.from(builtinContext.countWarnings(bbcode)),
    [],
    id + ' compiles without warnings',
  );
  const preview = builtinContext.FolioHorizon.render(bbcode);
  assert.ok(preview.querySelector('h2'), id + ' has a rendered heading');
  assert.ok(preview.querySelector('.bbcode-collapse'), id + ' has expandable details');
  assert.ok(
    !preview.textContent.includes(':::') && !preview.textContent.includes('{color:'),
    id + ' has no uncompiled layout markers',
  );
}
const page = fs.readFileSync('index.html', 'utf8');
assert.ok(
  page.indexOf('<script src="src/templates.js">') < page.indexOf('<script src="build/app.js">'),
);
console.log('Separate built-in template catalogue compilation and rendering checks passed');
