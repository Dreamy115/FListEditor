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
  assert.ok(layer.querySelector('.syntax-tag'));
}
assert.ok(tokenize(sample, true).some(t => t.kind === 'macro'));
assert.ok(!tokenize(sample, false).some(t => t.kind === 'macro'));
for (const literal of ['```\n**raw**\n{br}\n```', '[noparse][b]raw[/b]\n[/noparse]']) {
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
for (const kind of ['emphasis', 'macro', 'tag', 'literal']) assert.ok(nested.some(t => t.kind === kind));
assert.equal(tokenize('*Italic*', true)[0].kind, 'emphasis');
assert.equal(tokenize('- List item', true)[0].kind, 'marker');
