/** Contracts for the existing companion scripts loaded before the app bundle. */
type FolioDiagnostic = import('./app/types').Diagnostic;
/** Current syntax mode and accepted macro vocabularies used for fix suggestions. */
interface FolioDiagnosticConfig {
  mixed: boolean;
  inlineNames: Set<string>;
  blockNames: Set<string>;
  colors: string[];
  resolveColor(value: string): string | null;
}
/** A replacement range in UTF-16 source offsets, applied only to unchanged text. */
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
type FolioToken = import('./syntax').SyntaxToken;
declare var FolioSyntax: {
  tokenize(text: string, mixed: boolean): FolioToken[];
  isEntityTextToken(token: FolioToken): boolean;
  highlight(
    layer: HTMLElement,
    text: string,
    mixed: boolean,
    issues?: FolioDiagnostic[],
    options?: { preferLiterals?: boolean },
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
  guidance(
    problem: FolioDiagnostic,
    text: string,
    config: FolioDiagnosticConfig,
  ): { help: string; example: string; fix: (FolioFix & { label: string }) | null };
  attach(options: {
    source: HTMLTextAreaElement;
    layer: HTMLElement;
    getConfig(): FolioDiagnosticConfig;
    applyFix(fix: FolioFix): void;
  }): {
    hide(): void;
    show(problem: FolioDiagnostic, rect: Pick<DOMRect, 'left' | 'top' | 'bottom'>): void;
    popup: HTMLDivElement;
  };
};
declare var FolioScreenshot: {
  capture(element: HTMLElement): Promise<Blob>;
  html(element: HTMLElement, title: string): Promise<string>;
};
declare var FolioLocalImages: {
  readonly revision: number;
  ready: Promise<void>;
  get(id: string): { url: string; alias: string; kind: string } | undefined;
  pick(): Promise<string | null>;
  clear(): Promise<void>;
};
declare var FolioPreviewThemes: {
  themes: Record<string, string>;
  compile(css: string): string;
  apply(theme: string, custom?: string): void;
};
declare var FolioTemplates: Record<string, string>;
declare var FolioShowcase: string;
interface HTMLElement {
  activeSyntaxRange?: { start: number; end: number } | null;
  /** Metadata attached by the syntax painter for diagnostic hit testing. */
  syntaxProblems?: FolioDiagnostic[];
  warningProblems?: FolioDiagnostic[];
}

interface ComponentElement extends HTMLElement {
  cleanup?(): void;
}
interface HTMLElement {
  cleanup?(): void;
}
declare var html2canvas: (
  element: HTMLElement,
  options: Record<string, unknown>,
) => Promise<HTMLCanvasElement>;
declare module '*.md' {
  const text: string;
  export default text;
}
