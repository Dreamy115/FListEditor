const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('src/app.js','utf8'),context=vm.createContext({URL});
vm.runInContext(app.slice(app.indexOf('const macroInlineNames='),app.indexOf('function renderBB(')),context);
const compile=text=>context.markdownToBB(text),decode=text=>context.bbcodeToMarkdown(text);
for(const input of ['&#x25C6;','&#X25c6;','&#9670;'])assert.equal(compile(input),'\u25c6');
assert.equal(decode('\u25c6'),'\u25c6');
assert.equal(compile('&#x1F600;'),'\u{1f600}');
for(const input of ['A \u25c6 B','[b]\u2605[/b]','\u{1f600} \u2192','literal &#x25C6; text','literal &#9670;'])assert.equal(compile(decode(input)),input,input);
assert.equal(compile('**&#x25C6;**'),'[b]\u25c6[/b]');
assert.equal(compile('{color:purple|&#x25C6;}'),'[color=purple]\u25c6[/color]');
assert.equal(compile('&#123;b|Text&#125;'),'{b|Text}');
assert.equal(compile('&#42;&#42;text&#42;&#42;'),'**text**');
assert.equal(compile('&#x26;#x25C6;'),'&#x25C6;');
assert.equal(compile('`&#x25C6;`'),'[noparse]&#x25C6;[/noparse]');
assert.equal(compile('```\n&#x25C6;\n```'),'[noparse]&#x25C6;[/noparse]');
assert.equal(compile('{noparse|&#x25C6;}'),'[noparse]&#x25C6;[/noparse]');
for(const input of ['&#xD800;','&#x110000;','&#0;','&#10;','&#x7F;','&#xZZ;','&#x25C6'])assert.equal(compile(input),input);
console.log('Numeric character reference compilation and decompilation checks passed');

for(const [reference,value] of [['&mdash;','\u2014'],['&eacute;','\u00e9'],['&copy;','\u00a9'],['&NotEqualTilde;','\u2242\u0338'],['&Aopf;','\u{1d538}'],['&amp;','&'],['&lt;','<'],['&quot;','"'],['&nbsp;','\u00a0']]){
 assert.equal(compile(reference),value,reference);
 assert.equal(compile(decode(value)),value,reference+' round trip');
}
assert.equal(decode('\u2014'),'\u2014');
assert.equal(decode('\u00e9'),'\u00e9');
assert.equal(decode('\u{1d538}'),'{font:doublestruck|A}');
assert.equal(decode('literal &mdash;'),'literal &#x26;mdash;');
for(const text of ['literal &mdash;','literal &NotEqualTilde;','literal &amp;mdash;','&madeup;','*x*','{b|literal}'])assert.equal(compile(decode(text)),text,text);
assert.equal(compile('&amp;mdash;'),'&mdash;');
assert.equal(compile('&lbrace;b|Text&rbrace;'),'{b|Text}');
assert.equal(compile('`&mdash;`'),'[noparse]&mdash;[/noparse]');
assert.equal(compile('{noparse|&mdash;}'),'[noparse]&mdash;[/noparse]');
vm.runInContext('for(const [name,value] of Object.entries(namedCharacterReferences)){const expected=value.includes("[")||value.includes("]")?literalBBCode(value):value;if(markdownToBB("&"+name+";")!==expected)throw Error(name)}',context);
console.log('All HTML5 named references and readable decompilation checks passed');

vm.runInContext(fs.readFileSync('src/syntax.js','utf8'),context);
const convert=(text,literals)=>context.convertEntityPreference(text,literals);
assert.equal(convert('&mdash; &#x25C6; &eacute;',true),'\u2014 \u25c6 \u00e9');
assert.equal(convert('\u2014 \u25c6 \u00e9',false),'&#x2014; &#x25C6; &#xE9;');
for(const text of ['**&mdash;** {color:purple|&#x25C6;}','&amp;mdash;','&#123;b|Text&#125;','&#91;b&#93;','{font:smallcaps|your text}','`&mdash; \u25c6`','```\n&mdash; \u25c6\n```','[Label](https://example.com/?q=&amp;)','{noparse|&mdash;}']){
 for(const preference of [true,false])assert.equal(compile(convert(text,preference)),compile(text),text);
}
assert.equal(convert('`&mdash;`',true),'`&mdash;`');
assert.equal(convert('{font:bold|Text}',false),'{font:bold|Text}');
const tokens=context.FolioSyntax.tokenize('**&mdash;** {color:purple|&#x25C6;} `&copy;`',true);
assert.equal(tokens.filter(token=>token.kind==='entity').length,2);
assert.ok(!context.FolioSyntax.tokenize('&mdash;',false).some(token=>token.kind==='entity'));
console.log('Entity preference conversion and syntax token checks passed');

// Simulate the browser scrolling to the caret after a source replacement.
const scrollSource={value:'before',selectionStart:3,selectionEnd:3,scrollTop:400,scrollLeft:25};
let toggleHandler,animationFrame,syncCount=0;
const toggleContext=vm.createContext({source:scrollSource,data:{mixed:true},$:()=>({addEventListener:(type,fn)=>{toggleHandler=fn}}),
 convertEntityPreference:()=> 'after',replaceRange:text=>{scrollSource.value=text;scrollSource.scrollTop=0;scrollSource.scrollLeft=0},
 rememberSelection:()=>{},commitEdit:()=>{},refresh:()=>{},persist:()=>{},syncHighlightScroll:()=>{syncCount++},requestAnimationFrame:fn=>{animationFrame=fn}});
vm.runInContext(app.slice(app.indexOf("$('preferLiterals').addEventListener('change'"),app.indexOf('function switchMode(')),toggleContext);
toggleHandler({target:{checked:false}});
assert.equal(scrollSource.scrollTop,400);assert.equal(scrollSource.scrollLeft,25);
scrollSource.scrollTop=0;scrollSource.scrollLeft=0;animationFrame();
assert.equal(scrollSource.scrollTop,400);assert.equal(scrollSource.scrollLeft,25);assert.equal(syncCount,2);
console.log('Entity toggle preserves scroll immediately and after caret reveal');
