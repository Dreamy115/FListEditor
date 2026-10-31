const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Load the conversion functions without starting the browser UI.
const source = fs.readFileSync('src/app.js', 'utf8');
const context = vm.createContext({URL});
vm.runInContext(source.slice(source.indexOf('const macroInlineNames='), source.indexOf('function renderBB(')), context);
const compile = input => context.markdownToBB(input);
const cases = [
  ['nested macros', ':::center\n:::color purple\n**Name**\nSubtitle\n:::\n:::', '[center][color=purple][b]Name[/b]\nSubtitle[/color][/center]'],
  ['surrounding prose', 'Before\n:::center\nInside\n:::\nAfter', 'Before[center]Inside[/center]After'],
  ['intentional blanks', '\n:::center\n\nInside\n\n:::\n\nAfter\n', '[center]\nInside\n[/center]\nAfter\n'],
  ['adjacent blocks', ':::big\nOne\n:::\n:::small\nTwo\n:::', '[big]One[/big][small]Two[/small]'],
  ['fenced literal', '```\n**literal**\n\n  indented  \n```', '[noparse]**literal**\n\n  indented  [/noparse]'],
  ['raw literal', '[noparse]\n**literal**\n[/noparse]', '[noparse]\n**literal**\n[/noparse]'],
  ['content whitespace', '  First  \r\n\r\nSecond\r\n', '  First  \n\nSecond\n'],
  ['unclosed block', ':::center\nText', '[center]Text[/center]'],
  ['invalid color', ':::color nope\nText\n:::', 'Text'],
  ['empty block', ':::center\n:::', '[center][/center]'],
  ['unknown markers', ':::unknown\nText\n:::', ':::unknown\nText\n:::'],
];
for (const [name, input, expected] of cases) assert.equal(compile(input), expected, name);
console.log(`${cases.length} whitespace regression checks passed`);
const roundTrips = [
  '[center][color=gray][i]Profile and character are W.I.P\nMind the plot holes![/i][/color][/center][center][heading][color=white]◆ OOC Friendly | Post Length: Dynamic | Collaborative Writing ◆[/color][/heading][/center]\n[center][img=4645005]meanstoanend[/img][/center][hr][center][heading][color=cyan]SAW-03-61012[/color]\n[big]◆ 𝕃𝕦𝕔𝕒𝕤 ◆[/big][/heading][i][color=gray]Innocent at first glance.[/color][/i][heading][color=cyan]─────── FRIENDLY ───────[/color][/heading][color=white]First line.\nSecond line with [i]emphasis[/i].[/color]\n\n[i][color=gray]What does it mean to be good?[/color][/i][/center]\n\n[collapse=A Deeper Look]W.I.P[/collapse][hr]\n\n[img=4455307]notmyart[/img]\n[right][color=cyan]Horizon Color[/color][url=https://example.com/portrait.png]Horizon Portrait[/url][/right]',
  '[center]One[/center][center]Two[/center]',
  '[heading]Title[/heading]Text[hr]More',
  '  \n[center]\n\nText\n\n[/center]\n  ',
  '[color=white]\nText\n[/color]',
  '[noparse]\n**literal**\n\n[/noparse]',
  '[center]Literal *stars* and {macros}, plus [b]bold[/b].[/center]',
];
for (const bbcode of roundTrips) {
  assert.equal(compile(context.bbcodeToMarkdown(bbcode)), bbcode, 'BBCode round trip');
}
assert.equal(context.bbcodeToMarkdown('[center]Text[/center]'), ':::center\nText\n:::');
assert.match(context.bbcodeToMarkdown(roundTrips[0]), /:::center/);
assert.match(context.bbcodeToMarkdown(roundTrips[0]), /:::color white/);
assert.doesNotMatch(context.bbcodeToMarkdown(roundTrips[0]), /\[\/?(?:heading|img|hr)(?:=|\])/);
assert.match(context.bbcodeToMarkdown(roundTrips[0]), /:::heading/);
assert.match(context.bbcodeToMarkdown(roundTrips[0]), /\{img:4645005\|meanstoanend\}/);
assert.match(context.bbcodeToMarkdown(roundTrips[0]), /^---$/m);
assert.equal(compile('{img:4645005|meanstoanend}'), '[img=4645005]meanstoanend[/img]');
assert.equal(compile('{heading|{color:cyan|Title}}{hr}Text'), '[heading][color=cyan]Title[/color][/heading][hr]Text');
assert.equal(compile(':::heading\nFirst\nSecond\n:::'), '[heading]First\nSecond[/heading]');
assert.equal(compile('Hello \\\nworld\nNext'), 'Hello world\nNext');
assert.equal(compile('Hello{br}\\\nworld'), 'Hello\nworld');
assert.equal(compile('# Title\\\nBody'), '[heading][big]Title[/big][/heading]Body');
assert.equal(compile('One\\\r\nTwo'), 'OneTwo');
assert.equal(compile('Literal\\\\\nNext'), 'Literal\\\nNext');
assert.equal(compile('```\nLiteral\\\nNext\n```'), '[noparse]Literal\\\nNext[/noparse]');
console.log(`${roundTrips.length} exact BBCode round trips passed`);

assert.doesNotMatch(context.bbcodeToMarkdown(roundTrips[0]), /\{br\}|\\\n/);
assert.equal(compile('Before\n\n:::center\nInside\n:::\n\nAfter'), 'Before\n[center]Inside[/center]\nAfter');
assert.equal(compile(':::center\nOne\n:::\n\n:::center\nTwo\n:::'), '[center]One[/center]\n[center]Two[/center]');

assert.equal(compile('Before\n---\nAfter'), 'Before[hr]After');
assert.equal(compile('Before\n\n---\n\nAfter'), 'Before\n[hr]\nAfter');

for(const [markdown,bbcode] of [
 ['# Title','[heading][big]Title[/big][/heading]'],
 ['## Title','[heading]Title[/heading]'],
 ['### Title','[big]Title[/big]'],
 ['# **Bold**','[heading][big][b]Bold[/b][/big][/heading]'],
 ['### {color:cyan|Title} ###','[big][color=cyan]Title[/color][/big]'],
 ['#### Title','[heading]Title[/heading]']
])assert.equal(compile(markdown),bbcode);
assert.equal(context.bbcodeToMarkdown('[heading][big]Title[/big][/heading]'),'# Title');
assert.equal(context.bbcodeToMarkdown('[heading]Title[/heading]'),'## Title');
assert.equal(context.bbcodeToMarkdown('[big]Title[/big]'),'### Title');
assert.equal(compile(context.bbcodeToMarkdown('Before[big]Title[/big]After')),'Before[big]Title[/big]After');

// A heading that needs macro spacing must not prevent hash headings elsewhere.
const mixedHeadings = '[center][heading][big]Largest[/big][/heading][/center]Before[heading]Tight[/heading]After[center][heading]Standard[/heading][/center][center][big]Large[/big][/center]';
const readableHeadings = context.bbcodeToMarkdown(mixedHeadings);
assert.match(readableHeadings, /^# Largest$/m);
assert.match(readableHeadings, /^## Standard$/m);
assert.match(readableHeadings, /^### Large$/m);
assert.equal(compile(readableHeadings), mixedHeadings);
const nestedHeading = '[center][heading][big][color=cyan]Name[/color][/big][/heading][/center]Text';
assert.match(context.bbcodeToMarkdown(nestedHeading), /^# \{color:cyan\|Name\}$/m);
assert.equal(compile(context.bbcodeToMarkdown(nestedHeading)), nestedHeading);
assert.equal(compile(context.bbcodeToMarkdown('[heading]First\nSecond[/heading]')), '[heading]First\nSecond[/heading]');
assert.equal(context.preferHashHeadings('```\n:::heading\nLiteral\n:::\n```'), '```\n:::heading\nLiteral\n:::\n```');

for (const tag of ['i', 'b', 'u', 's']) {
  const bbcode = `[${tag}]a\nb[/${tag}]`;
  assert.equal(context.bbcodeToMarkdown(bbcode), `:::${tag}\na\nb\n:::`);
  assert.equal(compile(context.bbcodeToMarkdown(bbcode)), bbcode);
  const nested = `Before[${tag}][color=cyan]a\nb[/color][/${tag}]After`;
  assert.match(context.bbcodeToMarkdown(nested), new RegExp(`:::${tag}\\n`));
  assert.equal(compile(context.bbcodeToMarkdown(nested)), nested);
  const padded = `[${tag}]\na\n\nb\n[/${tag}]`;
  assert.equal(compile(context.bbcodeToMarkdown(padded)), padded);
}
