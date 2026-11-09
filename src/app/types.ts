/** A saved character or reusable template; mode may be absent in legacy data. */
export interface ProfileRecord {
  id: string;
  name: string;
  content: string;
  mixed?: boolean;
}
/** Saved settings and records, including optional preferences in older backups. */
export interface AppData {
  customTemplates: ProfileRecord[];
  drafts: ProfileRecord[];
  active: string;
  theme: string;
  /** Older backups omit custom sheets; callers treat absence as no custom CSS. */
  customPreviewCss?: string;
  customPreviewCssName?: string;
  editorTheme: string;
  previewFontSize: string;
  splitRatio: number;
  previewNoteDismissed: boolean;
  /** Legacy backups without this preference use literal characters. */
  preferLiterals?: boolean;
  mixed: boolean;
}
/** One undo step, including selection and display preference. */
export interface EditorSnapshot {
  content: string;
  mixed: boolean;
  preferLiterals: boolean;
  start: number;
  end: number;
  scroll: number;
}
/** Selection and viewport retained independently when switching editors. */
export interface EditorContext {
  mixed: boolean;
  start: number;
  end: number;
  scroll: number;
}
/** A template draft may be cached before its return target is assigned. */
export interface TemplateSession extends EditorContext {
  key: string;
  id: string | null;
  name: string;
  content: string;
  historyId: string;
  snapshot: string;
  returnContext?: { id: string; mixed: boolean };
}
/** Bounded undo steps plus timestamps used to group consecutive typing. */
export interface EditHistory {
  states: EditorSnapshot[];
  index: number;
  lastKind: string | null;
  lastAt: number;
  lastInputType: string | null;
}
/** An open template always remembers the character editor to return to. */
export interface ActiveTemplateSession extends TemplateSession {
  returnContext: { id: string; mixed: boolean };
}
/** Session-only state, deliberately separate from browser persistence. */
export interface ApplicationState {
  data: AppData;
  diagnosticHover: { hide(): void } | undefined;
  saveTimer: ReturnType<typeof setTimeout> | null;
  toastTimer: ReturnType<typeof setTimeout> | null;
  templateSession: ActiveTemplateSession | null;
  editorLoaded: boolean;
}
/** A navigable source issue with offsets in the original editor text. */
export interface Diagnostic {
  message: string;
  /** Missing severity in legacy UI callers is displayed as a warning. */
  severity?: string;
  start: number;
  end: number;
  line: number;
  tag?: string;
  priority?: number;
}
