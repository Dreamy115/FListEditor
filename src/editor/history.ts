import type { EditorSnapshot } from '../app/types';
import { source, $ } from '../app/dom';
import { state, editHistories, MAX_UNDO_STATES } from '../app/state';
import { active } from '../app/active';
import { updateTemplateStatus } from '../templates/templates';
import { updateMode } from '../characters/characters';
import { updateActiveSyntax, syncHighlightScroll } from './view';
import { scheduleSave } from '../app/notifications';

export function editorSnapshot() {
  return {
    content: source.value,
    mixed: state.data.mixed,
    preferLiterals: state.data.preferLiterals !== false,
    start: source.selectionStart,
    end: source.selectionEnd,
    scroll: source.scrollTop,
  };
}

export function currentHistory() {
  let h = editHistories.get(
    state.templateSession ? state.templateSession.historyId : state.data.active,
  );
  if (!h) {
    h = { states: [editorSnapshot()], index: 0, lastKind: null, lastAt: 0, lastInputType: null };
    editHistories.set(
      state.templateSession ? state.templateSession.historyId : state.data.active,
      h,
    );
  }
  return h;
}

export function refreshUndoButtons() {
  const h = currentHistory();
  $('undoEdit').disabled = h.index === 0;
  $('redoEdit').disabled = h.index >= h.states.length - 1;
}

// Before replacing a selection, remember the *actual* caret that the user set.
export function rememberSelection() {
  const h = currentHistory(),
    prev = h.states[h.index];
  if (
    prev.content === source.value &&
    prev.mixed === state.data.mixed &&
    (prev.preferLiterals !== false) === (state.data.preferLiterals !== false)
  )
    h.states[h.index] = editorSnapshot();
}

export function commitEdit(kind = 'action', inputType = '') {
  const h = currentHistory(),
    next = editorSnapshot(),
    old = h.states[h.index];
  if (
    next.content === old.content &&
    next.mixed === old.mixed &&
    next.preferLiterals === (old.preferLiterals !== false)
  ) {
    h.states[h.index] = next;
    refreshUndoButtons();
    return;
  }
  if (h.index < h.states.length - 1) h.states.splice(h.index + 1);
  const now = Date.now();
  const canGroup =
    kind === 'typing' &&
    h.lastKind === 'typing' &&
    h.lastInputType === inputType &&
    [
      'insertText',
      'deleteContentBackward',
      'deleteContentForward',
      'insertCompositionText',
    ].includes(inputType) &&
    now - h.lastAt < 650;
  if (canGroup) h.states[h.index] = next;
  else {
    h.states.push(next);
    h.index++;
  }
  if (h.states.length > MAX_UNDO_STATES) {
    h.states.shift();
    h.index--;
  }
  h.lastKind = kind;
  h.lastInputType = inputType;
  h.lastAt = now;
  refreshUndoButtons();
}

export function restoreEdit(snapshot: EditorSnapshot) {
  const scrollTop = source.scrollTop,
    scrollLeft = source.scrollLeft;
  const selectionStart = source.selectionStart,
    selectionEnd = source.selectionEnd,
    direction = source.selectionDirection;
  state.data.mixed = snapshot.mixed;
  state.data.preferLiterals = snapshot.preferLiterals !== false;
  source.value = snapshot.content;
  active().content = snapshot.content;
  if (state.templateSession) updateTemplateStatus();
  updateMode();
  source.focus({ preventScroll: true });
  source.setSelectionRange(
    Math.min(selectionStart, source.value.length),
    Math.min(selectionEnd, source.value.length),
    direction,
  );
  updateActiveSyntax();
  const start = source.selectionStart,
    end = source.selectionEnd;
  const restoreScroll = () => {
    source.scrollTop = scrollTop;
    source.scrollLeft = scrollLeft;
    syncHighlightScroll();
  };
  restoreScroll();
  // Browsers may reveal the restored selection after assigning textarea.value.
  // Keep the current viewport even when that caret is far outside it.
  requestAnimationFrame(() => {
    if (
      source.value === snapshot.content &&
      source.selectionStart === start &&
      source.selectionEnd === end
    )
      restoreScroll();
  });
  scheduleSave();
  refreshUndoButtons();
}

export function undoEdit() {
  const h = currentHistory();
  if (!h.index) return;
  h.index--;
  h.lastKind = null;
  restoreEdit(h.states[h.index]);
}

export function redoEdit() {
  const h = currentHistory();
  if (h.index >= h.states.length - 1) return;
  h.index++;
  h.lastKind = null;
  restoreEdit(h.states[h.index]);
}

export function bindHistoryControls() {
  $('undoEdit').addEventListener('click', undoEdit);

  $('redoEdit').addEventListener('click', redoEdit);
}
