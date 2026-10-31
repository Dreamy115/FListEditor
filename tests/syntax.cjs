const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');
const {document} = parseHTML('<pre></pre>');
const context = vm.createContext({document});
vm.runInContext(fs.readFileSync('src/syntax.js', 'utf8'), context);
const {tokenize, highlight} = context.FolioSyntax;
const sample = ':::center\n# Heading\n{color:cyan|**Name**}\n[hr]\n\n<script>alert(1)</script>\n';
for (const mixed of [true, false]) {
  assert.equal(tokenize(sample, mixed).map(t => t.text).join(''), sample);
  const layer = document.createElement('pre');
  highlight(layer, sample, mixed);
  assert.equal(layer.textContent, sample + '\n');
  assert.equal(layer.querySelector('script'), null);
  assert.ok(layer.querySelector(mixed?'.syntax-literal':'.syntax-tag'));
}
assert.ok(tokenize(sample, true).some(t => t.kind === 'macro'));
assert.ok(!tokenize(sample, false).some(t => t.kind === 'macro'));
for (const [source,kind] of [['{sup|2}', 'macro'], ['{sub|2}', 'macro'], ['[sup]2[/sup]', 'literal'], ['[sub]2[/sub]', 'literal']]) {
  assert.ok(tokenize(source, true).some(token => token.kind === kind && token.text.startsWith(kind === 'macro' ? '{' : '[')));
}
for (const color of ['red','orange','yellow','green','cyan','purple','blue','pink','black','brown','white','gray']) {
  for (const [source,mixed] of [['{color:'+color+'|}',true], ['[color='+color+']',false], [':::color '+color,true], ['  :::COLOR\t'+color.toUpperCase()+'  ',true]]) {
    const layer = document.createElement('pre'); highlight(layer, source, mixed);
    const value = layer.querySelector('.syntax-color-value[data-color="'+color+'"]');
    assert.ok(value, color+' color-name highlight');
    assert.equal(value.textContent.toLowerCase(), color);
    assert.equal(value.parentElement.classList.contains(source.trim().startsWith(':::')?'syntax-block':mixed?'syntax-macro':'syntax-tag'), true);
    assert.equal(layer.textContent, source+'\n');
  }
}
for (const literal of ['```\n**raw**\n{br}\n```']) {
  const tokens = tokenize(literal, true);
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].kind, 'literal');
}
assert.equal(tokenize('\\*literal', true)[0].kind, 'escape');
console.log('Syntax highlighting checks passed');

assert.equal(tokenize('[Visit](https://example.com)', true)[0].kind, 'link');

for (const marks of ['*', '**', '***', '_', '__', '~~', '++']) {
  const text = marks + '{color:cyan|{big|Name}}' + marks;
  const tokens = tokenize(text, true);
  assert.equal(tokens.map(t => t.text).join(''), text);
  assert.equal(tokens[0].kind, 'emphasis');
  assert.ok(tokens.some(t => t.kind === 'macro' && t.text === '{color:cyan|'));
  assert.ok(tokens.some(t => t.kind === 'macro' && t.text === '{big|'));
  const layer = document.createElement('pre');
  highlight(layer, text, true);
  assert.equal(layer.textContent, text + '\n');
  assert.ok(layer.querySelector('.syntax-macro'));
}
const nested = tokenize('*Text {color:cyan|Name} [b]bold[/b] `literal`*', true);
for (const kind of ['emphasis', 'macro', 'literal']) assert.ok(nested.some(t => t.kind === kind));
assert.equal(tokenize('*Italic*', true)[0].kind, 'emphasis');
assert.equal(tokenize('- List item', true)[0].kind, 'marker');
assert.equal(tokenize('# Heading', true)[0].marker, 'heading');
assert.equal(tokenize('> Quote', true)[0].marker, 'quote');
assert.equal(tokenize('- List item', true)[0].marker, 'list');
for (const [marks, format] of Object.entries({'*':'italic', '_':'italic', '**':'bold', '__':'bold', '***':'bold-italic', '~~':'strike', '++':'underline'})) {
  const layer = document.createElement('pre');
  highlight(layer, marks + 'Text' + marks, true);
  assert.ok(layer.querySelector('.syntax-emphasis-' + format));
  assert.equal(layer.textContent, marks + 'Text' + marks + '\n');
}
const formats = tokenize('**Bold ~~strike~~ {color:cyan|macro}**', true);
assert.ok(formats.some(token => token.text === 'Bold ' && token.format === 'bold'));
assert.ok(formats.some(token => token.text === 'strike' && token.format === 'strike'));
assert.ok(formats.filter(token => token.kind === 'macro').every(token => !token.format));

const deep = ':::center\n:::color cyan\n*{color:cyan|{big|[b][i]Nested[/i][/b]}}*\n:::\n:::';
const deepTokens = tokenize(deep, true);
assert.equal(deepTokens.map(t => t.text).join(''), deep);
assert.equal(deepTokens.find(t => t.text === ':::center').kind, 'block');
for (const kind of ['block', 'macro']) {
  const containers = deepTokens.filter(t => t.kind === kind);
  assert.ok(containers.some(t => t.depth === 1), kind);
  assert.ok(containers.every(t => t.pair !== undefined && !t.unmatched), kind);
  for (const token of containers) {
    const partner = containers.find(other => other.start === token.partner);
    assert.equal(partner.depth, token.depth);
    assert.equal(partner.pair, token.pair);
  }
}
const deepLayer = document.createElement('pre');
highlight(deepLayer, deep, true);
assert.equal(deepLayer.querySelectorAll('.source-line-anchor').length, deep.split('\n').length);
for (const kind of ['block', 'macro']) {
  assert.ok(deepLayer.querySelector('.syntax-' + kind + '.syntax-depth-0'));
  assert.ok(deepLayer.querySelector('.syntax-' + kind + '.syntax-depth-1'));
}
for (const open of deepTokens.filter(t => t.partner > t.start)) {
  const pair = [...deepLayer.querySelectorAll('[data-pair]')].filter(span => span.dataset.pair === String(open.pair));
  assert.equal(pair.length, 2);
  assert.ok(pair.every(span => span.classList.contains('syntax-depth-' + open.depth % 5)));
}
context.FolioSyntax.markActive(deepLayer, deep.indexOf('{big|') + 2);
assert.equal(deep.slice(deepLayer.activeSyntaxRange.start, deepLayer.activeSyntaxRange.end), '{big|[b][i]Nested[/i][/b]}');
context.FolioSyntax.markActive(deepLayer, deep.indexOf('Nested') + 2);
assert.equal(deep.slice(deepLayer.activeSyntaxRange.start, deepLayer.activeSyntaxRange.end), '{big|[b][i]Nested[/i][/b]}');
assert.equal([...deepLayer.querySelectorAll('.syntax-active-delimiter')].map(s => s.textContent).join(''), '{big|}');
context.FolioSyntax.markActive(deepLayer, deep.length);
assert.equal(deepLayer.activeSyntaxRange, null);
assert.equal(deepLayer.querySelectorAll('.syntax-active-delimiter').length, 0);
context.FolioSyntax.markActive(deepLayer, deep.indexOf(':::color') + 5);
assert.equal(deep.slice(deepLayer.activeSyntaxRange.start, deepLayer.activeSyntaxRange.end), ':::color cyan\n*{color:cyan|{big|[b][i]Nested[/i][/b]}}*\n:::');
assert.equal(deepLayer.textContent, deep + '\n');
assert.ok(tokenize('[b][i]Crossed[/b][/i]', false).some(t => t.unmatched));
assert.ok(tokenize('{big|Unclosed', true).some(t => t.unmatched));
assert.ok(!tokenize('```\n{big|[b]\n```', true).some(t => t.unmatched));
for (const input of ['> > Nested', '>>Nested', '  >  >\t> Deep', '> Outer\n> > Inner\n> Outer again']) {
  const tokens = tokenize(input, true);
  assert.equal(tokens.map(token => token.text).join(''), input);
  const markers = tokens.filter(token => token.marker === 'quote');
  assert.equal(markers.length, (input.match(/>/g) || []).length);
  const layer = document.createElement('pre');
  highlight(layer, input, true);
  assert.equal(layer.querySelectorAll('.syntax-marker-quote').length, markers.length);
  assert.equal(layer.textContent, input+'\n');
}
const quoted = '> > # {color:cyan|**Title**}\n> > :::color purple\n> > text\n> > :::';
const quotedLayer = document.createElement('pre');
highlight(quotedLayer,quoted,true);
assert.equal(quotedLayer.querySelectorAll('.syntax-marker-quote').length,8);
assert.ok(quotedLayer.querySelector('.syntax-marker-heading'));
assert.ok(quotedLayer.querySelector('.syntax-emphasis-bold'));
assert.ok(quotedLayer.querySelector('.syntax-color-value[data-color="purple"]'));
assert.equal(quotedLayer.textContent,quoted+'\n');
for (const literal of ['`> > literal`', '[noparse]> > literal[/noparse]', '```\n> > literal\n```', '\\> > literal', 'text > > comparison']) {
  assert.ok(!tokenize(literal,true).some(token=>token.marker==='quote'),literal);
}
assert.ok(!tokenize('> > plain BBCode',false).some(token=>token.marker==='quote'));
console.log('Nested quote highlighting checks passed');
