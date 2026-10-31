const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync('src/app.js', 'utf8');
const source = {value: '', selectionStart: 0, selectionEnd: 0};
const data = {mixed: true};
let selection;
const context = vm.createContext({source, data, URL, replaceRange(text, start, end, from, to) {
  source.value = source.value.slice(0, start) + text + source.value.slice(end);
  selection = [from, to];
}});
vm.runInContext(app.slice(app.indexOf('function wrapInline('), app.indexOf('function replaceRange(')), context);
vm.runInContext(app.slice(app.indexOf('const insertionSpecs='), app.indexOf("document.querySelectorAll('[data-insert]')")), context);
vm.runInContext(app.slice(app.indexOf('const macroInlineNames='), app.indexOf('function renderBB(')), context);
function reset(text = '') { source.value = text; source.selectionStart = 0; source.selectionEnd = text.length; }
for (const [tag, expected] of Object.entries({b:'**Text**',i:'*Text*',u:'++Text++',s:'~~Text~~',big:'{big|Text}',small:'{small|Text}',sup:'{sup|Text}',sub:'{sub|Text}',heading:'# Text',center:':::center\nText\n:::',quote:'> Text'})) {
  data.mixed = true; reset('Text'); context.wrapInline(tag);
  assert.equal(source.value, expected);
  assert.equal(source.value.slice(...selection), 'Text');
  assert.equal(context.markdownToBB(source.value), tag==='heading'?'[heading][big]Text[/big][/heading]':`[${tag}]Text[/${tag}]`);
  data.mixed = false; reset('Text'); context.wrapInline(tag);
  assert.equal(source.value, tag==='heading'?'[heading][big]Text[/big][/heading]':`[${tag}]Text[/${tag}]`);
}
for (const type of ['link','image','inlineimg','collapse','user','icon','eicon','noparse']) {
  data.mixed = true; reset(); context.insertTag(type);
  assert.ok(!/\[(?:url|img|collapse|user|icon|eicon|noparse)(?:=|\])/.test(source.value), type);
  const bbcode = context.markdownToBB(source.value);
  data.mixed = false; reset(); context.insertTag(type);
  // Collapse BBCode historically includes literal padding newlines.
  assert.equal(bbcode, type === 'collapse' ? '[collapse=More details]Write details here[/collapse]' : source.value, type);
}
data.mixed = true; reset('First\nSecond'); context.wrapInline('b');
assert.equal(context.markdownToBB(source.value), '[b]First\nSecond[/b]');
reset('image label'); context.insertTag('inlineimg');
assert.equal(source.value, '{img:12345|image label}');
reset('Line one\nLine two'); context.insertTag('noparse');
assert.equal(context.markdownToBB(source.value), '[noparse]Line one\nLine two[/noparse]');
reset('Beforeafter'); source.selectionStart = source.selectionEnd = 6; context.insertTag('collapse');
assert.equal(context.markdownToBB(source.value), 'Before[collapse=More details]Write details here[/collapse]after');
console.log('Mode-aware toolbar checks passed');

reset('First\n\nSecond');context.wrapInline('quote');
assert.equal(source.value,'> First\n> \n> Second');
assert.equal(context.markdownToBB(source.value),'[quote]First\n\nSecond[/quote]');
reset('Before selected after');source.selectionStart=7;source.selectionEnd=15;context.wrapInline('big');
assert.equal(source.value,'Before {big|selected} after');
reset('Line one\nLine two');context.wrapInline('heading');
assert.equal(context.markdownToBB(source.value),'[heading][big]Line one\nLine two[/big][/heading]');
reset('literal {macro}');context.insertTag('noparse');assert.equal(source.value,'`literal {macro}`');
reset('a `backtick`');context.insertTag('noparse');assert.equal(context.markdownToBB(source.value),'[noparse]a `backtick`[/noparse]');

for(const [tag,markdown,bbcode] of [
 ['heading2','## Text','[heading]Text[/heading]'],
 ['right',':::right\nText\n:::','[right]Text[/right]'],
 ['justify',':::justify\nText\n:::','[justify]Text[/justify]']
]){
 data.mixed=true;reset('Text');context.wrapInline(tag);assert.equal(source.value,markdown);assert.equal(context.markdownToBB(source.value),bbcode);
 data.mixed=false;reset('Text');context.wrapInline(tag);assert.equal(source.value,bbcode);
}
data.mixed=true;reset('First\nSecond');context.wrapInline('heading2');
assert.equal(context.markdownToBB(source.value),'[heading]First\nSecond[/heading]');
console.log('H2 and alignment toolbar checks passed');
