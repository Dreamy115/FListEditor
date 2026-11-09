import { createContext } from './helpers/typescript';
import assert from './helpers/assert';
import fs from 'node:fs';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';

const { document } = parseHTML('<pre></pre>');
const context = createContext({ document });
vm.runInContext(fs.readFileSync('build/syntax.js', 'utf8'), context);
const { tokenize, highlight } = context.FolioSyntax;
for (const source of [
  '``code ` inside``',
  '````text\n```\n{unknown|literal}\n```\n````',
  '```\n```literal\n```',
]) {
  const tokens = tokenize(source, true);
  assert.equal(tokens.length, 1, source);
  assert.equal(tokens[0].kind, 'literal', source);
  assert.equal(tokens[0].text, source);
}
assert.ok(!tokenize('\\`literal\\`', true).some((token) => token.kind === 'literal'));
const sample = ':::center\n# Heading\n{color:cyan|**Name**}\n[hr]\n\n<script>alert(1)</script>\n';
for (const mixed of [true, false]) {
  assert.equal(
    tokenize(sample, mixed)
      .map((t) => t.text)
      .join(''),
    sample,
  );
  const layer = document.createElement('pre');
  highlight(layer, sample, mixed);
  assert.equal(layer.textContent, sample + '\n');
  assert.equal(layer.querySelector<HTMLElement>('script'), null);
  assert.ok(layer.querySelector<HTMLElement>(mixed ? '.syntax-literal' : '.syntax-tag'));
}
assert.ok(tokenize(sample, true).some((t) => t.kind === 'macro'));
assert.ok(!tokenize(sample, false).some((t) => t.kind === 'macro'));
for (const [source, kind] of [
  ['{sup|2}', 'macro'],
  ['{sub|2}', 'macro'],
  ['[sup]2[/sup]', 'literal'],
  ['[sub]2[/sub]', 'literal'],
] as const) {
  assert.ok(
    tokenize(source, true).some(
      (token) => token.kind === kind && token.text.startsWith(kind === 'macro' ? '{' : '['),
    ),
  );
}
for (const color of [
  'red',
  'orange',
  'yellow',
  'green',
  'cyan',
  'purple',
  'blue',
  'pink',
  'black',
  'brown',
  'white',
  'gray',
]) {
  for (const [source, mixed] of [
    ['{color:' + color + '|}', true],
    ['[color=' + color + ']', false],
    [':::color ' + color, true],
    ['  :::COLOR\t' + color.toUpperCase() + '  ', true],
  ] as const) {
    const layer = document.createElement('pre');
    highlight(layer, source, mixed);
    const value = layer.querySelector<HTMLElement>(
      '.syntax-color-value[data-color="' + color + '"]',
    );
    assert.ok(value, color + ' color-name highlight');
    assert.equal(value.textContent.toLowerCase(), color);
    assert.equal(
      value.parentElement.classList.contains(
        source.trim().startsWith(':::') ? 'syntax-block' : mixed ? 'syntax-macro' : 'syntax-tag',
      ),
      true,
    );
    assert.equal(layer.textContent, source + '\n');
  }
}
for (const literal of ['```\n**raw**\n{br}\n```']) {
  const tokens = tokenize(literal, true);
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].kind, 'literal');
}
assert.equal(tokenize('\\*literal', true)[0].kind, 'escape');
for (const source of ['{macro:xyz}', '{font:serif|Text}', '{big|{user:Name}}']) {
  const layer = document.createElement('pre');
  highlight(layer, source, true);
  assert.ok(layer.querySelector<HTMLElement>('.syntax-macro-value'));
  assert.equal(layer.textContent, source + '\n');
}
for (const color of [
  'red',
  'orange',
  'yellow',
  'green',
  'cyan',
  'purple',
  'blue',
  'pink',
  'black',
  'brown',
  'white',
  'gray',
]) {
  const layer = document.createElement('pre');
  highlight(layer, '{color:' + color + '|Text}', true);
  assert.ok(layer.querySelector<HTMLElement>('.syntax-color-value[data-color="' + color + '"]'));
  assert.equal(
    layer.querySelector<HTMLElement>('.syntax-macro-value'),
    null,
    'Color swatches take precedence',
  );
}
const valueLayer = document.createElement('pre');
highlight(valueLayer, '{macro:xyz}', true, [{ start: 8, end: 9, message: 'Example warning' }]);
assert.equal(
  [...valueLayer.querySelectorAll<HTMLElement>('.syntax-macro-value')]
    .map((span) => span.textContent)
    .join(''),
  'xyz',
);
assert.equal(valueLayer.textContent, '{macro:xyz}\n');
console.log('Syntax highlighting checks passed');

for (const title of ['{font:smallcaps|SUBJECT DOCUMENTATION}', 'Prefix {font:bold|Title} suffix']) {
  const source = ':::collapse ' + title + '\nBody\n:::';
  const layer = document.createElement('pre');
  const warningStart = source.indexOf('font:') + 5;
  highlight(layer, source, true, [
    { start: warningStart, end: warningStart + 2, message: 'Title warning' },
  ]);
  assert.equal(layer.textContent, source + '\n');
  assert.ok(layer.querySelector<HTMLElement>('.syntax-macro'));
  assert.equal(
    [...layer.querySelectorAll<HTMLElement>('.syntax-macro-value')]
      .map((el) => el.textContent)
      .join(''),
    title.includes('smallcaps') ? 'smallcaps' : 'bold',
  );
  assert.ok(layer.querySelector<HTMLElement>('.syntax-warning .syntax-macro-value'));
  assert.ok(layer.querySelector<HTMLElement>('.syntax-collapse-title'));
  assert.ok(!layer.querySelector<HTMLElement>('.syntax-unmatched'));
  assert.equal(layer.syntaxTokens.filter((token) => token.kind === 'block').length, 2);
  context.FolioSyntax.markActive(layer, source.indexOf('Body'));
  assert.ok(layer.querySelector<HTMLElement>('.syntax-active-delimiter'));
  assert.equal(layer.activeSyntaxRange.start, 0);
}
console.log('Collapse title inline macro highlighting and diagnostics passed');

for (const title of [
  '{color:red|Title} {big|Text} {user:Name} **bold** *italic* ++underline++ &mdash; [Link](https://example.com) `literal`',
  '{font:bold|**bold** {color:red|Text}}',
  '{font:smallcaps|**bold** [Link](https://example.com) &mdash; `literal`}',
]) {
  const source = ':::collapse ' + title + '\nBody\n:::';
  const layer = document.createElement('pre');
  highlight(layer, source, true);
  assert.equal(layer.textContent, source + '\n');
  assert.equal(
    layer.querySelector<HTMLElement>(
      '.syntax-color-value, .syntax-emphasis, .syntax-link, .syntax-literal, .syntax-entity',
    ),
    null,
  );
  const macros = [...layer.querySelectorAll<HTMLElement>('.syntax-macro')]
    .map((span) => span.textContent)
    .join('');
  assert.equal(macros, title.startsWith('{font:smallcaps|') ? '{font:smallcaps|}' : '');
}
const mixedTitleLayer = document.createElement('pre');
highlight(
  mixedTitleLayer,
  ':::collapse {color:red|Plain} {font:bold|Font} {big|Plain}\nBody\n:::',
  true,
);
assert.equal(
  [...mixedTitleLayer.querySelectorAll<HTMLElement>('.syntax-macro')]
    .map((span) => span.textContent)
    .join(''),
  '{font:bold|}',
);

assert.equal(tokenize('[Visit](https://example.com)', true)[0].kind, 'link');
for (const prefix of ['', '!']) {
  const layer = document.createElement('pre');
  const source = prefix + '[Visit](https://example.com)';
  highlight(layer, source, true);
  assert.equal(
    layer.querySelector<HTMLElement>('.syntax-link-label').textContent,
    prefix + '[Visit]',
  );
  assert.equal(
    layer.querySelector<HTMLElement>('.syntax-link-target').textContent,
    '(https://example.com)',
  );
  assert.equal(layer.querySelector<HTMLElement>('.syntax-link-display').textContent, 'Visit');
  assert.equal(
    layer.querySelector<HTMLElement>('.syntax-link-url').textContent,
    'https://example.com',
  );
  assert.equal(
    [...layer.querySelectorAll<HTMLElement>('.syntax-link-punctuation')]
      .map((span) => span.textContent)
      .join(''),
    prefix + '[]()',
  );
  assert.equal(layer.textContent, source + '\n');
}

for (const marks of ['*', '**', '***', '_', '__', '~~', '++']) {
  const text = marks + '{color:cyan|{big|Name}}' + marks;
  const tokens = tokenize(text, true);
  assert.equal(tokens.map((t) => t.text).join(''), text);
  assert.equal(tokens[0].kind, 'emphasis');
  assert.ok(tokens.some((t) => t.kind === 'macro' && t.text === '{color:cyan|'));
  assert.ok(tokens.some((t) => t.kind === 'macro' && t.text === '{big|'));
  const layer = document.createElement('pre');
  highlight(layer, text, true);
  assert.equal(layer.textContent, text + '\n');
  assert.ok(layer.querySelector<HTMLElement>('.syntax-macro'));
}
const nested = tokenize('*Text {color:cyan|Name} [b]bold[/b] `literal`*', true);
for (const kind of ['emphasis', 'macro', 'literal']) assert.ok(nested.some((t) => t.kind === kind));
assert.equal(tokenize('*Italic*', true)[0].kind, 'emphasis');
assert.equal(tokenize('- List item', true)[0].kind, 'marker');
assert.equal(tokenize('# Heading', true)[0].marker, 'heading');
assert.equal(tokenize('> Quote', true)[0].marker, 'quote');
assert.equal(tokenize('- List item', true)[0].marker, 'list');
for (const [marks, format] of Object.entries({
  '*': 'italic',
  _: 'italic',
  '**': 'bold',
  __: 'bold',
  '***': 'bold-italic',
  '~~': 'strike',
  '++': 'underline',
})) {
  const layer = document.createElement('pre');
  highlight(layer, marks + 'Text' + marks, true);
  assert.ok(layer.querySelector<HTMLElement>('.syntax-emphasis-' + format));
  assert.deepEqual(
    [...layer.querySelectorAll<HTMLElement>('.syntax-emphasis-marker')].map(
      (span) => span.textContent,
    ),
    [marks, marks],
  );
  assert.ok(
    ![...layer.querySelectorAll<HTMLElement>('.syntax-emphasis-marker')].some(
      (span) => span.textContent === 'Text',
    ),
  );
  assert.equal(layer.textContent, marks + 'Text' + marks + '\n');
}
const formats = tokenize('**Bold ~~strike~~ {color:cyan|macro}**', true);
for (const [source, format, body] of [
  ['[b]Bold[/b]', 'bold', 'Bold'],
  ['[I]Italic[/I]', 'italic', 'Italic'],
  ['[b]Bold\n[i]Both[/i][/b]', 'bold-italic', 'Both'],
  ['[i][b]Both[/b][/i]', 'bold-italic', 'Both'],
] as const) {
  const layer = document.createElement('pre');
  highlight(layer, source + ' plain', false);
  assert.equal(layer.textContent, source + ' plain\n');
  assert.ok(
    [...layer.querySelectorAll<HTMLElement>('.syntax-emphasis-' + format)].some(
      (span) => span.textContent === body,
    ),
  );
  assert.ok(!tokenize(source + ' plain', false).at(-1).format);
}
assert.ok(tokenize('[noparse][b]literal[/b][/noparse]', false).every((token) => !token.format));
assert.ok(tokenize('[b]unclosed', false).every((token) => !token.format));
assert.ok(tokenize('[b]literal[/b]', true).every((token) => !token.format));
const bbcodeFormatting = tokenize('[b]Bold [i]both[/i] [color=red]colored[/color][/b]', false);
assert.ok(bbcodeFormatting.filter((token) => token.kind === 'tag').every((token) => !token.format));
assert.equal(bbcodeFormatting.find((token) => token.text === 'both').format, 'bold-italic');
assert.equal(bbcodeFormatting.find((token) => token.text === 'colored').format, 'bold');
assert.ok(formats.some((token) => token.text === 'Bold ' && token.format === 'bold'));
assert.ok(formats.some((token) => token.text === 'strike' && token.format === 'strike'));
assert.ok(formats.filter((token) => token.kind === 'macro').every((token) => !token.format));

const deep = ':::center\n:::color cyan\n*{color:cyan|{big|[b][i]Nested[/i][/b]}}*\n:::\n:::';
const deepTokens = tokenize(deep, true);
assert.equal(deepTokens.map((t) => t.text).join(''), deep);
assert.equal(deepTokens.find((t) => t.text === ':::center').kind, 'block');
for (const kind of ['block', 'macro']) {
  const containers = deepTokens.filter((t) => t.kind === kind);
  assert.ok(
    containers.some((t) => t.depth === 1),
    kind,
  );
  assert.ok(
    containers.every((t) => t.pair !== undefined && !t.unmatched),
    kind,
  );
  for (const token of containers) {
    const partner = containers.find((other) => other.start === token.partner);
    assert.equal(partner.depth, token.depth);
    assert.equal(partner.pair, token.pair);
  }
}
const deepLayer = document.createElement('pre');
highlight(deepLayer, deep, true);
assert.equal(
  deepLayer.querySelectorAll<HTMLElement>('.source-line-anchor').length,
  deep.split('\n').length,
);
for (const kind of ['block', 'macro']) {
  assert.ok(deepLayer.querySelector<HTMLElement>('.syntax-' + kind + '.syntax-depth-0'));
  assert.ok(deepLayer.querySelector<HTMLElement>('.syntax-' + kind + '.syntax-depth-1'));
}
for (const open of deepTokens.filter((t) => t.partner > t.start)) {
  const pair = [...deepLayer.querySelectorAll<HTMLElement>('[data-pair]')].filter(
    (span) => span.dataset.pair === String(open.pair),
  );
  assert.equal(pair.length, 2);
  assert.ok(pair.every((span) => span.classList.contains('syntax-depth-' + (open.depth % 5))));
}
context.FolioSyntax.markActive(deepLayer, deep.indexOf('{big|') + 2);
assert.equal(
  deep.slice(deepLayer.activeSyntaxRange.start, deepLayer.activeSyntaxRange.end),
  '{big|[b][i]Nested[/i][/b]}',
);
context.FolioSyntax.markActive(deepLayer, deep.indexOf('Nested') + 2);
assert.equal(
  deep.slice(deepLayer.activeSyntaxRange.start, deepLayer.activeSyntaxRange.end),
  '{big|[b][i]Nested[/i][/b]}',
);
assert.equal(
  [...deepLayer.querySelectorAll<HTMLElement>('.syntax-active-delimiter')]
    .map((s) => s.textContent)
    .join(''),
  '{big|}',
);
context.FolioSyntax.markActive(deepLayer, deep.length);
assert.equal(deepLayer.activeSyntaxRange, null);
assert.equal(deepLayer.querySelectorAll<HTMLElement>('.syntax-active-delimiter').length, 0);
context.FolioSyntax.markActive(deepLayer, deep.indexOf(':::color') + 5);
assert.equal(
  deep.slice(deepLayer.activeSyntaxRange.start, deepLayer.activeSyntaxRange.end),
  ':::color cyan\n*{color:cyan|{big|[b][i]Nested[/i][/b]}}*\n:::',
);
assert.equal(deepLayer.textContent, deep + '\n');
assert.ok(tokenize('[b][i]Crossed[/b][/i]', false).some((t) => t.unmatched));
assert.ok(tokenize('{big|Unclosed', true).some((t) => t.unmatched));
assert.ok(!tokenize('```\n{big|[b]\n```', true).some((t) => t.unmatched));
for (const input of [
  '> > Nested',
  '>>Nested',
  '  >  >\t> Deep',
  '> Outer\n> > Inner\n> Outer again',
]) {
  const tokens = tokenize(input, true);
  assert.equal(tokens.map((token) => token.text).join(''), input);
  const markers = tokens.filter((token) => token.marker === 'quote');
  assert.equal(markers.length, (input.match(/>/g) || []).length);
  const layer = document.createElement('pre');
  highlight(layer, input, true);
  assert.equal(layer.querySelectorAll<HTMLElement>('.syntax-marker-quote').length, markers.length);
  assert.equal(layer.textContent, input + '\n');
}
const quoted = '> > # {color:cyan|**Title**}\n> > :::color purple\n> > text\n> > :::';
const quotedLayer = document.createElement('pre');
highlight(quotedLayer, quoted, true);
assert.equal(quotedLayer.querySelectorAll<HTMLElement>('.syntax-marker-quote').length, 8);
assert.ok(quotedLayer.querySelector<HTMLElement>('.syntax-marker-heading'));
assert.ok(quotedLayer.querySelector<HTMLElement>('.syntax-emphasis-bold'));
assert.ok(quotedLayer.querySelector<HTMLElement>('.syntax-color-value[data-color="purple"]'));
assert.equal(quotedLayer.textContent, quoted + '\n');
for (const literal of [
  '`> > literal`',
  '[noparse]> > literal[/noparse]',
  '```\n> > literal\n```',
  '\\> > literal',
  'text > > comparison',
]) {
  assert.ok(!tokenize(literal, true).some((token) => token.marker === 'quote'), literal);
}
assert.ok(!tokenize('> > plain BBCode', false).some((token) => token.marker === 'quote'));
console.log('Nested quote highlighting checks passed');

const glyphLayer = document.createElement('pre');
const glyphSource =
  'Plain \u25c6 **\u2014** {color:purple|\u2605} `\u25c6` [\u25c6](https://example.com)';
highlight(glyphLayer, glyphSource, true, [], { preferLiterals: true });
assert.equal(glyphLayer.textContent, glyphSource + '\n');
assert.deepEqual(
  [...glyphLayer.querySelectorAll<HTMLElement>('.syntax-entity-glyph')].map(
    (span) => span.textContent,
  ),
  ['\u25c6', '\u2014', '\u2605'],
);
highlight(glyphLayer, glyphSource, true, [], { preferLiterals: false });
assert.equal(glyphLayer.querySelectorAll<HTMLElement>('.syntax-entity-glyph').length, 0);
highlight(glyphLayer, glyphSource, false, [], { preferLiterals: true });
assert.equal(glyphLayer.querySelectorAll<HTMLElement>('.syntax-entity-glyph').length, 0);
console.log('Literal entity glyph outline and source preservation checks passed');
