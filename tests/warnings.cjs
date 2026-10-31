const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');
const source = fs.readFileSync('src/app.js', 'utf8');
const {document} = parseHTML(fs.readFileSync('index.html', 'utf8'));
const context = vm.createContext({URL, document, $: id => document.getElementById(id)});
vm.runInContext(source.slice(source.indexOf('const macroInlineNames='), source.indexOf('function renderBB(')), context);
vm.runInContext(source.slice(source.indexOf('function countWarnings('), source.indexOf('function refresh(')), context);
const warnings = input => Array.from(context.countWarnings(input));
assert.deepEqual(warnings('[b]Valid[/b][hr][img=123]Label[/img]'), []);
for (const tag of ['list','li','size','font','spoiler','table','tr','td','session','youtube','code','custom-tag','h1','*']) {
  assert.deepEqual(warnings(`[${tag}]text[/${tag}]`), [`[${tag}] is not supported by F-List profiles`]);
}
assert.deepEqual(warnings('[noparse][table]<div>[b][/noparse]'), []);
assert.deepEqual(warnings('[NOPARSE][size=20]literal[/NOPARSE][B]ok[/B]'), []);
assert.match(warnings('[b][i]text[/b][/i]')[0], /Misnested/);
assert.deepEqual(warnings('[b]text[/i]'), ['Unmatched [/i]', 'Unclosed [b]']);
assert.deepEqual(warnings('[noparse][table]'), ['Unclosed [noparse]']);
assert.deepEqual(warnings('::: literal [CUSTOM]text[/CUSTOM]'), ['[custom] is not supported by F-List profiles']);
assert.deepEqual(warnings(context.markdownToBB('**Good** [table]Bad[/table]')), []);
assert.deepEqual(warnings(context.markdownToBB('`[table]literal[/table]`')), []);
context.updateWarnings(['[table] is not supported by F-List profiles']);
assert.ok(document.getElementById('warningDetails').classList.contains('has-issues'));
assert.match(document.getElementById('warningCount').textContent, /1 potential issue/);
assert.equal(document.querySelector('#warningList li').textContent, '[table] is not supported by F-List profiles');
context.updateWarnings([]);
assert.equal(document.getElementById('warningCount').textContent, 'No obvious issues');
assert.ok(!document.getElementById('warningDetails').classList.contains('has-issues'));
assert.equal(document.querySelectorAll('#warningList li').length, 0);
console.log('Compiler warning checks passed');
const colorWarnings = (text, mixed = true) => Array.from(context.colorWarnings(text, mixed));
for (const color of ['red','orange','yellow','green','cyan','purple','blue','pink','black','brown','white','gray']) {
  assert.deepEqual(colorWarnings(`[color=${color}]text[/color] {color:${color}|text}\n:::color ${color}\ntext\n:::`), []);
}
for (const color of ['rebeccapurple', '#ff0000', 'rgb(255, 0, 0)', 'var(--color)', '']) {
  assert.equal(colorWarnings(`[color=${color}]text[/color]`, false).length, 1);
  assert.equal(colorWarnings(`{color:${color}|text}`).length, 1);
  assert.equal(colorWarnings(`:::color ${color}\ntext\n:::`).length, 1);
}
assert.match(colorWarnings('[color=#ff0000]text[/color]', false)[0], /exported as red/);
assert.match(colorWarnings('[color]text[/color]', false)[0], /missing value/);
assert.match(warnings('[color=teal]text[/color]')[0], /not supported/);
assert.deepEqual(colorWarnings('[noparse][color=teal][/noparse]'), []);
assert.deepEqual(colorWarnings('`{color:teal|example}`'), []);
assert.deepEqual(colorWarnings('```\n[color=teal]example[/color]\n```'), []);
assert.deepEqual(colorWarnings('```\n[color=teal]example'), []);
assert.equal(colorWarnings('`[color=teal]`', false).length, 1);
assert.deepEqual(colorWarnings('{color:teal|plain text}', false), []);
assert.equal(colorWarnings('[color=teal]a[/color][color=teal]b[/color]', false).length, 1);
console.log('Unsupported color warning checks passed');
const macroWarnings = text => Array.from(context.macroWarnings(text));
for (const input of ['{typo|text}', '{b}', '{link:javascript:alert(1)|click}', '{img:invalid}', '{user:Name|unexpected}', '{b|{typo|nested}}', ':::typo\ntext\n:::', ':::center unexpected\ntext', ':::bad-name\ntext', ':::']) {
  assert.ok(macroWarnings(input).length > 0, input);
}
assert.match(macroWarnings('{b|unfinished')[0], /Unclosed inline macro/);
assert.match(macroWarnings(':::center\ntext')[0], /Unclosed block macro/);
for (const input of ['{b|bold}', '{b|{i|nested}}', '{link:https://example.com|link}', '{img:123|label}', '{user:Name}', '{br}', '{hr}', ':::center\ntext\n:::', '`{typo|literal}`', '```\n{typo|literal}\n:::bad\n```', '{noparse|{typo|literal}}', '\\{typo|literal\\}']) {
  assert.deepEqual(macroWarnings(input), [], input);
}
const invalidMacro = '{link:invalid|text}';
assert.equal(context.markdownToBB(invalidMacro), invalidMacro);
console.log('Invalid macro warning checks passed');
const locate = (text, mixed = true) => Array.from(context.locatedWarnings(text, mixed, context.normalizeColorTags(mixed ? context.markdownToBB(text) : text)));
let located = locate('Good\n{typo|bad}\n\n{typo|bad}');
assert.deepEqual(located.map(item => item.line), [2,4]);
assert.equal(located[0].start, 5);
assert.equal(located[0].end, 15);
located = locate('Good\n[color=teal]bad[/color]', false);
assert.equal(located[0].line, 2);
assert.equal(located[0].start, 5);
assert.deepEqual(locate('# Heading\n\n[table]bad[/table]'), []);
located = locate('# Heading\n\n[table]bad[/table]', false);
assert.equal(located[0].line, 3);
assert.equal(located[0].start, 11);
assert.deepEqual(locate('`{typo|bad}`\n[noparse][table][/noparse]'), []);
located = locate('Hello\n:::center\ntext');
assert.equal(located[0].line, 2);
context.updateWarnings(located);
assert.match(document.querySelector('#warningList button').textContent, /^Line 2:/);
console.log('Warning source location checks passed');
let focused = false, selection = null, synced = false, activeUpdated = false;
context.source = {focus(){focused=true},setSelectionRange(start,end){selection=[start,end]},clientHeight:100,scrollTop:0};
context.syncHighlightScroll = () => {synced=true};
context.updateActiveSyntax = () => {activeUpdated=true};
document.querySelector('#warningList button').click();
assert.equal(focused, true);
assert.deepEqual(selection, [located[0].start, located[0].end]);
assert.equal(synced, true);
assert.equal(activeUpdated, true);
assert.equal(document.getElementById('warningDetails').open, false);
console.log('Warning navigation checks passed');
// A malformed opener owns its intended closing marker during error recovery.
for (const opener of [':::center unexpected', ':::typo', '::::center', '::center', '::: center']) {
  const input = ':::center\n:::color red\n'+opener+'\ntext\n:::\n:::\n:::';
  const issues = locate(input);
  assert.equal(issues.length, 1, opener);
  assert.equal(issues[0].line, 3, opener);
  assert.equal(input.slice(issues[0].start,issues[0].end), opener);
  assert.ok(!issues[0].message.startsWith('Unmatched'), opener);
}
let issues = locate(':::center\ntext\n:::\n:::');
assert.equal(issues.length, 1);
assert.equal(issues[0].line, 4);
assert.match(issues[0].message, /Unmatched block/);
issues = locate(':::center\n:::right unexpected\n:::');
assert.match(issues[0].message, /does not accept an argument/);
assert.equal(issues[0].line, 2); // Root input error precedes the outer unclosed block.
assert.match(issues[1].message, /Unclosed block/);
assert.deepEqual(locate('```\n:::bad\n:::\n```'), []);
assert.ok(locate('[noparse]\n:::bad\n:::\n[/noparse]').length>0);
assert.deepEqual(locate(':::collapse Title\n:::center\ntext\n:::\n:::'), []);
// The editor and footer consume the same source ranges, including plain text.
vm.runInContext(fs.readFileSync('src/syntax.js','utf8'), context);
const layer = document.createElement('pre');
const nested = ':::center\n:::right bad\ntext\n:::\n:::';
issues = locate(nested);
context.FolioSyntax.highlight(layer,nested,true,issues);
assert.equal(layer.textContent,nested+'\n');
assert.deepEqual([...layer.querySelectorAll('.syntax-warning')].map(span=>span.textContent), [':::right bad']);
assert.equal(layer.querySelectorAll('.syntax-unmatched').length,0);
assert.equal(layer.querySelectorAll('.source-line-anchor').length,nested.split('\n').length);
const plain = 'before a bad value after';
context.FolioSyntax.highlight(layer,plain,true,[{start:9,end:12,message:'Example diagnostic'}]);
assert.equal(layer.querySelector('.syntax-warning').textContent,'bad');
assert.equal(layer.textContent,plain+'\n');
context.FolioSyntax.highlight(layer,plain,true,[]);
assert.equal(layer.querySelectorAll('.syntax-warning').length,0);
const css = fs.readFileSync('src/styles.css','utf8');
assert.match(css, /button:hover[^}]*text-decoration:none/);
assert.match(css, /\.syntax-warning\{[^}]*text-decoration-style:wavy/);
console.log('Root-cause diagnostics and editor squiggle checks passed');
for (const closing of ['::','::::']) {
  const input=':::center\n:::right\ntext\n'+closing+'\n:::';
  const diagnostics=locate(input);
  assert.equal(diagnostics.length,2);
  const malformed=diagnostics.find(issue=>issue.message.includes('Malformed block macro closing marker'));
  assert.equal(malformed.line,4);
  assert.ok(diagnostics.some(issue=>issue.message.startsWith('Nested text alignment:')));
}

for(const input of ['![Portrait](https://example.com/image.png)', '{img:https://example.com/image.png}', '{image:https://example.com/image.png}']){
 const compiled=context.markdownToBB(input);
 assert.ok(warnings(compiled).some(message=>message.startsWith('External image URLs ')),input);
 const located=Array.from(context.locatedWarnings('Intro\n'+input,true,context.markdownToBB('Intro\n'+input)));
 const issue=located.find(issue=>issue.message.startsWith('External image URLs '));
 assert.ok(issue,input);assert.equal(issue.line,2);assert.equal(issue.start,6);
}
assert.deepEqual(warnings('[noparse][img]https://example.com/image.png[/img][/noparse]'),[]);
assert.deepEqual(warnings(context.markdownToBB('`{img:https://example.com/image.png}`')),[]);
assert.ok(!source.includes("['Basics','Image from URL'"));
console.log('External image URL warning and source navigation checks passed');

for(const input of ['{font:smallcaps|outer {font:bold|inner}}','{font:bold|{color:purple|{font:monospace|inner}}}']){
 assert.ok(Array.from(context.macroWarnings(input)).some(message=>message.startsWith('Nested font macros')));
 const issue=Array.from(context.locatedWarnings('Intro\n'+input,true,context.markdownToBB('Intro\n'+input))).find(issue=>issue.message.startsWith('Nested font macros'));
 assert.ok(issue);assert.equal(issue.line,2);assert.ok(issue.start>6);
}
for(const input of ['{font:bold|First} {font:smallcaps|Second}','{color:purple|{font:bold|Text}}','`{font:bold|{font:smallcaps|literal}}`','{font:bold|{noparse|{font:smallcaps|literal}}}']){
 assert.ok(!Array.from(context.macroWarnings(input)).some(message=>message.startsWith('Nested font macros')),input);
}
console.log('Nested font macro warning checks passed');

for(const input of [':::font bold\n{font:italic|Nested}\n:::',':::font bold\n:::font italic\nNested\n:::\n:::'])assert.ok(locate(input).some(issue=>issue.message.startsWith('Nested font macros')),input);
assert.deepEqual(locate(':::font bold\nfirst\nsecond\n:::'),[]);
assert.ok(locate(':::font invalid\nText\n:::').some(issue=>issue.message.includes('supported font')));

const alignmentIssues=(text,mixed=true)=>Array.from(context.locatedWarnings(text,mixed,mixed?context.markdownToBB(text):text)).filter(issue=>issue.message.startsWith('Nested text alignment:'));
for(const outer of ['left','right','center','justify'])for(const inner of ['left','right','center','justify']){
 for(const [text,mixed,marker] of [
  [`{${outer}|before {${inner}|nested}}`,true,`{${inner}|`],
  [`:::${outer}\n:::b\n:::${inner}\nnested\n:::\n:::\n:::`,true,`:::${inner}`],
  [`:::${outer}\n{${inner}|nested}\n:::`,true,`{${inner}|`],
  [`[${outer}][b][${inner}]nested[/${inner}][/b][/${outer}]`,false,`[${inner}]`]
 ]){
  const issues=alignmentIssues(text,mixed);
  if(!mixed){assert.deepEqual(issues,[],text);assert.deepEqual(warnings(text),[],text);continue}
  assert.equal(issues.length,1,text);
  assert.ok(issues[0].message.includes(inner+' inside '+outer),text);
  assert.equal(text.slice(issues[0].start,issues[0].end),marker);
  assert.equal(issues[0].line,text.slice(0,issues[0].start).split('\n').length);
 }
}
for(const text of ['{center|first}{right|second}',':::center\nfirst\n:::\n:::right\nsecond\n:::','`{center|{right|example}}`','```\n:::center\n:::right\n```','{center|{noparse|{right|example}}}','[center][right]literal[/right][/center]'])assert.deepEqual(alignmentIssues(text),[],text);
assert.deepEqual(alignmentIssues('[noparse][center][right]literal[/right][/center][/noparse]',false),[]);
assert.deepEqual(alignmentIssues('[center]first[/center][right]second[/right]',false),[]);
assert.deepEqual(warnings('[center][right]nested[/right][/center]'),[]);
assert.ok(macroWarnings('{center|{right|nested}}').some(message=>message.startsWith('Nested text alignment:')));
console.log('Nested alignment warnings and source locations passed');
for(const name of ['left','right','center','justify']){
 const text=':::center\n:::'+name+' !\ntext\n:::\n:::';
 assert.deepEqual(locate(text),[],text);
 assert.equal(context.markdownToBB(text),'[center]['+name+']text[/'+name+'][/center]');
 assert.deepEqual(macroWarnings(text),[]);
}
assert.match(alignmentIssues(':::center\n:::right\ntext\n:::\n:::')[0].message,/innermost alignment takes precedence/);
assert.match(alignmentIssues(':::center\n:::right\ntext\n:::\n:::')[0].message,/:::right !/);
assert.equal(alignmentIssues(':::center\n:::right !\n{left|text}\n:::\n:::').length,1,'Suppression applies only to the marked opener');
assert.equal(alignmentIssues(':::center !\n:::right\ntext\n:::\n:::').length,1,'Outer bang does not suppress inner warnings');
assert.ok(locate(':::center\n:::right !!\ntext\n:::\n:::').some(issue=>issue.message.startsWith('Invalid block macro')));
for(const outer of ['left','right','center','justify'])for(const inner of ['left','right','center','justify']){
 for(const code of [
  `[${outer}]outer[${inner}]inner[/${inner}][/${outer}]`,
  `before[${outer}][b][${inner}]inner[/${inner}][/b][/${outer}]after`,
  `[${outer}][${inner}]inner[left]deep[/left][/${inner}][/${outer}]`
 ]){
  const markdown=context.bbcodeToMarkdown(code);
  assert.ok(markdown.includes(':::'+inner+' !')||markdown.includes('{'+inner+':!|'),markdown);
  assert.deepEqual(alignmentIssues(markdown),[],markdown);
  assert.equal(context.markdownToBB(markdown),code,'Suppression preserves BBCode output');
 }
}
assert.ok(!context.bbcodeToMarkdown('[right]text[/right]').includes('!'),'Top-level alignment needs no suppression');
assert.deepEqual(alignmentIssues('{center|{right:!|intentional}}'),[]);
