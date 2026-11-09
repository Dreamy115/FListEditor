import { createContext } from './helpers/typescript';
import * as units from './helpers/typescript.ts';
import assert from './helpers/assert';
import fs from 'node:fs';
import vm from 'node:vm';

const data = { active: 'b', drafts: ['a', 'b', 'c', 'd'].map((id) => ({ id, content: id })) };
let saved,
  rendered = 0;
const context = createContext({
  data,
  persist: () => {
    saved = JSON.stringify(data);
  },
  renderDrafts: () => rendered++,
});
units.load(context, 'characters/characters', { names: ['reorderDraft'], effects: [] });
const order = () => data.drafts.map((d) => d.id).join('');
context.reorderDraft('a', 'c', true);
assert.equal(order(), 'bcad');
context.reorderDraft('d', 'b', false);
assert.equal(order(), 'dbca');
context.reorderDraft('c', 'b', false);
assert.equal(order(), 'dcba');
context.reorderDraft('c', 'b', true);
assert.equal(order(), 'dbca');
assert.equal(data.active, 'b');
assert.deepEqual(
  JSON.parse(saved).drafts.map((d) => d.id),
  ['d', 'b', 'c', 'a'],
);
assert.equal(data.drafts.find((d) => d.id === 'b').content, 'b');
context.reorderDraft('a', 'a', true);
context.reorderDraft('missing', 'b', false);
context.reorderDraft('b', 'missing', false);
assert.equal(order(), 'dbca');
assert.equal(rendered, 4);
console.log('Character reorder and persistence checks passed');
