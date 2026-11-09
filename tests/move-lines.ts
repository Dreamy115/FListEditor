import { createContext } from './helpers/typescript';
import * as units from './helpers/typescript.ts';
import assert from './helpers/assert';
import fs from 'node:fs';
import vm from 'node:vm';

let commits = 0,
  syncs = 0,
  remembered = 0;
const source: {
  value?: string;
  selectionStart?: number;
  selectionEnd?: number;
  selectionDirection?: string;
  setRangeText(text: string, start: number, end: number): void;
  setSelectionRange(start: number, end: number, direction: string): void;
} = {
  setRangeText(text, start, end) {
    this.value = this.value.slice(0, start) + text + this.value.slice(end);
  },
  setSelectionRange(start, end, direction) {
    this.selectionStart = start;
    this.selectionEnd = end;
    this.selectionDirection = direction;
  },
};
const context = createContext({
  source,
  rememberSelection: () => remembered++,
  syncFromEditor: () => syncs++,
  commitEdit: () => commits++,
});
units.load(context, 'editor/shortcuts', { names: ['moveSourceLines'], effects: [] });
function check(text, start, end, direction, expected, newStart, newEnd, copy = false) {
  Object.assign(source, {
    value: text,
    selectionStart: start,
    selectionEnd: end,
    selectionDirection: 'backward',
  });
  const before = commits;
  context.moveSourceLines(direction, copy);
  assert.equal(source.value, expected);
  assert.equal(source.selectionStart, newStart);
  assert.equal(source.selectionEnd, newEnd);
  assert.equal(source.selectionDirection, 'backward');
  assert.equal(commits - before, expected === text ? 0 : 1);
}
check('aaa\nbb\ncccc', 5, 6, -1, 'bb\naaa\ncccc', 1, 2);
check('aaa\nbb\ncccc', 5, 6, 1, 'aaa\ncccc\nbb', 10, 11);
check('a\nb\nc\nd', 2, 5, 1, 'a\nd\nb\nc', 4, 7);
check('a\nb\nc', 2, 4, -1, 'b\na\nc', 0, 2);
check('a\nb\nc', 0, 2, 1, 'b\na\nc', 2, 4);
check('a\nb', 2, 2, -1, 'b\na', 0, 0);
check('\na', 0, 0, 1, 'a\n', 2, 2);
check('a\n', 2, 2, -1, '\na', 0, 0);
check('a\nb', 0, 1, -1, 'a\nb', 0, 1);
check('a\nb', 2, 3, 1, 'a\nb', 2, 3);
check('', 0, 0, -1, '', 0, 0);
check('aaa\nbb\ncccc', 5, 6, -1, 'aaa\nbb\nbb\ncccc', 5, 6, true);
check('aaa\nbb\ncccc', 5, 6, 1, 'aaa\nbb\nbb\ncccc', 8, 9, true);
check('a\nb\nc', 0, 4, -1, 'a\nb\na\nb\nc', 0, 4, true);
check('a\nb\nc', 0, 4, 1, 'a\nb\na\nb\nc', 4, 8, true);
check('a\nb', 2, 3, 1, 'a\nb\nb', 4, 5, true);
check('a\nb', 0, 0, -1, 'a\na\nb', 0, 0, true);
check('a\n', 2, 2, 1, 'a\n\n', 3, 3, true);
check('', 0, 0, -1, '\n', 0, 0, true);
assert.equal(commits, syncs);
assert.equal(commits, remembered);
console.log('Source line movement checks passed');
