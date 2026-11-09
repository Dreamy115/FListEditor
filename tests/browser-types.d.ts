// Properties installed by test hosts and browser fixtures, rather than the app.
interface Window {
  originalClipboardWrite?: Clipboard['write'];
}
interface HTMLElement {
  syntaxTokens?: { kind: string; [key: string]: unknown }[];
}
