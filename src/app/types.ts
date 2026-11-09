/** Persisted records and transient editor state. Mode is retained per editor. */
export interface ProfileRecord {
  id: string;
  name: string;
  content: string;
  mixed?: boolean;
}
export interface AppData {
  customTemplates: ProfileRecord[];
  drafts: ProfileRecord[];
  active: string;
  theme: string;
  customPreviewCss: string;
  customPreviewCssName: string;
  editorTheme: string;
  previewFontSize: string;
  splitRatio: number;
  previewNoteDismissed: boolean;
  preferLiterals: boolean;
  mixed: boolean;
}
export interface EditorSnapshot {
  content: string;
  mixed: boolean;
  preferLiterals: boolean;
  start: number;
  end: number;
  scroll: number;
}
export interface EditorContext {
  mixed: boolean;
  start: number;
  end: number;
  scroll: number;
}
export interface TemplateSession extends EditorContext {
  key: string;
  id: string | null;
  name: string;
  content: string;
  historyId: string;
  snapshot: string;
  returnContext?: { id: string; mixed: boolean };
}
export interface EditHistory {
  states: EditorSnapshot[];
  index: number;
  lastKind: string | null;
  lastAt: number;
  lastInputType: string | null;
}
export interface ApplicationState {
  data: AppData;
  diagnosticHover: { hide(): void } | undefined;
  saveTimer: ReturnType<typeof setTimeout> | null;
  toastTimer: ReturnType<typeof setTimeout> | null;
  templateSession: TemplateSession | null;
  editorLoaded: boolean;
}
export interface Diagnostic {
  message: string;
  severity: string;
  start: number;
  end: number;
  line: number;
  tag?: string;
  priority?: number;
}
