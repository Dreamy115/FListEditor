import { source } from '../app/dom';

import { rememberSelection, commitEdit, redoEdit, undoEdit } from './history';
import { syncFromEditor } from './sync';
import { copyCode } from './guide';
import { openQuickColor } from './toolbar';
import { wrapInline, replaceRange } from './editing';

export function moveSourceLines(direction: number, copy = false) {
  const text = source.value,
    start = source.selectionStart,
    end = source.selectionEnd;
  const directionOfSelection = source.selectionDirection;
  const first = text.slice(0, start).lastIndexOf('\n') + 1;
  // A selection ending at the next line's start does not include that line.
  const lastPosition = end > start && text[end - 1] === '\n' ? end - 1 : end;
  const newline = text.indexOf('\n', lastPosition);
  const last = newline < 0 ? text.length : newline;
  let from, to, replacement, offset;
  if (copy) {
    const block = text.slice(first, last);
    from = to = direction < 0 ? first : last;
    replacement = direction < 0 ? block + '\n' : '\n' + block;
    offset = direction < 0 ? 0 : block.length + 1;
  } else if (direction < 0) {
    if (first === 0) return;
    from = text.slice(0, first - 1).lastIndexOf('\n') + 1;
    to = last;
    replacement = text.slice(first, last) + '\n' + text.slice(from, first - 1);
    offset = from - first;
  } else {
    if (last === text.length) return;
    from = first;
    const next = text.indexOf('\n', last + 1);
    to = next < 0 ? text.length : next;
    replacement = text.slice(last + 1, to) + '\n' + text.slice(first, last);
    offset = to - last;
  }
  rememberSelection();
  source.setRangeText(replacement, from, to, 'end');
  source.setSelectionRange(
    start + offset,
    Math.min(end + offset, source.value.length),
    directionOfSelection,
  );
  syncFromEditor();
  commitEdit('action');
}

export function bindKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      copyCode();
      return;
    }
    if (document.activeElement !== source) return;
    if (
      e.ctrlKey &&
      !e.shiftKey &&
      !e.altKey &&
      !e.metaKey &&
      !e.isComposing &&
      e.key.toLowerCase() === 'd'
    ) {
      e.preventDefault();
      openQuickColor();
      return;
    }
    if (
      e.altKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.isComposing &&
      ['ArrowUp', 'ArrowDown'].includes(e.key)
    ) {
      e.preventDefault();
      moveSourceLines(e.key === 'ArrowUp' ? -1 : 1, e.shiftKey);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const key = e.key.toLowerCase();
      if (key === 'z') {
        e.preventDefault();
        (e.shiftKey ? redoEdit : undoEdit)();
        return;
      }
      if (key === 'y') {
        e.preventDefault();
        redoEdit();
        return;
      }
      if (['b', 'i', 'u'].includes(key)) {
        e.preventDefault();
        wrapInline(key);
        return;
      }
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      replaceRange('  ');
    }
  });

  source.addEventListener('dragover', (e) => {
    if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
  });
}
