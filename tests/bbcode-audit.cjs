const units = require('./helpers/typescript.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const { document, window } = parseHTML('<html><body></body></html>');
const context = vm.createContext({ URL, document, window, setTimeout, clearTimeout });

vm.runInContext(fs.readFileSync('src/horizon-renderer.js', 'utf8'), context);
units.formatting(context);
const warnings = (text) => Array.from(context.countWarnings(text));
for (const tag of 'b i u s big small sup sub color url heading indent justify collapse quote hr left center right icon eicon user noparse'.split(
  ' ',
)) {
  const param = { color: '=cyan', url: '=https://example.com', collapse: '=Details' }[tag] || '';
  const body =
    { icon: 'Test Name', eicon: 'smile', user: 'Test Name', noparse: '[b]literal[/b]' }[tag] ||
    'Example';
  const bb = tag === 'hr' ? '[hr]' : `[${tag}${param}]${body}[/${tag}]`;
  assert.deepEqual(warnings(bb), [], tag);
  assert.equal(context.markdownToBB(context.bbcodeToMarkdown(bb)), bb, tag);
  assert.ok(context.FolioHorizon.render(bb).firstChild, tag);
}
for (const bb of [
  '[url]example.com[/url]',
  '[url=javascript:alert(1)]X[/url]',
  '[url][/url]',
  '[url=https://localhost]X[/url]',
]) {
  assert.ok(
    warnings(bb).some((message) => message.startsWith('Invalid URL in ')),
    bb,
  );
}
for (const bb of [
  '[big][big]X[/big][/big]',
  '[small][b][small]X[/small][/b][/small]',
  '[sup][color=red]X[/color][/sup]',
]) {
  assert.ok(
    warnings(bb).some((message) => message.startsWith('Unsupported nesting:')),
    bb,
  );
}
for (const bb of ['[b=ignored]X[/b]', '[icon=ignored]Test Name[/icon]'])
  assert.ok(
    warnings(bb).some((message) => message.startsWith('Unexpected parameter on ')),
    bb,
  );
for (const tag of ['user', 'icon', 'eicon'])
  assert.ok(
    warnings(`[${tag}]Bad!Name[/${tag}]`).some((message) => message.startsWith('Invalid name in ')),
  );
for (const bb of [
  '[collapse]Body[/collapse]',
  '[center][right]X[/right][/center]',
  '[sup][b]X[/b][/sup]',
  '[url]https://example.com[/url]',
  '[noparse][big][big]X[/big][/big][url]bad[/url][/noparse]',
])
  assert.deepEqual(warnings(bb), [], bb);
const native = '[url]https://example.com[/url]\n[url]bad[/url]';
for (const [markdown, literal] of [
  ['`**literal**`', '**literal**'],
  ['\\`literal\\`', '`literal`'],
  ['\\`\\`\\`', '```'],
  ['``code ` with tick``', 'code ` with tick'],
  ['{noparse|`tick`}', '`tick`'],
  ['{noparse|**literal** `tick`}', '**literal** `tick`'],
  ['```\n`tick`\n```', '`tick`'],
  ['```\n```literal\n```', '```literal'],
  ['````text\n```\n{unknown|literal}\n```\n````', '```\n{unknown|literal}\n```'],
  ['````\nfirst\n```\nlast\n````', 'first\n```\nlast'],
]) {
  const bb = context.markdownToBB(markdown);
  assert.equal(context.FolioHorizon.render(bb).textContent, literal, markdown);
  assert.deepEqual(warnings(bb), [], markdown);
  assert.equal(context.locatedWarnings(markdown, true, bb).length, 0, markdown);
  const restored = context.bbcodeToMarkdown(bb);
  assert.equal(
    context.markdownToBB(restored),
    bb,
    'Code round trip: ' + markdown + ' -> ' + restored,
  );
}
for (const literal of [
  '[/noparse]',
  '[noparse][b]Literal[/b][/noparse]',
  '[/NOPARSE] [/noparse]',
]) {
  for (const markdown of [
    '```text\n' + literal + '\n```',
    '{noparse|' + literal + '}',
    '`' + literal + '`',
  ]) {
    const bb = context.markdownToBB(markdown);
    assert.deepEqual(warnings(bb), [], markdown);
    assert.equal(context.FolioHorizon.render(bb).textContent, literal, markdown);
    assert.equal(context.locatedWarnings(markdown, true, bb).length, 0, markdown);
    assert.equal(context.locatedWarnings(bb, false, bb).length, 0, 'BBCode mode: ' + markdown);
  }
}
const showcase = fs.readFileSync('docs/feature-showcase.md', 'utf8').replace(/\r\n?/g, '\n');
const showcaseBB = context.markdownToBB(showcase);
assert.deepEqual(
  warnings(showcaseBB),
  [],
  'Showcase literal diagnostics must export balanced noparse wrappers',
);
assert.equal(context.locatedWarnings(showcaseBB, false, showcaseBB).length, 0);
assert.equal(
  context.locatedWarnings(showcase, true, showcaseBB).length,
  0,
  'Welcome profile should open without warnings',
);
vm.runInContext(fs.readFileSync('src/feature-showcase.js', 'utf8'), context);
assert.equal(
  context.FolioShowcase,
  showcase,
  'Browser welcome profile must match the Markdown source',
);
const welcomeDOM = context.FolioHorizon.render(showcaseBB);
assert.ok(welcomeDOM.textContent.includes('Folio / Editor reference'));
assert.equal(welcomeDOM.querySelectorAll('.bbcode-collapse').length, 14);
assert.equal(welcomeDOM.querySelectorAll('.bbcode-collapse:not(.collapsed)').length, 0);
// Check the real initial draft and stored-data loading path without starting the UI.
for (const stored of [
  null,
  {
    drafts: [{ id: 'saved', name: 'Existing character', content: 'Keep my work', mixed: false }],
    active: 'saved',
  },
]) {
  const startup = vm.createContext({
    globalThis: { FolioTemplates: {}, FolioShowcase: showcase },
    STORAGE: 'test',
    $: () => ({ options: [{ value: 'flist-blue' }] }),
    makeId: () => 'new',
    parsePreviewFontSize: () => null,
    localStorage: { getItem: () => JSON.stringify(stored) },
  });
  units.load(startup, 'app/state', {
    names: ['templates', 'intro', 'validateCustomTemplates'],
    effects: ['state.data =', 'state.data.active=', 'const loaded='],
  });
  vm.runInContext('globalThis.initialData=data', startup);
  assert.equal(
    startup.globalThis.initialData.drafts[0].content,
    stored ? 'Keep my work' : showcase,
  );
}
const located = Array.from(context.locatedWarnings(native, false, native));
assert.equal(located.length, 1);
assert.equal(located[0].start, native.lastIndexOf('[url]'));
assert.equal(located[0].line, 2);
for (const markdown of ['{sup|{color:red|X}}', ':::big\n:::big\nX\n:::\n:::', '{user:Bad!Name}']) {
  const issues = Array.from(
    context.locatedWarnings(markdown, true, context.markdownToBB(markdown)),
  );
  assert.equal(issues.length, 1, markdown);
  assert.match(markdown.slice(issues[0].start, issues[0].end), /color:red|:::big|user:Bad!Name/);
}
const avatar = context.FolioHorizon.render('[icon]Test Name[/icon]').querySelector('img');
for (const markdown of [
  '# Title\n\nIntro\n{big|Outer {big|Inner}}',
  '# Title\n\n{big|Outer {big|First}}\n{big|Another {big|Second}}',
  'Intro\n`{big|literal}`\n{big|Outer {big|Inner}}',
  'Intro\n:::big\n{big|Inner}\n:::',
  'Intro\n{sup|~~Strike~~}',
]) {
  const issues = Array.from(
    context.locatedWarnings(markdown, true, context.markdownToBB(markdown)),
  ).filter((issue) => issue.message.startsWith('Unsupported nesting:'));
  const expected = [...markdown.matchAll(/\{big\|(?:Inner|First|Second)|~~Strike/g)].map(
    (match) => match.index,
  );
  assert.deepEqual(
    issues.map((issue) => issue.start),
    expected,
    markdown,
  );
  for (const issue of issues)
    assert.equal(issue.line, markdown.slice(0, issue.start).split('\n').length);
}
avatar.dispatchEvent(new window.Event('error'));
assert.match(avatar.src, /^data:image\/svg\+xml,/);
const fallback = avatar.src;
avatar.dispatchEvent(new window.Event('error'));
assert.equal(avatar.src, fallback, 'Fallback must not retry remote images');
assert.equal(avatar.alt, 'Test Name');
assert.match(avatar.parentElement.href, /Test/);
console.log(
  'Official BBCode coverage, semantic diagnostics, source locations and avatar fallback passed',
);
