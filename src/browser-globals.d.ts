/** Contracts for the existing companion scripts loaded before the app bundle. */
type FolioDiagnostic = import('./app/types').Diagnostic;
interface FolioDiagnosticConfig {
  mixed: boolean;
  inlineNames: Set<string>;
  blockNames: Set<string>;
  colors: string[];
  resolveColor(value: string): string | null;
}
interface FolioFix {
  text: string;
  start: number;
  end: number;
}
declare var FolioHorizon: {
  render(input: string): HTMLElement;
  allowsChild(parent: string, child: string): boolean;
  validURL(value: string): boolean;
};
interface FolioToken {
  text: string;
  start: number;
  end: number;
  kind: string;
}
declare var FolioSyntax: {
  tokenize(text: string, mixed: boolean): FolioToken[];
  isEntityTextToken(token: FolioToken): boolean;
  highlight(
    layer: HTMLElement,
    text: string,
    mixed: boolean,
    issues: FolioDiagnostic[],
    options: { preferLiterals: boolean },
  ): void;
  markActive(layer: HTMLElement, offset: number): void;
  paintActive(layer: HTMLElement): void;
};
declare var FolioPreview: {
  update(
    preview: HTMLElement,
    frame: Element,
    code: string,
    render: (input: string) => HTMLElement,
    key: string,
    revision?: number,
  ): void;
};
declare var FolioDiagnostics: {
  attach(options: {
    source: HTMLTextAreaElement;
    layer: HTMLElement;
    getConfig(): FolioDiagnosticConfig;
    applyFix(fix: FolioFix): void;
  }): { hide(): void };
};
declare var FolioScreenshot: {
  capture(element: HTMLElement): Promise<Blob>;
  html(element: HTMLElement, title: string): Promise<string>;
};
declare var FolioLocalImages: {
  readonly revision: number;
  ready: Promise<void>;
  get(id: string): { url: string; alias: string } | undefined;
  pick(): Promise<string | null>;
  clear(): Promise<void>;
};
declare var FolioPreviewThemes: {
  themes: Record<string, string>;
  compile(css: string): string;
  apply(theme: string, custom: string): void;
};
declare var FolioTemplates: Record<string, string>;
declare var FolioShowcase: string;
interface HTMLElement {
  activeSyntaxRange?: { start: number; end: number };
}
