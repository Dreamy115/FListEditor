import type { AppElements } from '../../src/app/dom';
import fs from 'node:fs';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';

/** Small DOM host for integration tests. Layout is stubbed; rendering is real. */
function boot(
  appCode: string | null,
  saved: unknown = null,
  standalone = false,
  quotaBytes = 5 * 1024 * 1024,
) {
  const { window, document } = parseHTML(
    fs.readFileSync(standalone ? 'dist/Folio-Profile-Studio.html' : 'index.html', 'utf8'),
  );
  const store = new Map(saved ? [['folio-f-list-studio-v1', JSON.stringify(saved)]] : []);
  const rect: DOMRect = {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    toJSON() {
      return {};
    },
  };
  const rects: DOMRectList = Object.assign([rect], {
    item: (index: number) => (index === 0 ? rect : null),
  });
  // LinkeDOM lacks textarea/layout behavior. This receiver describes only the
  // extra methods installed on this isolated test host, not real DOM elements.
  const prototype = window.HTMLElement.prototype as HTMLTextAreaElement;
  prototype.getBoundingClientRect = () => rect;
  prototype.getClientRects = () => rects;
  prototype.getAnimations = () => [];
  prototype.focus = function (this: HTMLTextAreaElement) {
    Reflect.set(document, 'activeElement', this);
  };
  prototype.select = function (this: HTMLTextAreaElement) {
    this.setSelectionRange(0, this.value.length);
  };
  prototype.setSelectionRange = function (
    this: HTMLTextAreaElement,
    start: number,
    end: number,
    direction: 'forward' | 'backward' | 'none' = 'none',
  ) {
    this.selectionStart = start;
    this.selectionEnd = end;
    this.selectionDirection = direction;
  };
  prototype.setRangeText = function (
    this: HTMLTextAreaElement,
    text: string,
    start: number = this.selectionStart,
    end: number = this.selectionEnd,
  ) {
    this.value = this.value.slice(0, start) + text + this.value.slice(end);
    this.setSelectionRange(start + text.length, start + text.length);
  };
  Object.defineProperty(window.HTMLSelectElement.prototype, 'value', {
    configurable: true,
    get(this: HTMLSelectElement) {
      return (
        [...this.options].find((option) => option.selected)?.value || this.options[0]?.value || ''
      );
    },
    set(this: HTMLSelectElement, value: string) {
      for (const option of this.options) option.selected = option.value === value;
    },
  });
  for (const node of document.querySelectorAll('*')) {
    node.scrollTop = node.scrollLeft = 0;
  }
  const createRange = document.createRange.bind(document);
  document.createRange = () =>
    Object.assign(createRange(), {
      setStart() {},
      setEnd() {},
      collapse() {},
      getBoundingClientRect: () => rect,
      getClientRects: () => rects,
    });
  const source = document.getElementById('source') as HTMLTextAreaElement;
  source.setSelectionRange(0, 0);
  let sequence = 0;
  class Clock extends Date {
    static now() {
      return 1700000000000 + sequence++;
    }
  }
  const context = vm.createContext({
    window,
    document,
    URL,
    Blob,
    console,
    Date: Clock,
    Event: window.Event,
    NodeFilter: { SHOW_TEXT: 4 },
    navigator: {},
    location: { reload() {} },
    localStorage: {
      get length() {
        return store.size;
      },
      key: (index: number) => [...store.keys()][index] ?? null,
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        const next = new Map(store).set(key, value);
        const bytes = [...next].reduce((sum, [k, v]) => sum + 2 * (k.length + v.length), 0);
        if (bytes > quotaBytes)
          throw Object.assign(new Error('Full'), { name: 'QuotaExceededError' });
        store.set(key, value);
      },
      removeItem: (key: string) => store.delete(key),
    },
    setTimeout: () => 1,
    clearTimeout() {},
    requestAnimationFrame() {},
    ResizeObserver: class {
      observe() {}
    },
    getComputedStyle: () => ({
      paddingBottom: '0px',
      lineHeight: '20px',
      getPropertyValue: () => '',
    }),
  });
  const canvasVendor = fs.readFileSync('vendor/html2canvas/html2canvas.min.js', 'utf8');
  for (const script of document.querySelectorAll('script')) {
    const file = script.getAttribute('src');
    if (file?.includes('html2canvas') || script.textContent === canvasVendor) continue; // Used only by screenshot capture.
    const code = file
      ? file === 'build/app.js'
        ? appCode
        : fs.readFileSync(file, 'utf8')
      : script.textContent;
    vm.runInContext(code!, context, { filename: file || 'standalone-inline-script' });
  }
  const $ = <K extends keyof AppElements>(id: K): AppElements[K] =>
    document.getElementById(id) as AppElements[K];
  return {
    context,
    document,
    source,
    store,
    $,
    click(id: keyof AppElements) {
      $(id).click();
    },
    input(value: string) {
      source.value = value;
      source.setSelectionRange(value.length, value.length);
      source.dispatchEvent(new window.Event('input'));
    },
    change(id: 'profileName' | 'editorTheme' | 'theme', value: string) {
      $(id).value = value;
      $(id).dispatchEvent(new window.Event('change'));
    },
    snapshot() {
      return {
        source: source.value,
        name: $('profileName').value,
        preview: $('preview').innerHTML,
        warnings: $('warningList').textContent,
        names: [...document.querySelectorAll('#draftList .draft span')].map(
          (node) => node.textContent,
        ),
        mode: $('mixedMode').className,
        editorTheme: document.documentElement.dataset.appTheme,
        previewTheme: $('theme').value,
        undoDisabled: $('undoEdit').disabled,
        redoDisabled: $('redoEdit').disabled,
      };
    },
  };
}
export { boot };
