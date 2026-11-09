import { storeNewCharacter } from '../app/notifications';
import { $, source } from '../app/dom';
import { state, characterEditors, makeId, editHistories } from '../app/state';
import { toast, persist, clearConfirmation } from '../app/notifications';
import {
  renderTemplateTargets,
  setTemplateEditorUI,
  renderCustomTemplates,
} from '../templates/templates';
import { rememberSelection, refreshUndoButtons } from '../editor/history';
import { active } from '../app/active';
import { refresh } from '../preview/preview';

export function characterNameKey(name: string) {
  return name.trim().toLowerCase();
}

export function characterNameTaken(name: string, excludeId?: string) {
  return state.data.drafts.some(
    (record) => record.id !== excludeId && characterNameKey(record.name) === characterNameKey(name),
  );
}

export function uniqueCharacterName(name: string, excludeId?: string) {
  const base = name.trim().slice(0, 100) || 'Untitled character';
  if (!characterNameTaken(base, excludeId)) return base;
  for (let count = 2; ; count++) {
    const suffix = ' (' + count + ')',
      candidate = base.slice(0, 100 - suffix.length) + suffix;
    if (!characterNameTaken(candidate, excludeId)) return candidate;
  }
}

export function cloneName(name: string, records: { name: string }[]) {
  const names = new Set(records.map((record) => record.name));
  for (let count = 1; ; count++) {
    const suffix = count === 1 ? ' copy' : ' copy ' + count;
    const candidate = (name || 'Untitled').slice(0, 100 - suffix.length) + suffix;
    if (!names.has(candidate)) return candidate;
  }
}

export function cloneCharacter(id: string) {
  stashEditor();
  const original = state.data.drafts.find((record) => record.id === id);
  if (!original) return;
  const mixed =
    characterEditors.get(id)?.mixed ??
    (typeof original.mixed === 'boolean'
      ? original.mixed
      : state.templateSession
        ? state.templateSession.returnContext.mixed
        : state.data.mixed);
  const copy = {
    id: makeId(),
    name: uniqueCharacterName(cloneName(original.name, state.data.drafts)),
    content: original.content,
    mixed,
  };
  if (!storeNewCharacter(copy)) return;
  loadDraft(copy.id);
  $('profileName').focus();
  $('profileName').select();
  toast('Character cloned');
}

export let draggedDraftId: string | null = null;

export function reorderDraft(id: string, targetId: string, after: boolean) {
  if (id === targetId) return;
  const from = state.data.drafts.findIndex((d) => d.id === id);
  if (from < 0 || !state.data.drafts.some((d) => d.id === targetId)) return;
  const [draft] = state.data.drafts.splice(from, 1);
  const to = state.data.drafts.findIndex((d) => d.id === targetId) + (after ? 1 : 0);
  state.data.drafts.splice(to, 0, draft);
  persist();
  renderDrafts();
}

export function clearDraftDrag() {
  draggedDraftId = null;
  for (const row of $('draftList').children)
    row.classList.remove('dragging', 'drop-before', 'drop-after');
}

export function renderDrafts() {
  const list = $('draftList');
  list.replaceChildren();
  for (const d of state.data.drafts) {
    const btn = document.createElement('button');
    btn.className =
      'draft' + (!state.templateSession && d.id === state.data.active ? ' active' : '');
    btn.title = d.name;
    const label = document.createElement('span');
    label.textContent = d.name;
    btn.append(label);
    btn.addEventListener('click', () => loadDraft(d.id));
    btn.draggable = true;
    btn.title = d.name + ' — Drag to reorder; Alt+Up/Down to move';
    btn.addEventListener('dragstart', (event) => {
      if (!event.dataTransfer) return;
      draggedDraftId = d.id;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', d.id);
      btn.classList.add('dragging');
    });
    btn.addEventListener('dragover', (event) => {
      if (!draggedDraftId || draggedDraftId === d.id || !event.dataTransfer) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      for (const row of list.children) row.classList.remove('drop-before', 'drop-after');
      const rect = btn.getBoundingClientRect();
      btn.classList.add(event.clientY < rect.top + rect.height / 2 ? 'drop-before' : 'drop-after');
    });
    btn.addEventListener('dragleave', () => btn.classList.remove('drop-before', 'drop-after'));
    btn.addEventListener('drop', (event) => {
      if (!draggedDraftId) return;
      event.preventDefault();
      const id = draggedDraftId,
        rect = btn.getBoundingClientRect();
      clearDraftDrag();
      reorderDraft(id, d.id, event.clientY >= rect.top + rect.height / 2);
    });
    btn.addEventListener('dragend', clearDraftDrag);
    btn.addEventListener('keydown', (event) => {
      if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const index = state.data.drafts.findIndex((record) => record.id === d.id),
        after = event.key === 'ArrowDown';
      const target = state.data.drafts[index + (after ? 1 : -1)];
      if (!target) return;
      reorderDraft(d.id, target.id, after);
      ($('draftList').children[index + (after ? 1 : -1)] as HTMLElement).focus();
    });
    list.append(btn);
  }
  renderTemplateTargets();
}

export function stashEditor() {
  if (!state.editorLoaded) return;
  rememberSelection();
  const context = {
    mixed: state.data.mixed,
    start: source.selectionStart,
    end: source.selectionEnd,
    scroll: source.scrollTop,
  };
  active().content = source.value;
  if (state.templateSession)
    Object.assign(state.templateSession, context, { name: $('profileName').value });
  else characterEditors.set(state.data.active, context);
}

export function loadDraft(id: string) {
  const fallbackMode = state.templateSession
    ? state.templateSession.returnContext.mixed
    : state.data.mixed;
  stashEditor();
  clearConfirmation();
  state.templateSession = null;
  state.data.active = id;
  setTemplateEditorUI(false);
  const d = active(),
    context = characterEditors.get(id);
  state.data.mixed = context
    ? context.mixed
    : typeof d.mixed === 'boolean'
      ? d.mixed
      : fallbackMode;
  source.value = d.content;
  $('profileName').value = d.name;
  state.editorLoaded = true;
  renderDrafts();
  renderCustomTemplates();
  updateMode();
  const h = editHistories.get(id);
  if (
    h &&
    (h.states[h.index].content !== source.value || h.states[h.index].mixed !== state.data.mixed)
  )
    editHistories.delete(id);
  refreshUndoButtons();
  source.setSelectionRange(context ? context.start : 0, context ? context.end : 0);
  source.scrollTop = context ? context.scroll : 0;
}

export function updateMode() {
  $('preferLiterals').checked = state.data.preferLiterals !== false;
  $('preferLiterals').disabled = !state.data.mixed;
  if (state.templateSession) state.templateSession.mixed = state.data.mixed;
  else if (state.editorLoaded) active().mixed = state.data.mixed;
  $('mixedMode').classList.toggle('active', state.data.mixed);
  $('bbMode').classList.toggle('active', !state.data.mixed);
  $('mixedMode').setAttribute('aria-pressed', String(state.data.mixed));
  $('bbMode').setAttribute('aria-pressed', String(!state.data.mixed));
  $('modeHint').textContent = state.data.mixed
    ? 'Markdown and custom macros. Switch to BBCode to compile; switch back to decompile.'
    : 'Plain F-List BBCode. Switch to Markdown+ to decompile into editable Markdown and macros.';
  refresh();
  persist();
}
