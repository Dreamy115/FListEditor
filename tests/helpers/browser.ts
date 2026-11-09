import fs from 'node:fs';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';

/** Small DOM host for integration tests. Layout is stubbed; rendering is real. */
function boot(appCode, saved = null, standalone = false) {
  const { window, document }: { window: any; document: any } = parseHTML(
    fs.readFileSync(standalone ? 'dist/Folio-Profile-Studio.html' : 'index.html', 'utf8'),
  );
  const store = new Map(saved ? [['folio-f-list-studio-v1', JSON.stringify(saved)]] : []);
  const rect = { top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 };
  window.HTMLElement.prototype.getBoundingClientRect = () => rect;
  window.HTMLElement.prototype.getClientRects = () => [rect];
  window.HTMLElement.prototype.getAnimations = () => [];
  window.HTMLElement.prototype.focus = function () {
    document.activeElement = this;
  };
  window.HTMLElement.prototype.select = function () {
    this.setSelectionRange(0, this.value.length);
  };
  window.HTMLElement.prototype.setSelectionRange = function (start, end, direction = 'none') {
    this.selectionStart = start;
    this.selectionEnd = end;
    this.selectionDirection = direction;
  };
  window.HTMLElement.prototype.setRangeText = function (text, start, end) {
    this.value = this.value.slice(0, start) + text + this.value.slice(end);
    this.setSelectionRange(start + text.length, start + text.length);
  };
  Object.defineProperty(window.HTMLSelectElement.prototype, 'value', {
    configurable: true,
    get() {
      return (
        [...this.options].find((option) => option.selected)?.value || this.options[0]?.value || ''
      );
    },
    set(value) {
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
      getClientRects: () => [rect],
    });
  const source = document.getElementById('source');
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
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
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
    vm.runInContext(code, context, { filename: file || 'standalone-inline-script' });
  }
  const $ = (id) => document.getElementById(id);
  return {
    context,
    document,
    source,
    store,
    $,
    click(id) {
      $(id).click();
    },
    input(value) {
      source.value = value;
      source.setSelectionRange(value.length, value.length);
      source.dispatchEvent(new window.Event('input'));
    },
    change(id, value) {
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
