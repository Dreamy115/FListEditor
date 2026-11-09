import { createContext } from './helpers/typescript';
import assert from './helpers/assert';
import fs from 'node:fs';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';

const { document, window } = parseHTML(
  '<div class="editor-shell"><textarea id="source"></textarea><pre id="layer"></pre></div>',
);
const context = createContext({
  document,
  window,
  setTimeout,
  clearTimeout,
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
});
vm.runInContext(fs.readFileSync('build/diagnostics.js', 'utf8'), context);
const { guidance, attach } = context.FolioDiagnostics;
const config = {
  mixed: true,
  inlineNames: new Set(['b', 'i', 'color', 'link', 'user']),
  blockNames: new Set(['center', 'collapse', 'color', 'right']),
  colors: ['red', 'purple', 'green'],
  resolveColor: (value: string) => (value === '#ff0000' ? 'red' : null),
};
const advice = (text: string, message: string) =>
  guidance({ start: 0, end: text.length, line: 1, message }, text, config);
assert.match(advice('[url]', 'Invalid URL in [url]: use a complete http(s) URL').help, /HTTP/);
assert.match(advice('{user:Bad!Name}', 'Invalid name in [user]: invalid').help, /name/);
assert.equal(advice('[b=ignored]', 'Unexpected parameter on [b]: invalid').fix!.text, '[b]');
assert.match(advice('{big|', 'Unsupported nesting: [big] inside [big]').help, /outside/);
assert.equal(advice(':::centre', 'Unknown block macro: :::centre').fix!.text, ':::center');
assert.equal(advice('::', 'Malformed block macro closing marker: ::').fix!.text, ':::');
assert.equal(advice(':::center bad', 'Invalid block macro: :::center bad').fix!.text, ':::center');
assert.equal(advice(':::', 'Unmatched block macro closing marker: :::').fix!.text, '');
assert.equal(
  advice('{lnik:https://example.com|text}', 'Invalid or unknown inline macro: example').fix!.text,
  '{link:https://example.com|text}',
);
assert.equal(
  advice('[color=#ff0000]', 'Color #ff0000 is not supported by F-List profiles').fix!.text,
  '[color=red]',
);
assert.equal(
  advice('{color:purpel|', 'Color purpel is not supported by F-List profiles').fix!.text,
  '{color:purple|',
);
assert.equal(advice('{link:invalid|text}', 'Invalid inline macro: example').fix, null);
assert.match(advice('{link:invalid|text}', 'Invalid inline macro: example').example, /https:/);
assert.equal(
  advice(':::collapse', 'Invalid block macro: :::collapse').example,
  ':::collapse More details\ntext\n:::',
);
const source = document.getElementById('source') as HTMLTextAreaElement,
  layer = document.getElementById('layer') as HTMLElement;
source.value = '::';
source.getBoundingClientRect = () => ({ left: 10, right: 500, top: 10, bottom: 300 }) as DOMRect;
window.innerWidth = 800;
window.innerHeight = 600;
let applied = null;
const controller = attach({
  source,
  layer,
  getConfig: () => config,
  applyFix: (fix) => {
    applied = fix;
  },
});
controller.popup.getBoundingClientRect = () => ({ width: 390, height: 200 }) as DOMRect;
const problem = { start: 0, end: 2, line: 1, message: 'Malformed block macro closing marker: ::' };
controller.show(problem, { left: 790, top: 580, bottom: 600 });
assert.equal(controller.popup.hidden, false);
assert.match(controller.popup.textContent, /exactly three colons/);
assert.equal(controller.popup.style.left, '402px');
controller.popup.querySelector('button')!.click();
assert.equal(applied!.text, ':::');
assert.equal(controller.popup.hidden, true);
controller.show(problem, { left: 10, top: 20, bottom: 40 });
source.value = 'changed';
applied = null;
controller.popup.querySelector('button')!.click();
assert.equal(applied, null, 'Do not apply stale fixes');
console.log('Diagnostic guidance, popup, and quick fix checks passed');

controller.show({ ...problem, severity: 'error' }, { left: 10, top: 20, bottom: 40 });
assert.equal(controller.popup.dataset.severity, 'error');
controller.show({ ...problem, severity: 'warning' }, { left: 10, top: 20, bottom: 40 });
assert.equal(controller.popup.dataset.severity, 'warning');
