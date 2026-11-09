import type { TestControl, TestHandler } from './helpers/types';
import { createContext } from './helpers/typescript';
import * as units from './helpers/typescript.ts';
import assert from './helpers/assert';

const source = {
  value: 'literal',
  selectionStart: 0,
  selectionEnd: 0,
  scrollTop: 200,
  scrollLeft: 0,
  focus() {},
  setSelectionRange(start: number, end: number) {
    this.selectionStart = start;
    this.selectionEnd = end;
  },
};
const data = { active: 'one', mixed: true, preferLiterals: true },
  elements = new Map<string, TestControl>(),
  handlers: Record<string, TestHandler> = {};
const $ = (id: string) => {
  if (!elements.has(id))
    elements.set(id, {
      addEventListener: (type: string, fn: TestHandler) => (handlers[id + ':' + type] = fn),
    });
  return elements.get(id)!;
};
const context = createContext({
  source,
  data,
  $,
  templateSession: null,
  editHistories: new Map(),
  active: () => ({}),
  updateMode: () => {
    $('preferLiterals').checked = data.preferLiterals !== false;
  },
  updateActiveSyntax: () => {},
  syncHighlightScroll: () => {},
  scheduleSave: () => {},
  requestAnimationFrame: () => {},
  refresh: () => {},
  persist: () => {},
  convertEntityPreference: (_text: string, literals: boolean) => (literals ? 'literal' : 'code'),
});
units.load(context, 'app/state', { names: ['MAX_UNDO_STATES'], effects: [] });
units.load(context, 'editor/history', {
  names: [
    'editorSnapshot',
    'currentHistory',
    'refreshUndoButtons',
    'rememberSelection',
    'commitEdit',
    'restoreEdit',
    'undoEdit',
    'redoEdit',
  ],
  effects: ["$('undoEdit')", "$('redoEdit')"],
});
context.replaceRange = (text: string) => {
  context.rememberSelection();
  source.value = text;
  context.commitEdit('action');
};
units.load(context, 'editor/toolbar', { names: [], effects: ["$('preferLiterals')"] });
handlers['preferLiterals:change']({ target: { checked: false } });
assert.equal(source.value, 'code');
assert.equal(data.preferLiterals, false);
context.undoEdit();
assert.equal(source.value, 'literal');
assert.equal(data.preferLiterals, true);
assert.equal($('preferLiterals').checked, true);
context.redoEdit();
assert.equal(source.value, 'code');
assert.equal(data.preferLiterals, false);
assert.equal($('preferLiterals').checked, false);
// Preference-only changes must also have an undo step.
context.convertEntityPreference = (text: string) => text;
handlers['preferLiterals:change']({ target: { checked: true } });
assert.equal(source.value, 'code');
assert.equal(data.preferLiterals, true);
context.undoEdit();
assert.equal(source.value, 'code');
assert.equal($('preferLiterals').checked, false);
context.redoEdit();
assert.equal(source.value, 'code');
assert.equal($('preferLiterals').checked, true);
assert.equal(source.scrollTop, 200);
console.log('Literal preference undo/redo and preference-only history checks passed');
