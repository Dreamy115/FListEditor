import { createContext } from './helpers/typescript';
import * as units from './helpers/typescript.ts';
import assert from './helpers/assert';

// Load the conversion functions without starting the browser UI.

const context = createContext({ URL });
units.formatting(context);
for (const markdown of [
  '  First  \n\nSecond\n',
  '1. Parent\n   1. **Child**  \n',
  ':::center\n  First\n   1. Child  \n:::',
]) {
  const bb = context.markdownToBB(markdown);
  assert.doesNotMatch(bb, /^ +| +$/m, 'Compiled line edges contain no ordinary spaces');
  assert.ok(bb.includes('\u00a0'), 'Compilation emits actual non-breaking spaces');
  const restored = context.bbcodeToMarkdown(bb);
  assert.ok(!restored.includes('\u00a0'), 'Decompilation restores editable spaces');
  assert.equal(context.markdownToBB(restored), bb, 'Whitespace survives mode round trip');
}
assert.equal(context.markdownToBB('  Text  \n'), '\u00a0\u00a0Text\u00a0\u00a0\n');
assert.equal(context.bbcodeToMarkdown('\u00a0\u00a0Text\u00a0\u00a0\n'), '  Text  \n');
assert.equal(context.markdownToBB('Words stay spaced'), 'Words stay spaced');
assert.equal(context.markdownToBB('Inside\u00a0space'), 'Inside\u00a0space');
assert.equal(context.bbcodeToMarkdown('Inside\u00a0space'), 'Inside\u00a0space');
console.log('BBCode whitespace compilation and reverse conversion passed');
