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
assert.deepEqual(warnings(context.markdownToBB('**Good** [table]Bad[/table]')), ['[table] is not supported by F-List profiles']);
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
  assert.equal(colorWarnings(`[color=${color}]text[/color]`).length, 1);
  assert.equal(colorWarnings(`{color:${color}|text}`).length, 1);
  assert.equal(colorWarnings(`:::color ${color}\ntext\n:::`).length, 1);
}
assert.match(colorWarnings('[color=#ff0000]text[/color]')[0], /exported as red/);
assert.match(colorWarnings('[color]text[/color]')[0], /missing value/);
assert.match(warnings('[color=teal]text[/color]')[0], /not supported/);
assert.deepEqual(colorWarnings('[noparse][color=teal][/noparse]'), []);
assert.deepEqual(colorWarnings('`{color:teal|example}`'), []);
assert.deepEqual(colorWarnings('```\n[color=teal]example[/color]\n```'), []);
assert.deepEqual(colorWarnings('```\n[color=teal]example'), []);
assert.equal(colorWarnings('`[color=teal]`', false).length, 1);
assert.deepEqual(colorWarnings('{color:teal|plain text}', false), []);
assert.equal(colorWarnings('[color=teal]a[/color][color=teal]b[/color]').length, 1);
console.log('Unsupported color warning checks passed');
const macroWarnings = text => Array.from(context.macroWarnings(text));
for (const input of ['{typo|text}', '{b}', '{link:javascript:alert(1)|click}', '{img:invalid}', '{user:Name|unexpected}', '{b|{typo|nested}}', ':::typo\ntext\n:::', ':::center unexpected\ntext', ':::bad-name\ntext', ':::']) {
  assert.ok(macroWarnings(input).length > 0, input);
}
assert.match(macroWarnings('{b|unfinished')[0], /Unclosed inline macro/);
assert.match(macroWarnings(':::center\ntext')[0], /Unclosed block macro/);
for (const input of ['{b|bold}', '{b|{i|nested}}', '{link:https://example.com|link}', '{img:123|label}', '{user:Name}', '{br}', '{hr}', ':::center\ntext\n:::', '`{typo|literal}`', '```\n{typo|literal}\n:::bad\n```', '[noparse]{typo|literal}[/noparse]', '{noparse|{typo|literal}}', '\\{typo|literal\\}']) {
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
located = locate('# Heading\n\n[table]bad[/table]');
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
assert.deepEqual(locate('[noparse]\n:::bad\n:::\n[/noparse]'), []);
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
  assert.equal(diagnostics.length,1);
  assert.equal(diagnostics[0].line,4);
  assert.match(diagnostics[0].message,/Malformed block macro closing marker/);
}
