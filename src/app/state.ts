import { isRecord } from './validation';
import { $ } from './dom';
import { parsePreviewFontSize } from '../preview/preferences';

import type {
  ApplicationState,
  TemplateSession,
  EditorContext,
  EditHistory,
  ProfileRecord,
} from './types';

export const state: ApplicationState = {
  // main.ts initializes persisted data before binding controls or rendering.
  data: undefined!,
  diagnosticHover: undefined,
  saveTimer: null,
  toastTimer: null,
  templateSession: null,
  editorLoaded: false,
};

export const STORAGE = 'folio-f-list-studio-v1';

export const makeId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const templates = globalThis.FolioTemplates;

export const intro = globalThis.FolioShowcase;

export function validateCustomTemplates(records: unknown): ProfileRecord[] {
  if (!Array.isArray(records)) return [];
  const seen = new Set();
  return records
    .filter((record: unknown): record is ProfileRecord => {
      if (
        !isRecord(record) ||
        typeof record.id !== 'string' ||
        !record.id ||
        seen.has(record.id) ||
        typeof record.name !== 'string' ||
        !record.name.trim() ||
        typeof record.content !== 'string' ||
        record.content.length > 1500000
      )
        return false;
      seen.add(record.id);
      return true;
    })
    .slice(0, 100)
    .map((record) => ({
      id: record.id,
      name: record.name.trim().slice(0, 100),
      content: record.content,
    }));
}

export const templateEditors = new Map<string, TemplateSession>(),
  characterEditors = new Map<string, EditorContext>();

// Undo is managed explicitly because setRangeText() and textarea.value edits do not
// consistently enter the browser's native undo stack across browsers.
export const editHistories = new Map<string, EditHistory>();

export const MAX_UNDO_STATES = 180;

export function initializeAppState() {
  state.diagnosticHover = undefined;
  state.data = {
    customTemplates: [],
    drafts: [{ id: makeId(), name: 'New Character', content: intro }],
    active: '',
    theme: 'flist-blue',
    customPreviewCss: '',
    customPreviewCssName: '',
    editorTheme: 'folio',
    previewFontSize: 'site',
    splitRatio: 0.524,
    previewNoteDismissed: false,
    preferLiterals: true,
    mixed: true,
  };

  state.data.active = state.data.drafts[0].id;

  try {
    const loaded = JSON.parse(localStorage.getItem(STORAGE) ?? 'null') as unknown;
    if (isRecord(loaded) && Array.isArray(loaded.drafts) && loaded.drafts.length) {
      const valid = loaded.drafts
        .filter((d: unknown): d is ProfileRecord => {
          if (d == null) throw Error('Invalid saved draft');
          return (
            isRecord(d) &&
            typeof d.id === 'string' &&
            typeof d.name === 'string' &&
            typeof d.content === 'string'
          );
        })
        .slice(0, 80);
      if (valid.length) {
        state.data = {
          customPreviewCss:
            typeof loaded.customPreviewCss === 'string' && loaded.customPreviewCss.length <= 200000
              ? loaded.customPreviewCss
              : '',
          customPreviewCssName:
            typeof loaded.customPreviewCssName === 'string'
              ? loaded.customPreviewCssName.slice(0, 100)
              : '',
          customTemplates: validateCustomTemplates(loaded.customTemplates),
          drafts: valid,
          active: valid.some((d) => d.id === loaded.active) ? String(loaded.active) : valid[0].id,
          editorTheme: ['folio', 'graphite', 'forest', 'paper'].includes(String(loaded.editorTheme))
            ? String(loaded.editorTheme)
            : 'folio',
          theme: Array.from($('theme').options).some((option) => option.value === loaded.theme)
            ? String(loaded.theme)
            : 'flist-blue',
          previewFontSize: parsePreviewFontSize(loaded.previewFontSize) || 'site',
          splitRatio:
            typeof loaded.splitRatio === 'number' && Number.isFinite(loaded.splitRatio)
              ? Math.max(0.25, Math.min(0.75, loaded.splitRatio))
              : 0.524,
          previewNoteDismissed: loaded.previewNoteDismissed === true,
          preferLiterals: loaded.preferLiterals !== false,
          mixed: loaded.mixed !== false,
        };
      }
    }
  } catch (e) {}
  state.saveTimer = null;
  state.toastTimer = null;
  state.templateSession = null;
  state.editorLoaded = false;
}
