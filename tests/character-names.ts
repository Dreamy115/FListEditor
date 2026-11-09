import { createContext } from './helpers/typescript';
import * as units from './helpers/typescript.ts';
import assert from './helpers/assert';
import fs from 'node:fs';
import vm from 'node:vm';

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
  addEventListener?: (type: string, handler: (event?: any) => void) => void;
  blur?: () => void;
} = { value: '' };
let message = '',
  saved = 0;
const context = createContext({
  data,
  templateSession: null,
  $: () => input,
  active: () => data.drafts[0],
  toast: (text) => (message = text),
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
const handlers: Record<string, (event?: any) => void> = {};
input.addEventListener = (type, handler) => {
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
