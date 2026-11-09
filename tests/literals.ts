import { createContext } from './helpers/typescript';
import * as units from './helpers/typescript.ts';
import assert from './helpers/assert';
import fs from 'node:fs';
import vm from 'node:vm';

const context = createContext({ URL });
units.formatting(context);
const compile = (text) => context.markdownToBB(text),
  decode = (text) => context.bbcodeToMarkdown(text);
for (const [markdown, bbcode] of [
  ['and he was [there]', 'and he was [noparse][there][/noparse]'],
  ['[b]text[/b]', '[noparse][b][/noparse]text[noparse][/b][/noparse]'],
  [
    '[1] [two words] []',
    '[noparse][1][/noparse] [noparse][two words][/noparse] [noparse][][/noparse]',
  ],
  ['**[there]**', '[b][noparse][there][/noparse][/b]'],
  ['{color:purple|[there]}', '[color=purple][noparse][there][/noparse][/color]'],
  ['[Label](https://example.com)', '[url=https://example.com]Label[/url]'],
  [
    '**before** [noparse] **after**',
    '[b]before[/b] [noparse][[/noparse]noparse][noparse][/noparse] [b]after[/b]',
  ],
  ['\\[b]', '[noparse][b][/noparse]'],
] as const) {
  assert.equal(compile(markdown), bbcode, markdown);
  assert.equal(compile(decode(bbcode)), bbcode, 'Round trip: ' + markdown);
}
assert.equal(decode('and he was [noparse][there][/noparse]'), 'and he was [there]');
for (const text of [
  '[url=https://example.com]Label[/url]',
  '[color=purple]Text[/color]',
  '[img=123]Caption[/img]',
  '[noparse]**bold**[/noparse]',
]) {
  const bb = compile(text);
  assert.equal(compile(decode(bb)), bb, text);
}
assert.equal(compile('{b|Text}'), '[b]Text[/b]');
assert.equal(compile(':::right\nText\n:::'), '[right]Text[/right]');
console.log('Markdown-only formatting, literal brackets and round-trip checks passed');
