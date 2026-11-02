const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync('src/app.js', 'utf8');
const source = {value: '', selectionStart: 0, selectionEnd: 0};
const data = {mixed: true};
let selection;
const context = vm.createContext({source, data, URL, replaceRange(text, start=source.selectionStart, end=source.selectionEnd, from=start+text.length, to=from) {
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
for(const mixed of [true,false]){
 for(const preferLiterals of [true,false]){
  data.mixed=mixed;data.preferLiterals=preferLiterals;
  reset('before selected after');source.selectionStart=7;source.selectionEnd=15;
  context.insertUnicodeSymbol('◆😀');
  const expected=mixed&&!preferLiterals?'&#x25C6;&#x1F600;':'◆😀';
  assert.equal(source.value,'before '+expected+' after');
  assert.deepEqual(selection,[7+expected.length,7+expected.length]);
  if(mixed)assert.equal(context.markdownToBB(source.value),'before ◆😀 after');
 }
}
console.log('Mode-aware toolbar checks passed');

// The color shortcut is editor-only and leaves modified variants and the previous Space shortcut alone.
let keyHandler,colorCalls=0;
const shortcutDocument={activeElement:source,addEventListener(type,handler){keyHandler=handler}};
const shortcutContext=vm.createContext({source,document:shortcutDocument,wrapInline:tag=>{assert.equal(tag,'b')},openQuickColor:()=>{colorCalls++}});
vm.runInContext(app.slice(app.indexOf("document.addEventListener('keydown',e=>{"),app.indexOf("source.addEventListener('dragover'")),shortcutContext);
function colorKey(overrides={}){
 let prevented=false;
 keyHandler({key:'B',code:'KeyB',ctrlKey:true,shiftKey:true,altKey:false,metaKey:false,isComposing:false,preventDefault(){prevented=true},...overrides});
 return prevented;
}
assert.equal(colorKey(),true);assert.equal(colorCalls,1);
assert.equal(colorKey({key:' ',code:'Space'}),false);
assert.equal(colorKey({shiftKey:false}),true);
assert.equal(colorKey({ctrlKey:false}),false);
assert.equal(colorKey({altKey:true}),false);
assert.equal(colorKey({isComposing:true}),true);
shortcutDocument.activeElement={};assert.equal(colorKey(),false);assert.equal(colorCalls,1);
console.log('Color shortcut routing checks passed');

data.mixed=true;
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

for(const mixed of [true,false]){
 data.mixed=mixed;
 for(const type of ['inlineimg','image']){
  reset();context.insertTag(type);
  assert.ok(!source.value.endsWith('\n'), 'Image insertion must not add source newlines');
  const image=source.value;
  reset('after');source.selectionEnd=0;context.insertTag(type);
  assert.equal(source.value,image+'after','Following source text is unchanged');
 }
}
const {parseHTML}=require('linkedom');
const {document:pickerDocument,window:pickerWindow}=parseHTML('<html><body></body></html>');
let pickerApplied=[],restoredSelection;
const pickerSource={selectionStart:3,selectionEnd:8,selectionDirection:'backward',focus(){},setSelectionRange(...args){restoredSelection=args},addEventListener(){}};
const pickerContext=vm.createContext({document:pickerDocument,window:pickerWindow,source:pickerSource,diagnosticHover:null,wrapColor:name=>pickerApplied.push(name)});
vm.runInContext(app.slice(app.indexOf('const quickColorKeys='),app.indexOf('const fontPalette=')),pickerContext);
vm.runInContext('positionQuickColor=()=>{}',pickerContext);
const popup=pickerDocument.querySelector('.quick-color-picker');
function pickerKey(key,extra={}){
 const event=new pickerWindow.Event('keydown',{bubbles:true,cancelable:true});Object.assign(event,{key,...extra});popup.dispatchEvent(event);return event.defaultPrevented;
}
pickerContext.openQuickColor();assert.equal(popup.hidden,false);assert.equal(pickerApplied.length,0);
assert.equal(pickerKey('g'),true);assert.deepEqual(pickerApplied,['green']);assert.deepEqual(restoredSelection,[3,8,'backward']);assert.equal(popup.hidden,true);
pickerContext.openQuickColor();pickerKey('Escape');assert.equal(pickerApplied.length,1);assert.equal(popup.hidden,true);
for(const button of popup.querySelectorAll('button')){
 pickerContext.openQuickColor();const key=button.textContent[0].toLowerCase();pickerKey(key);assert.equal(popup.hidden,true);
}
assert.equal(new Set(pickerApplied.slice(1)).size,12);
pickerContext.openQuickColor();pickerKey('b',{repeat:true});assert.equal(popup.hidden,false);pickerContext.closeQuickColor(true);
pickerContext.openQuickColor();popup.querySelector('button').click();assert.equal(pickerApplied.at(-1),'red');assert.equal(popup.hidden,true);
console.log('Quick color picker immediate choices, cancellation and selection preservation passed');
context.colorSafe=()=>true;
vm.runInContext(app.slice(app.indexOf('function wrapColor('),app.indexOf('colorNames.forEach(name=>')),context);
for(const mixed of [true,false]){
 data.mixed=mixed;reset('selected');context.wrapColor('green');
 assert.equal(source.value,mixed?'{color:green|selected}':'[color=green]selected[/color]');
 assert.equal(source.value.slice(...selection),'selected');
 reset();context.wrapColor('cyan');assert.equal(source.value.slice(...selection),'your text');
 reset('First\nSecond');context.wrapColor('red');
 assert.equal(source.value,mixed?':::color red\nFirst\nSecond\n:::':'[color=red]First\nSecond[/color]');
}
console.log('Quick color insertion syntax and placeholder checks passed');
