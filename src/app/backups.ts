import { $, source } from './dom';
import { state, templateEditors, characterEditors, editHistories, STORAGE, makeId } from './state';
import { parsePreviewFontSize } from '../preview/preferences';
import { setEditorTheme, setTheme } from '../preview/appearance';
import { applyPaneSplit } from './layout';
import {
  loadDraft,
  stashEditor,
  uniqueCharacterName,
  updateMode,
  renderDrafts,
} from '../characters/characters';
import { download } from './exports';
import { toast, requestConfirmation } from './notifications';
import { rememberSelection, commitEdit } from '../editor/history';
import { active } from './active';
import { syncFromEditor } from '../editor/sync';

// Full-app backups contain the complete persisted state, separate from profile backups.
export function validateAppBackup(record) {
  if (!record || record.format !== 'folio-app' || record.version !== 1)
    throw Error('Unsupported app backup');
  const value = record.data;
  if (
    value &&
    ((value.customPreviewCss !== undefined &&
      (typeof value.customPreviewCss !== 'string' || value.customPreviewCss.length > 200000)) ||
      (value.customPreviewCssName !== undefined &&
        (typeof value.customPreviewCssName !== 'string' ||
          value.customPreviewCssName.length > 100)))
  )
    throw Error('Invalid custom preview CSS');
  if (value && 'preferLiterals' in value && typeof value.preferLiterals !== 'boolean')
    throw Error('Invalid character preference');
  if (
    !value ||
    !Array.isArray(value.drafts) ||
    !value.drafts.length ||
    value.drafts.length > 80 ||
    !Array.isArray(value.customTemplates) ||
    value.customTemplates.length > 100
  )
    throw Error('Invalid app data');
  for (const records of [value.drafts, value.customTemplates]) {
    const ids = new Set();
    for (const item of records) {
      if (
        !item ||
        typeof item.id !== 'string' ||
        !item.id ||
        ids.has(item.id) ||
        typeof item.name !== 'string' ||
        typeof item.content !== 'string' ||
        item.content.length > 1500000 ||
        ('mixed' in item && typeof item.mixed !== 'boolean')
      )
        throw Error('Invalid character or template');
      ids.add(item.id);
    }
  }
  if (
    !value.drafts.some((draft) => draft.id === value.active) ||
    typeof value.mixed !== 'boolean' ||
    typeof value.previewNoteDismissed !== 'boolean' ||
    !['folio', 'graphite', 'forest', 'paper'].includes(value.editorTheme) ||
    !Array.from($('theme').options).some((option) => option.value === value.theme) ||
    !parsePreviewFontSize(value.previewFontSize) ||
    typeof value.splitRatio !== 'number' ||
    !Number.isFinite(value.splitRatio) ||
    value.splitRatio < 0.25 ||
    value.splitRatio > 0.75
  )
    throw Error('Invalid app settings');
  return value;
}

export function replaceAppData(next) {
  clearTimeout(state.saveTimer);
  state.editorLoaded = false;
  state.templateSession = null;
  templateEditors.clear();
  characterEditors.clear();
  editHistories.clear();
  state.data = next;
  setEditorTheme();
  setTheme();
  applyPaneSplit();
  $('previewNote').hidden = state.data.previewNoteDismissed;
  loadDraft(state.data.active);
}

export function bindImportAndBackupControls() {
  $('exportAll').addEventListener('click', () => {
    stashEditor();
    const snapshot = JSON.parse(
      JSON.stringify(
        state.templateSession
          ? { ...state.data, mixed: state.templateSession.returnContext.mixed }
          : state.data,
      ),
    );
    for (const draft of snapshot.drafts) {
      const context = characterEditors.get(draft.id);
      if (context) draft.mixed = context.mixed;
    }
    download(
      JSON.stringify({ format: 'folio-app', version: 1, data: snapshot }, null, 2),
      'folio-all-data.json',
      'application/json',
    );
    toast('All characters, saved templates and settings exported');
  });

  $('importAll').addEventListener('click', () => $('appDataImport').click());

  $('appDataImport').addEventListener('change', async (event) => {
    const file = (event.target as HTMLInputElement).files[0];
    (event.target as HTMLInputElement).value = '';
    if (!file) return;
    let next;
    try {
      next = validateAppBackup(JSON.parse(await file.text()));
    } catch (error) {
      toast('Not a valid full-app Folio backup');
      return;
    }
    requestConfirmation(
      'Replace ALL characters, templates and settings with this backup? Unsaved template edits will be lost.',
      () => {
        // Write first so a storage failure leaves the current session intact.
        try {
          localStorage.setItem(STORAGE, JSON.stringify(next));
        } catch (error) {
          toast('Import failed: browser storage unavailable or full');
          return;
        }
        replaceAppData(next);
        toast('All app data imported');
      },
    );
  });

  $('purgeData').addEventListener('click', () =>
    requestConfirmation(
      'Permanently delete ALL locally saved characters, templates, settings and image attachments, including unsaved edits? Export all data first to keep a backup.',
      async () => {
        try {
          localStorage.removeItem(STORAGE);
        } catch (error) {
          toast('Could not delete local data');
          return;
        }
        const draft = { id: makeId(), name: 'New Character', content: '' };
        replaceAppData({
          customTemplates: [],
          drafts: [draft],
          active: draft.id,
          theme: 'flist-blue',
          customPreviewCss: '',
          customPreviewCssName: '',
          editorTheme: 'folio',
          previewFontSize: 'site',
          splitRatio: 0.524,
          previewNoteDismissed: false,
          preferLiterals: true,
          mixed: true,
        });
        clearTimeout(state.saveTimer);
        try {
          localStorage.removeItem(STORAGE);
          $('saveStatus').textContent = 'Local data purged';
        } catch (error) {
          toast('Could not delete local data');
          return;
        }
        try {
          await globalThis.FolioLocalImages?.clear();
        } catch (error) {
          toast('Profile data purged, but image attachments could not be removed.');
          return;
        }
        globalThis.location.reload();
      },
    ),
  );

  $('importBtn').addEventListener('click', () => $('fileImport').click());

  $('fileImport').addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files[0];
    (e.target as HTMLInputElement).value = '';
    if (!file) return;
    if (file.size > 1500000) {
      toast('File is too large (max 1.5 MB)');
      return;
    }
    let str;
    try {
      str = await file.text();
    } catch (error) {
      toast('Could not read the imported file');
      return;
    }
    let name = file.name.replace(/\.(folio\.json|bbcode|txt|md|json)$/i, ''),
      mixed;
    const filename = file.name.toLowerCase();
    if (filename.endsWith('.md')) mixed = true;
    else if (filename.endsWith('.bbcode')) mixed = false;
    else if (filename.endsWith('.json')) {
      try {
        const record = JSON.parse(str);
        if (!record || typeof record.content !== 'string') throw Error('No profile content');
        name = String(record.name || name);
        str = record.content;
        if (typeof record.mixed === 'boolean') mixed = record.mixed;
      } catch (error) {
        toast('Not a valid Folio backup');
        return;
      }
    }
    const apply = () => {
      rememberSelection();
      active().name = state.templateSession
        ? name.slice(0, 100)
        : uniqueCharacterName(name, state.data.active);
      $('profileName').value = active().name;
      source.value = str;
      active().content = str;
      if (typeof mixed === 'boolean') state.data.mixed = mixed;
      updateMode();
      syncFromEditor();
      renderDrafts();
      commitEdit('action');
      toast('Source imported');
    };
    if (source.value.trim())
      requestConfirmation('Replace this draft with the imported file?', apply);
    else apply();
  });
}
