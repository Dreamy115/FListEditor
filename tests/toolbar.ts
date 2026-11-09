import { createContext } from './helpers/typescript';
import * as units from './helpers/typescript.ts';
import assert from './helpers/assert';
import fs from 'node:fs';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';

const source = { value: '', selectionStart: 0, selectionEnd: 0 };
const data: { mixed: boolean; preferLiterals?: boolean } = { mixed: true };
let selection;
const context = createContext({
  source,
  data,
  URL,
  replaceRange(
    text,
    start = source.selectionStart,
    end = source.selectionEnd,
    from = start + text.length,
    to = from,
  ) {
    source.value = source.value.slice(0, start) + text + source.value.slice(end);
    selection = [from, to];
  },
});
units.load(context, 'editor/editing', { names: ['wrapInline'], effects: [] });
units.load(context, 'editor/insertions', {
  names: ['insertionSpecs', 'markdownInsertionSpecs', 'insertUnicodeSymbol', 'insertTag'],
  effects: [],
});
units.formatting(context);
function reset(text = '') {
  source.value = text;
  source.selectionStart = 0;
  source.selectionEnd = text.length;
}
for (const [tag, expected] of Object.entries({
  b: '**Text**',
  i: '*Text*',
  u: '++Text++',
  s: '~~Text~~',
  big: '{big|Text}',
  small: '{small|Text}',
  sup: '{sup|Text}',
  sub: '{sub|Text}',
  heading: '# Text',
  center: ':::center\nText\n:::',
  quote: '> Text',
})) {
  data.mixed = true;
  reset('Text');
  context.wrapInline(tag);
  assert.equal(source.value, expected);
  assert.equal(source.value.slice(...selection), 'Text');
  assert.equal(
    context.markdownToBB(source.value),
    tag === 'heading' ? '[heading][big]Text[/big][/heading]' : `[${tag}]Text[/${tag}]`,
  );
  data.mixed = false;
  reset('Text');
  context.wrapInline(tag);
  assert.equal(
    source.value,
    tag === 'heading' ? '[heading][big]Text[/big][/heading]' : `[${tag}]Text[/${tag}]`,
  );
}
for (const type of ['link', 'image', 'inlineimg', 'collapse', 'user', 'icon', 'eicon', 'noparse']) {
  data.mixed = true;
  reset();
  context.insertTag(type);
  assert.ok(!/\[(?:url|img|collapse|user|icon|eicon|noparse)(?:=|\])/.test(source.value), type);
  const bbcode = context.markdownToBB(source.value);
  data.mixed = false;
  reset();
  context.insertTag(type);
  // Collapse BBCode historically includes literal padding newlines.
  assert.equal(
    bbcode,
    type === 'collapse' ? '[collapse=More details]Write details here[/collapse]' : source.value,
    type,
  );
}
data.mixed = true;
reset('First\nSecond');
context.wrapInline('b');
assert.equal(context.markdownToBB(source.value), '[b]First\nSecond[/b]');
reset('image label');
context.insertTag('inlineimg');
assert.equal(source.value, '{img:12345|image label}');
reset('Line one\nLine two');
context.insertTag('noparse');
assert.equal(context.markdownToBB(source.value), '[noparse]Line one\nLine two[/noparse]');
reset('Beforeafter');
source.selectionStart = source.selectionEnd = 6;
context.insertTag('collapse');
assert.equal(
  context.markdownToBB(source.value),
  'Before[collapse=More details]Write details here[/collapse]after',
);
for (const mixed of [true, false]) {
  for (const preferLiterals of [true, false]) {
    data.mixed = mixed;
    data.preferLiterals = preferLiterals;
    reset('before selected after');
    source.selectionStart = 7;
    source.selectionEnd = 15;
    context.insertUnicodeSymbol('◆😀');
    const expected = mixed && !preferLiterals ? '&#x25C6;&#x1F600;' : '◆😀';
    assert.equal(source.value, 'before ' + expected + ' after');
    assert.deepEqual(selection, [7 + expected.length, 7 + expected.length]);
    if (mixed) assert.equal(context.markdownToBB(source.value), 'before ◆😀 after');
  }
}
console.log('Mode-aware toolbar checks passed');

// The color shortcut is editor-only and leaves modified variants and the previous Space shortcut alone.
let keyHandler,
  colorCalls = 0;
const shortcutDocument = {
  activeElement: source as object,
  addEventListener(type, handler) {
    keyHandler = handler;
  },
};
const shortcutContext = createContext({
  source,
  document: shortcutDocument,
  wrapInline: (tag) => {
    assert.equal(tag, 'b');
  },
  openQuickColor: () => {
    colorCalls++;
  },
});
units.load(shortcutContext, 'editor/shortcuts', {
  names: [],
  effects: ["document.addEventListener('keydown'"],
});
function colorKey(overrides = {}) {
  let prevented = false;
  keyHandler({
    key: 'd',
    code: 'KeyD',
    ctrlKey: true,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    isComposing: false,
    preventDefault() {
      prevented = true;
    },
    ...overrides,
  });
  return prevented;
}
assert.equal(colorKey(), true);
assert.equal(colorCalls, 1);
assert.equal(colorKey({ key: ' ', code: 'Space' }), false);
assert.equal(colorKey({ shiftKey: true }), false);
assert.equal(colorKey({ ctrlKey: false }), false);
assert.equal(colorKey({ altKey: true }), false);
assert.equal(colorKey({ isComposing: true }), false);
shortcutDocument.activeElement = {};
assert.equal(colorKey(), false);
assert.equal(colorCalls, 1);
console.log('Color shortcut routing checks passed');

data.mixed = true;
reset('First\n\nSecond');
context.wrapInline('quote');
assert.equal(source.value, '> First\n> \n> Second');
assert.equal(context.markdownToBB(source.value), '[quote]First\n\nSecond[/quote]');
reset('Before selected after');
source.selectionStart = 7;
source.selectionEnd = 15;
context.wrapInline('big');
assert.equal(source.value, 'Before {big|selected} after');
reset('Line one\nLine two');
context.wrapInline('heading');
assert.equal(
  context.markdownToBB(source.value),
  '[heading][big]Line one\nLine two[/big][/heading]',
);
reset('literal {macro}');
context.insertTag('noparse');
assert.equal(source.value, '`literal {macro}`');
reset('a `backtick`');
context.insertTag('noparse');
assert.equal(context.markdownToBB(source.value), '[noparse]a `backtick`[/noparse]');

for (const [tag, markdown, bbcode] of [
  ['heading2', '## Text', '[heading]Text[/heading]'],
  ['right', ':::right\nText\n:::', '[right]Text[/right]'],
  ['justify', ':::justify\nText\n:::', '[justify]Text[/justify]'],
] as const) {
  data.mixed = true;
  reset('Text');
  context.wrapInline(tag);
  assert.equal(source.value, markdown);
  assert.equal(context.markdownToBB(source.value), bbcode);
  data.mixed = false;
  reset('Text');
  context.wrapInline(tag);
  assert.equal(source.value, bbcode);
}
data.mixed = true;
reset('First\nSecond');
context.wrapInline('heading2');
assert.equal(context.markdownToBB(source.value), '[heading]First\nSecond[/heading]');
console.log('H2 and alignment toolbar checks passed');

for (const mixed of [true, false]) {
  data.mixed = mixed;
  for (const type of ['inlineimg', 'image']) {
    reset();
    context.insertTag(type);
    assert.ok(!source.value.endsWith('\n'), 'Image insertion must not add source newlines');
    const image = source.value;
    reset('after');
    source.selectionEnd = 0;
    context.insertTag(type);
    assert.equal(source.value, image + 'after', 'Following source text is unchanged');
  }
}

const { document: pickerDocument, window: pickerWindow } = parseHTML('<html><body></body></html>');
let pickerApplied = [],
  restoredSelection;
const pickerSource = {
  value: 'ordinary text',
  selectionStart: 3,
  selectionEnd: 8,
  selectionDirection: 'backward',
  focus() {},
  setSelectionRange(...args) {
    restoredSelection = args;
  },
  addEventListener() {},
};
const pickerContext = createContext({
  document: pickerDocument,
  window: pickerWindow,
  source: pickerSource,
  data: { mixed: true },
  diagnosticHover: null,
  wrapColor: (name) => pickerApplied.push(name),
});
units.load(pickerContext, 'editor/toolbar', {
  names: [
    'quickColorKeys',
    'quickColorPicker',
    'quickColorHint',
    'quickColorSelection',
    'closeQuickColor',
    'applyQuickColor',
    'positionQuickColor',
    'selectedColorBody',
    'unwrapSelectedColor',
    'openQuickColor',
  ],
  effects: [
    'quickColorPicker.',
    'quickColorHint.',
    'quickColorKeys',
    'document.body.append(quickColorPicker)',
    'source.addEventListener',
  ],
});
vm.runInContext('positionQuickColor=()=>{}', pickerContext);
const popup = pickerDocument.querySelector<HTMLElement>('.quick-color-picker');
function pickerKey(key, extra = {}) {
  const event = new pickerWindow.Event('keydown', { bubbles: true, cancelable: true });
  Object.assign(event, { key, ...extra });
  popup.dispatchEvent(event);
  return event.defaultPrevented;
}
pickerContext.openQuickColor();
assert.equal(popup.hidden, false);
assert.equal(pickerApplied.length, 0);
assert.equal(pickerKey('g'), true);
assert.deepEqual(pickerApplied, ['green']);
assert.deepEqual(restoredSelection, [3, 8, 'backward']);
assert.equal(popup.hidden, true);
pickerContext.openQuickColor();
pickerKey('Escape');
assert.equal(pickerApplied.length, 1);
assert.equal(popup.hidden, true);
for (const button of popup.querySelectorAll<HTMLElement>('button')) {
  pickerContext.openQuickColor();
  const key = button.textContent[0].toLowerCase();
  pickerKey(key);
  assert.equal(popup.hidden, true);
}
assert.equal(new Set(pickerApplied.slice(1)).size, 12);
pickerContext.openQuickColor();
pickerKey('b', { repeat: true });
assert.equal(popup.hidden, false);
pickerContext.closeQuickColor(true);
pickerContext.openQuickColor();
popup.querySelector<HTMLElement>('button').click();
assert.equal(pickerApplied.at(-1), 'red');
assert.equal(popup.hidden, true);
console.log('Quick color picker immediate choices, cancellation and selection preservation passed');
context.colorSafe = () => true;
units.load(context, 'editor/toolbar', { names: ['wrapColor'], effects: [] });
for (const mixed of [true, false]) {
  data.mixed = mixed;
  reset('selected');
  context.wrapColor('green');
  assert.equal(source.value, mixed ? '{color:green|selected}' : '[color=green]selected[/color]');
  assert.equal(source.value.slice(...selection), 'selected');
  reset();
  context.wrapColor('cyan');
  assert.equal(source.value.slice(...selection), 'your text');
  reset('First\nSecond');
  context.wrapColor('red');
  assert.equal(
    source.value,
    mixed ? ':::color red\nFirst\nSecond\n:::' : '[color=red]First\nSecond[/color]',
  );
}
console.log('Quick color insertion syntax and placeholder checks passed');

units.load(context, 'editor/toolbar', {
  names: ['selectedColorBody', 'unwrapSelectedColor'],
  effects: [],
});
for (const [mixed, wrapped, body] of [
  [true, '{color:red|**Keep** {i|nested} text}', '**Keep** {i|nested} text'],
  [true, '{color:red|{color:blue|nested}}', '{color:blue|nested}'],
  [
    false,
    '[color=red][b]Keep[/b] [color=blue]nested[/color][/color]',
    '[b]Keep[/b] [color=blue]nested[/color]',
  ],
  [true, ':::color red\nFirst\n\n:::b\nSecond\n:::\n:::', 'First\n\n:::b\nSecond\n:::'],
  [true, '{color:red|}', ''],
  [false, '[color=red][/color]', ''],
] as const) {
  data.mixed = mixed;
  reset(wrapped);
  assert.equal(context.unwrapSelectedColor(), true);
  assert.equal(source.value, body);
  assert.equal(source.value.slice(...selection), body);
  if (body && context.selectedColorBody(body) === null) {
    reset('before\n' + wrapped + '\nafter');
    source.selectionStart = 7 + wrapped.indexOf(body);
    source.selectionEnd = source.selectionStart + body.length;
    assert.equal(context.unwrapSelectedColor(), true);
    assert.equal(source.value, 'before\n' + body + '\nafter');
    assert.equal(source.value.slice(...selection), body);
  }
}
for (const [mixed, text] of [
  [true, '{color:red|a}{color:blue|b}'],
  [true, '{color:red|unclosed'],
  [true, 'plain'],
  [false, '[color=red]a[/color][color=blue]b[/color]'],
  [true, ':::color red\na\n:::\nb\n:::'],
] as const) {
  data.mixed = mixed;
  reset(text);
  assert.equal(context.unwrapSelectedColor(), false);
  assert.equal(source.value, text);
}
data.mixed = true;
reset('{color:red|body}');
source.selectionStart = source.selectionEnd = 12;
assert.equal(context.unwrapSelectedColor(), false);
console.log('Color unwrapping preserves nested formatting, selection and surrounding text');

// Formatting toggles recognize complete spans and the body selected after insertion.
for (const mixed of [true, false]) {
  data.mixed = mixed;
  for (const tag of ['b', 'i', 'u', 's']) {
    for (const text of ['Text', 'First\nSecond']) {
      reset(text);
      context.wrapInline(tag);
      const wrapped = source.value;
      [source.selectionStart, source.selectionEnd] = selection;
      context.wrapInline(tag);
      assert.equal(source.value, text);
      assert.equal(source.value.slice(...selection), text);
      reset(wrapped);
      context.wrapInline(tag);
      assert.equal(source.value, text);
    }
  }
}
data.mixed = true;
for (const [tag, wrapped, expected] of [
  ['b', '__Text__', 'Text'],
  ['i', '_Text_', 'Text'],
  ['u', '{underline|Text}', 'Text'],
  ['b', '{b|Text *nested*}', 'Text *nested*'],
  ['b', '***Text***', '*Text*'],
  ['i', '***Text***', '**Text**'],
  ['b', '**one** and **two**', '****one** and **two****'],
] as const) {
  reset(wrapped);
  context.wrapInline(tag);
  assert.equal(source.value, expected);
}
for (const mixed of [true, false]) {
  data.mixed = mixed;
  reset('before Text after');
  source.selectionStart = 7;
  source.selectionEnd = 11;
  context.wrapInline('b');
  [source.selectionStart, source.selectionEnd] = selection;
  context.wrapInline('b');
  assert.equal(source.value, 'before Text after');
  assert.deepEqual(selection, [7, 11]);
}
console.log('Formatting toggle checks passed');

// Italic must not mistake either half of a bold delimiter for existing italics.
data.mixed = true;
for (const mark of ['**', '__']) {
  for (const bodyOnly of [true, false]) {
    reset(mark + 'Text' + mark);
    if (bodyOnly) {
      source.selectionStart = 2;
      source.selectionEnd = 6;
    }
    context.wrapInline('i');
    assert.ok(
      ['[b][i]Text[/i][/b]', '[i][b]Text[/b][/i]'].includes(context.markdownToBB(source.value)),
    );
    [source.selectionStart, source.selectionEnd] = selection;
    context.wrapInline('i');
    assert.equal(source.value, mark + 'Text' + mark);
  }
}
console.log('Italic toggling preserves bold formatting');
