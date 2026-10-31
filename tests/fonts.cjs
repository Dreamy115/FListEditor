const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('src/app.js','utf8');
const source={value:'',selectionStart:0,selectionEnd:0},data={mixed:true};
const context=vm.createContext({URL,source,data,replaceRange(text,start,end){source.value=source.value.slice(0,start)+text+source.value.slice(end)}});
vm.runInContext(app.slice(app.indexOf('const macroInlineNames='),app.indexOf('function renderBB(')),context);
vm.runInContext(app.slice(app.indexOf('function wrapFont('),app.indexOf('for(const [name,style] of Object.entries(fontStyles)){')),context);
assert.equal(context.markdownToBB('{font:smallcaps|ABCDabcd}'),'ABCDᴀʙᴄᴅ');
assert.equal(context.bbcodeToMarkdown('ABCDᴀʙᴄᴅ'),'{font:smallcaps|ABCDabcd}');
for(const name of ['smallcaps','bold','doublestruck','italic','bolditalic','sans','sansbold','fraktur','monospace','fullwidth']){
 for(const body of ['ABCDabcd 123','Hello, world!','**Hello** {color:purple|world}','{link:https://example.com|Link} Text','x X é 😀']){
  const input='{font:'+name+'|'+body+'}',output=context.markdownToBB(input);
  assert.equal(context.markdownToBB(context.bbcodeToMarkdown(output)),output,input);
 }
 source.value='Abcd';source.selectionStart=0;source.selectionEnd=4;data.mixed=true;context.wrapFont(name);
 assert.equal(source.value,'{font:'+name+'|Abcd}');
 source.value='Abcd';source.selectionStart=0;source.selectionEnd=4;data.mixed=false;context.wrapFont(name);
 assert.equal(source.value,context.markdownToBB('{font:'+name+'|Abcd}'));
}
assert.equal(context.markdownToBB('{font:smallcaps|**abcd**}'),'[b]ᴀʙᴄᴅ[/b]');
assert.equal(context.markdownToBB('{font:bold|{link:https://example.com|Link}}'),'[url=https://example.com]Link[/url]');
assert.equal(context.markdownToBB('`{font:bold|literal}`'),'[noparse]{font:bold|literal}[/noparse]');
const issues=[];context.markdownToBB('{font:unknown|text}',issues);assert.ok(issues.some(issue=>issue.includes('Invalid inline macro')));
const html=fs.readFileSync('index.html','utf8');assert.match(html,/id="fontBtn"/);assert.match(html,/id="fontPalette"/);
console.log('Unicode font compilation, decompilation and toolbar checks passed');

// Ordinary adjacent characters must never be swept into a font macro.
for(const input of ['prefix\u1d00suffix','ABCD\u1d00\u0299\u1d04\u1d05','lower\u1d00UPPER','x\u1d00x','caf\u00e9\u1d00tail','[b]prefix\u1d00suffix[/b]']){
 const markdown=context.bbcodeToMarkdown(input);
 assert.equal(context.markdownToBB(markdown),input,input);
 assert.ok(!markdown.includes('{font:smallcaps|prefix'),markdown);
 assert.ok(!markdown.includes('suffix}'),markdown);
}
assert.equal(context.bbcodeToMarkdown('prefix\u1d00suffix'),'prefi{font:smallcaps|xa}suffix');
assert.equal(context.bbcodeToMarkdown('x\u1d00x'),'{font:smallcaps|xax}');
console.log('Mixed plain and styled character preservation checks passed');

assert.equal(context.markdownToBB('{font:doublestruck|Lucas}'),'\u{1d543}\u{1d566}\u{1d554}\u{1d552}\u{1d564}');
assert.equal(context.bbcodeToMarkdown('\u{1d543}\u{1d566}\u{1d554}\u{1d552}\u{1d564}'),'{font:doublestruck|Lucas}');
assert.equal(context.markdownToBB('{font:doublestruck|CHNPQRZ}'),'\u2102\u210d\u2115\u2119\u211a\u211d\u2124');

// Every supported character must survive decoding and re-encoding exactly.
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
for(const name of ['smallcaps','bold','doublestruck','italic','bolditalic','sans','sansbold','fraktur','monospace','fullwidth']){
 const styled=context.applyFont(alphabet,name);
 assert.equal([...styled].length,62,name);
 assert.equal(context.markdownToBB(context.bbcodeToMarkdown(styled)),styled,name);
 for(const [index,char] of [...styled].entries()){
  const original=alphabet[index];
  if(char===original)continue;
  const input='plain'+char+'text 123!?';
  assert.equal(context.bbcodeToMarkdown(input),'plain{font:'+name+'|'+original+'}text 123!?',name+' '+original);
  assert.equal(context.markdownToBB(context.bbcodeToMarkdown(input)),input);
 }
 const literal='[noparse]'+styled+'[/noparse]';
 const decoded=context.bbcodeToMarkdown(literal);
 assert.ok(!decoded.includes('{font:'),name+' literal');
 assert.equal(context.markdownToBB(decoded),literal);
}
assert.equal(context.markdownToBB('{font:italic|h}'),'\u210e');
assert.equal(context.markdownToBB('{font:fraktur|CHIRZ}'),'\u212d\u210c\u2111\u211c\u2128');
console.log('All Unicode alphabets and literal preservation checks passed');

for(const name of ['smallcaps','bold','doublestruck','italic','bolditalic','sans','sansbold','fraktur','monospace','fullwidth']){
 const a=context.applyFont('a',name),b=context.applyFont('b',name);
 for(const space of [' ','  ','\t',' \t ']){
  const input='plain'+a+space+b+'tail';
  assert.equal(context.bbcodeToMarkdown(input),'plain{font:'+name+'|a'+space+'b}tail');
  assert.equal(context.markdownToBB(context.bbcodeToMarkdown(input)),input);
 }
 assert.equal(context.bbcodeToMarkdown(a+' plain '+b),'{font:'+name+'|a} plain{font:'+name+'| b}');
 assert.equal(context.bbcodeToMarkdown(a+'\n'+b),':::font '+name+'\na\nb\n:::');
}
assert.equal(context.bbcodeToMarkdown(context.applyFont('a','bold')+' '+context.applyFont('b','italic')),'{font:bold|a} {font:italic|b}');
console.log('Same-font spacing and plain-text boundary checks passed');

const smallText='\u028f\u1d0f\u1d1c\u0280 \u1d1b\u1d07x\u1d1b';
assert.equal(context.bbcodeToMarkdown(smallText),'{font:smallcaps|your text}');
for(const [name,bridge] of [['smallcaps','x'],['smallcaps',' X 123!? '],['italic',' 123!? '],['fraktur',' 123!? '],['bold',' !? ']]){
 const input='plain'+context.applyFont('a',name)+bridge+context.applyFont('b',name)+'tail';
 assert.equal(context.bbcodeToMarkdown(input),'plain{font:'+name+'|a'+bridge+'b}tail');
 assert.equal(context.markdownToBB(context.bbcodeToMarkdown(input)),input);
}
// A character that this font would change must remain outside the macro.
assert.equal(context.bbcodeToMarkdown('\u1d00y\u0299'),'{font:smallcaps|a}y{font:smallcaps|b}');
assert.equal(context.bbcodeToMarkdown('x\u1d00x'),'{font:smallcaps|xax}');
assert.equal(context.bbcodeToMarkdown('\u1d00x\u{1d41b}'),'{font:smallcaps|ax}{font:bold|b}');
console.log('Unchanged character bridges preserve output and macro boundaries');

for(const name of ['smallcaps','bold','doublestruck','italic','bolditalic','sans','sansbold','fraktur','monospace','fullwidth']){
 const input=':::font '+name+'\nfirst line\nsecond line\n:::';
 const compiled=context.markdownToBB(input);
 assert.equal(compiled,context.applyFont('first line\nsecond line',name));
 assert.equal(context.bbcodeToMarkdown(compiled),input);
 source.value='first line\nsecond line';source.selectionStart=0;source.selectionEnd=source.value.length;data.mixed=true;
 context.wrapFont(name);assert.equal(source.value,input);
}
assert.equal(context.markdownToBB('Before\n:::font bold\n**first**\n\nsecond\n:::\nAfter'),'Before'+context.applyFont('[b]first[/b]\n\nsecond','bold')+'After');
console.log('Multiline font blocks, toolbar insertion and decompilation checks passed');

const height='H\u1d07\u026a\u0262\u029c\u1d1b \u25ba';
assert.equal(context.bbcodeToMarkdown('[b]'+height+'[/b]'),'**{font:smallcaps|Height} \u25ba**');
assert.equal(context.markdownToBB(context.bbcodeToMarkdown('[b]'+height+'[/b]')),'[b]'+height+'[/b]');
assert.equal(context.bbcodeToMarkdown('H\n\u1d07'),'H\n{font:smallcaps|e}');
assert.equal(context.bbcodeToMarkdown('\u1d07\nH'),'{font:smallcaps|e}\nH');
console.log('Greedy same-line unchanged font characters preserve exact Unicode');

const notes='[b]N\u1d0f\u1d1b\u1d07\ua731 \u25ba[/b]';
assert.equal(context.bbcodeToMarkdown(notes),'**{font:smallcaps|Notes} \u25ba**');
assert.equal(context.markdownToBB(context.bbcodeToMarkdown(notes)),notes);
assert.equal(context.bbcodeToMarkdown('\u1d00 \u25ba '),'{font:smallcaps|a} \u25ba ');
assert.equal(context.bbcodeToMarkdown('\u1d00 \u25ba \u0299'),'{font:smallcaps|a \u25ba b}');
console.log('Trailing font symbols and spaces stay outside recovered macros');
