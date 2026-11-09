import { createContext } from './helpers/typescript';
import * as units from './helpers/typescript.ts';
import assert from './helpers/assert';

const data = {
  active: 'one',
  drafts: [
    { id: 'one', name: 'Alice' },
    { id: 'two', name: 'Bob' },
    { id: 'three', name: 'Untitled character' },
  ],
};
const input: {
  value: string;
  addEventListener?: (
    type: string,
    handler: (event?: import('./helpers/types').TestEvent) => void,
  ) => void;
  blur?: () => void;
} = { value: '' };
let message = '',
  saved = 0;
const context = createContext({
  data,
  templateSession: null,
  $: () => input,
  active: () => data.drafts[0],
  toast: (text: string) => (message = text),
  renderDrafts: () => {},
  refresh: () => {},
  scheduleSave: () => saved++,
  updateTemplateStatus: () => {},
});
units.load(context, 'characters/characters', {
  names: ['characterNameKey', 'characterNameTaken', 'uniqueCharacterName', 'cloneName'],
  effects: [],
});
units.load(context, 'editor/sync', { names: ['syncName'], effects: [] });
assert.equal(context.uniqueCharacterName(' Untitled character '), 'Untitled character (2)');
data.drafts.push({ id: 'four', name: 'UNTITLED CHARACTER (2)' });
assert.equal(context.uniqueCharacterName('Untitled character'), 'Untitled character (3)');
assert.equal(context.uniqueCharacterName('Alice', 'one'), 'Alice');
assert.equal(context.characterNameTaken(' bob ', 'one'), true);
input.value = ' bOB ';
context.syncName();
assert.equal(data.drafts[0].name, 'Alice');
assert.equal(input.value, 'Alice');
assert.match(message, /already exists/);
assert.equal(saved, 0);
input.value = ' ALICE ';
context.syncName();
assert.equal(data.drafts[0].name, 'ALICE');
assert.equal(saved, 1);
const long = 'x'.repeat(100);
data.drafts.push({ id: 'long', name: long });
assert.equal(context.uniqueCharacterName(long).length, 100);
assert.equal(context.uniqueCharacterName(long).endsWith(' (2)'), true);
context.templateSession = {};
input.value = 'Bob';
context.syncName();
assert.equal(data.drafts[0].name, 'Bob');
console.log('Unique character creation and rename checks passed');

// Character names are committed after editing; existing prefixes remain typeable.
const handlers: Record<string, (event?: import('./helpers/types').TestEvent) => void> = {};
input.addEventListener = (type: string, handler) => {
  handlers[type] = handler;
};
input.blur = () => handlers.change();
units.load(context, 'editor/view', { names: [], effects: ["$('profileName')"] });
units.load(context, 'characters/events', { effects: ["$('profileName')"] });
context.templateSession = null;
data.drafts[0].name = 'Alice';
message = '';
input.value = 'Bob';
handlers.input();
assert.equal(input.value, 'Bob');
assert.equal(data.drafts[0].name, 'Alice');
assert.equal(message, '');
input.value = 'Bob B';
handlers.input();
handlers.change();
assert.equal(data.drafts[0].name, 'Bob B');
input.value = 'Bob';
handlers.input();
handlers.change();
assert.equal(input.value, 'Bob B');
assert.equal(data.drafts[0].name, 'Bob B');
assert.match(message, /already exists/);
let prevented = false;
input.value = 'Bob C';
handlers.keydown({
  key: 'Enter',
  preventDefault: () => {
    prevented = true;
  },
});
assert.equal(prevented, true);
assert.equal(data.drafts[0].name, 'Bob C');
input.value = 'Bob D';
handlers.keydown({
  key: 'Enter',
  isComposing: true,
  preventDefault: () => assert.fail('Composition must not commit'),
});
assert.equal(data.drafts[0].name, 'Bob C');
context.templateSession = {};
input.value = 'Template';
handlers.input();
assert.equal(data.drafts[0].name, 'Template');
console.log('Character name commit timing checks passed');

// More than 80 drafts must survive creation, cloning and reload.
const { boot } = await import('./helpers/browser.ts');
const { readFileSync } = await import('node:fs');
const appCode = readFileSync('build/app.js', 'utf8');
const initial = boot(appCode);
const seed = JSON.parse(
  initial.store.get('folio-f-list-studio-v1')!,
) as import('../src/app/types').AppData;
seed.drafts = Array.from({ length: 81 }, (_, index) => ({
  id: 'limit-' + index,
  name: 'Character ' + index,
  content: 'Saved body ' + index,
  mixed: true,
}));
seed.active = seed.drafts[0].id;
for (const control of ['newDraft', 'cloneEditor', 'newFromTemplate'] as const) {
  const browser = boot(appCode, seed);
  if (control === 'newFromTemplate') {
    browser.click('newTemplate');
    browser.input('Template body');
  }
  browser.click(control);
  assert.equal(browser.snapshot().names.length, 82);
  const reopened = boot(appCode, JSON.parse(browser.store.get('folio-f-list-studio-v1')!));
  assert.equal(reopened.snapshot().names.length, 82);
  assert.match(
    browser.document.getElementById('storageUsage')!.textContent!,
    /[\d,]+ B used · [\d,]+ B remaining/,
  );
}
// Actual byte quota rejects every creation route without replacing saved data or editor.
const quota = 2 * ('folio-f-list-studio-v1'.length + JSON.stringify(seed).length);
for (const control of ['newDraft', 'cloneEditor', 'newFromTemplate'] as const) {
  const browser = boot(appCode, seed, false, quota);
  if (control === 'newFromTemplate') {
    browser.click('newTemplate');
    browser.input('Template body');
  }
  const before = browser.store.get('folio-f-list-studio-v1');
  const sourceBefore = browser.source.value;
  browser.click(control);
  assert.equal(browser.snapshot().names.length, 81);
  assert.equal(browser.store.get('folio-f-list-studio-v1'), before);
  assert.equal(browser.source.value, sourceBefore);
  assert.match(browser.$('toast').textContent, /local storage full or unavailable/);
  assert.equal(
    [...browser.store.keys()].some((key) => key.startsWith('folio-storage-probe')),
    false,
  );
}
console.log('Storage quota and unlimited character count checks passed');
