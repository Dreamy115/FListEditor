const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Load the conversion functions without starting the browser UI.
const source = fs.readFileSync('src/app.js', 'utf8');
const context = vm.createContext({URL});
vm.runInContext(source.slice(source.indexOf('const macroInlineNames='), source.indexOf('function renderBB(')), context);
for(const markdown of ['  First  \n\nSecond\n','1. Parent\n   1. **Child**  \n',':::center\n  First\n   1. Child  \n:::']){
 const bb=context.markdownToBB(markdown);
 assert.doesNotMatch(bb,/^ +| +$/m,'Compiled line edges contain no ordinary spaces');
 assert.ok(bb.includes('\u00a0'),'Compilation emits actual non-breaking spaces');
 const restored=context.bbcodeToMarkdown(bb);
 assert.ok(!restored.includes('\u00a0'),'Decompilation restores editable spaces');
 assert.equal(context.markdownToBB(restored),bb,'Whitespace survives mode round trip');
}
assert.equal(context.markdownToBB('  Text  \n'),'\u00a0\u00a0Text\u00a0\u00a0\n');
assert.equal(context.bbcodeToMarkdown('\u00a0\u00a0Text\u00a0\u00a0\n'),'  Text  \n');
assert.equal(context.markdownToBB('Words stay spaced'),'Words stay spaced');
assert.equal(context.markdownToBB('Inside\u00a0space'),'Inside\u00a0space');
assert.equal(context.bbcodeToMarkdown('Inside\u00a0space'),'Inside\u00a0space');
console.log('BBCode whitespace compilation and reverse conversion passed');
