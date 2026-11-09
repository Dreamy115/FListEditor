import { $, source } from '../app/dom';
import {
  state,
  templateEditors,
  templates,
  makeId,
  characterEditors,
  editHistories,
} from '../app/state';
import { toast, clearConfirmation, persist, requestConfirmation } from '../app/notifications';
import {
  stashEditor,
  renderDrafts,
  updateMode,
  loadDraft,
  cloneName,
  cloneCharacter,
  uniqueCharacterName,
} from '../characters/characters';

import { bbcodeToMarkdown } from '../formatting/bbcode';
import { refreshUndoButtons } from '../editor/history';
import { requestApplyTemplate } from './application';

export let templateChoiceValue = '';

export function templateFormSnapshot() {
  return JSON.stringify([$('profileName').value, source.value, state.data.mixed]);
}

export function templateDirty() {
  return !!state.templateSession && templateFormSnapshot() !== state.templateSession.snapshot;
}

export function updateTemplateStatus() {
  $('templateStatus').textContent = templateDirty()
    ? 'Unsaved template changes. Save when ready.'
    : 'Template saved. Edits use the full profile editor below.';
}

export function renderTemplateTargets() {
  for (const [selectId, buttonId] of [
    ['templateTarget', 'applyTemplate'],
    ['templateSource', 'templateFromDraft'],
  ] as const) {
    const select = $(selectId),
      previous = select.value;
    select.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choose a character';
    select.append(placeholder);
    for (const character of state.data.drafts) {
      const option = document.createElement('option');
      option.value = character.id;
      option.textContent = character.name;
      select.append(option);
    }
    select.value = state.data.drafts.some((character) => character.id === previous) ? previous : '';
    $(buttonId).disabled = !select.value;
  }
}

export function renderCustomTemplates() {
  const list = $('customTemplateList');
  list.replaceChildren();
  if (!state.data.customTemplates.length) {
    const empty = document.createElement('small');
    empty.className = 'inline-tip';
    empty.textContent = 'No custom templates yet.';
    list.append(empty);
  }
  for (const record of state.data.customTemplates) {
    const row = document.createElement('div');
    row.className = 'custom-template-row';
    const open = document.createElement('button');
    open.className =
      'custom-template-open' + (state.templateSession?.id === record.id ? ' active' : '');
    open.textContent = record.name;
    open.title = 'Edit ' + record.name;
    open.addEventListener('click', () => openTemplateManager(record.id));
    row.append(open);
    list.append(row);
  }
  const choice = $('templateChoice');
  choice.replaceChildren();
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = 'New template';
  choice.append(blank);
  const unsaved = [...templateEditors.values()]
    .filter((editor) => !editor.id && !editor.key.startsWith('builtin:'))
    .map((editor) => ({ value: editor.key, name: editor.name || 'Untitled template' }));
  for (const [label, records] of [
    ['Template drafts', unsaved],
    [
      'My templates',
      state.data.customTemplates.map((t) => ({ value: 'custom:' + t.id, name: t.name })),
    ],
    [
      'Built-in templates',
      Object.keys(templates).map((id: string) => ({
        value: 'builtin:' + id,
        name: document
          .querySelector<HTMLElement>('[data-template="' + id + '"]')!
          .querySelector('strong')!.textContent,
      })),
    ],
  ] as [string, { value: string; name: string }[]][]) {
    const group = document.createElement('optgroup');
    group.label = label;
    for (const record of records) {
      const option = document.createElement('option');
      option.value = record.value;
      option.textContent = record.name;
      group.append(option);
    }
    choice.append(group);
  }
  choice.value = templateChoiceValue;
  for (const button of document.querySelectorAll<HTMLElement>('[data-template]'))
    button.classList.toggle(
      'active',
      state.templateSession?.key === 'builtin:' + button.dataset.template,
    );
}

export function setTemplateEditorUI(editing: boolean) {
  $('templateEditorControls').hidden = !editing;
  $('backToProfile').hidden = !editing;
  $('deleteDraft').hidden = editing;
  $('editorContext').textContent = editing
    ? 'Editing reusable template'
    : 'Editing character profile';
  $('profileName').setAttribute('aria-label', editing ? 'Template name' : 'Character name');
  $('cloneEditor').title = editing ? 'Clone current template' : 'Clone current character';
  $('cloneEditor').setAttribute('aria-label', editing ? 'Clone template' : 'Clone character');
  $('profileName').placeholder = editing ? 'Template name' : '';
}

export function loadTemplateForm(value: string, sourceCharacterId: string | null = null) {
  const profile = sourceCharacterId
    ? state.data.drafts.find((d) => d.id === sourceCharacterId)
    : null;
  if (sourceCharacterId && !profile) {
    renderTemplateTargets();
    toast('That character no longer exists');
    return;
  }
  const returnContext = state.templateSession
    ? state.templateSession.returnContext
    : { id: state.data.active, mixed: state.data.mixed };
  stashEditor();
  clearConfirmation();
  clearTimeout(state.saveTimer ?? undefined);
  const key = value || 'new:' + makeId();
  let session = templateEditors.get(key);
  if (!session) {
    let id = null,
      name = '',
      content = '';
    if (value.startsWith('custom:')) {
      const record = state.data.customTemplates.find((t) => t.id === value.slice(7));
      if (record) {
        id = record.id;
        name = record.name;
        content = record.content;
      }
    } else if (value.startsWith('builtin:')) {
      const builtin = value.slice(8);
      content = templates[builtin] || '';
      name =
        document
          .querySelector<HTMLElement>('[data-template="' + builtin + '"]')!
          .querySelector('strong')!.textContent + ' copy';
    }
    if (profile) {
      const mode =
        characterEditors.get(profile.id)?.mixed ??
        (typeof profile.mixed === 'boolean' ? profile.mixed : returnContext.mixed);
      name = (profile.name + ' template').slice(0, 100);
      content = mode ? profile.content : bbcodeToMarkdown(profile.content, true);
    }
    session = {
      key,
      id,
      name,
      content,
      historyId: 'template:' + makeId(),
      mixed: true,
      start: 0,
      end: 0,
      scroll: 0,
      snapshot:
        id || value.startsWith('builtin:')
          ? JSON.stringify([name, content, true])
          : JSON.stringify(['', '', true]),
    };
    templateEditors.set(key, session);
  }
  session.returnContext = returnContext;
  // Loading a cached draft establishes the required return target before activation.
  state.templateSession = session as import('../app/types').ActiveTemplateSession;
  templateChoiceValue = key;
  state.data.mixed = session.mixed;
  source.value = session.content;
  $('profileName').value = session.name;
  state.editorLoaded = true;
  setTemplateEditorUI(true);
  renderDrafts();
  renderCustomTemplates();
  $('deleteTemplate').disabled = false;
  updateTemplateStatus();
  updateMode();
  refreshUndoButtons();
  source.focus();
  source.setSelectionRange(session.start, session.end);
  source.scrollTop = session.scroll;
}

export function openTemplateManager(id?: string) {
  if (state.templateSession && !id) {
    source.focus();
    return;
  }
  loadTemplateForm(id ? 'custom:' + id : templateChoiceValue);
}

export function exitTemplateEditor() {
  if (state.templateSession) loadDraft(state.data.active);
}

export function cloneTemplate(key: string) {
  stashEditor();
  if (state.data.customTemplates.length >= 100) {
    toast('Maximum 100 templates. Delete one before cloning.');
    return;
  }
  const editor = templateEditors.get(key);
  let name,
    content,
    mixed = true;
  if (editor) {
    ({ name, content, mixed } = editor);
  } else if (key.startsWith('custom:')) {
    const record = state.data.customTemplates.find((record) => record.id === key.slice(7));
    if (!record) return;
    ({ name, content } = record);
  } else if (key.startsWith('builtin:')) {
    const id = key.slice(8);
    content = templates[id];
    if (content === undefined) return;
    name = document
      .querySelector<HTMLElement>('[data-template="' + id + '"]')!
      .querySelector('strong')!.textContent;
  } else return;
  name = cloneName(name, state.data.customTemplates);
  const record = { id: makeId(), name, content: mixed ? content : bbcodeToMarkdown(content, true) };
  state.data.customTemplates.push(record);
  const cloneKey = 'custom:' + record.id;
  templateEditors.set(cloneKey, {
    key: cloneKey,
    id: record.id,
    name,
    content,
    mixed,
    start: 0,
    end: 0,
    scroll: 0,
    historyId: 'template:' + makeId(),
    snapshot: JSON.stringify([name, content, mixed]),
  });
  loadTemplateForm(cloneKey);
  $('profileName').focus();
  $('profileName').select();
  toast('Template cloned');
}

export function saveCustomTemplate() {
  if (!state.templateSession) return null;
  const name = $('profileName').value.trim().slice(0, 100),
    content = state.data.mixed ? source.value : bbcodeToMarkdown(source.value, true);
  if (!name) {
    $('templateStatus').textContent = 'Enter a template name above.';
    $('profileName').focus();
    return null;
  }
  if (content.length > 1500000) {
    $('templateStatus').textContent = 'Template is too large (max 1.5 MB).';
    return null;
  }
  if (!state.templateSession.id && state.data.customTemplates.length >= 100) {
    $('templateStatus').textContent = 'Maximum 100 custom templates. Delete one first.';
    return null;
  }
  let record = state.data.customTemplates.find((t) => t.id === state.templateSession!.id);
  if (record) {
    record.name = name;
    record.content = content;
  } else {
    record = { id: makeId(), name, content };
    state.data.customTemplates.push(record);
  }
  templateEditors.delete(state.templateSession.key);
  state.templateSession.id = record.id;
  state.templateSession.name = name;
  state.templateSession.key = 'custom:' + record.id;
  templateChoiceValue = state.templateSession.key;
  templateEditors.set(state.templateSession.key, state.templateSession);
  renderCustomTemplates();
  $('profileName').value = name;
  state.templateSession.snapshot = templateFormSnapshot();
  $('deleteTemplate').disabled = false;
  $('templateStatus').textContent = persist()
    ? 'Template saved.'
    : 'Saved for this session only; browser storage is unavailable.';
  return record;
}

export function initializeTemplateEditors() {
  $('cloneEditor').addEventListener('click', () => {
    if (state.templateSession) cloneTemplate(state.templateSession.key);
    else cloneCharacter(state.data.active);
  });

  $('manageTemplates').addEventListener('click', () => openTemplateManager());

  $('backToProfile').addEventListener('click', exitTemplateEditor);

  $('templateChoice').addEventListener('change', (e) =>
    loadTemplateForm((e.target as HTMLInputElement).value),
  );

  $('newTemplate').addEventListener('click', () => loadTemplateForm(''));

  $('templateFromDraft').addEventListener('click', () => {
    const id = $('templateSource').value;
    if (id) loadTemplateForm('', id);
  });

  $('templateSource').addEventListener('change', () => {
    $('templateFromDraft').disabled = !$('templateSource').value;
  });

  $('saveTemplate').addEventListener('click', () => {
    clearConfirmation();
    saveCustomTemplate();
  });

  $('applyTemplate').addEventListener('click', () => {
    if (!state.templateSession) return;
    const content = state.data.mixed ? source.value : bbcodeToMarkdown(source.value, true);
    requestApplyTemplate(
      content,
      $('profileName').value.trim() || 'Untitled template',
      $('templateTarget').value,
    );
  });

  $('templateTarget').addEventListener('change', () => {
    clearConfirmation();
    $('applyTemplate').disabled = !$('templateTarget').value;
  });

  $('newFromTemplate').addEventListener('click', () => {
    if (!state.templateSession) return;
    if (state.data.drafts.length >= 80) {
      toast('Maximum 80 characters. Delete one before creating another.');
      return;
    }
    const name = ('New from ' + ($('profileName').value.trim() || 'template')).slice(0, 100);
    const character = {
      id: makeId(),
      name: uniqueCharacterName(name),
      content: source.value,
      mixed: state.data.mixed,
    };
    state.data.drafts.unshift(character);
    loadDraft(character.id);
    $('profileName').focus();
    $('profileName').select();
    toast('New character created from template');
  });

  $('deleteTemplate').addEventListener('click', () => {
    const session = state.templateSession;
    if (!session) return;
    requestConfirmation(
      'Delete this template' + (templateDirty() ? ' and its unsaved changes' : '') + '?',
      () => {
        state.data.customTemplates = state.data.customTemplates.filter((t) => t.id !== session.id);
        exitTemplateEditor();
        templateEditors.delete(session.key);
        editHistories.delete(session.historyId);
        templateChoiceValue = '';
        renderCustomTemplates();
        persist();
      },
    );
  });

  window.addEventListener('beforeunload', (e) => {
    stashEditor();
    if (
      [...templateEditors.values()].some(
        (session) =>
          JSON.stringify([session.name, session.content, session.mixed]) !== session.snapshot,
      )
    ) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  renderCustomTemplates();
  setTemplateEditorUI(false);
}
