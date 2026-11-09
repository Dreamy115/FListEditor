import { createContext } from './helpers/typescript';
import assert from './helpers/assert';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { boot } from './helpers/browser.ts';
import { steps, corpus } from './helpers/scenarios.ts';
import { formatting } from './helpers/typescript.ts';
import baseline from './fixtures/refactor-baseline.json';

const hash = (text: string) => createHash('sha256').update(text).digest('hex');

// Expected results were captured from the unmodified application at baseline.commit.
const context = createContext({ URL });
formatting(context);
const outputs = corpus().map((text: string) => {
  const compiled = context.markdownToBB(text);
  return [
    compiled,
    context.bbcodeToMarkdown(compiled),
    context.locatedWarnings(text, true, compiled),
  ];
});
assert.equal(outputs.length, baseline.corpusCount);
assert.equal(
  hash(JSON.stringify(outputs)),
  baseline.formattingHash,
  'Exact compiled/decompiled output and diagnostic locations match the original app',
);

const browser = boot(fs.readFileSync('build/app.js', 'utf8'));
for (const [index, [label, action]] of steps.entries()) {
  action(browser);
  const snapshot = browser.snapshot();
  snapshot.preview = hash(snapshot.preview);
  assert.equal(baseline.snapshots[index].label, label);
  assert.deepEqual(snapshot, baseline.snapshots[index].snapshot, label);
}
// Saved records and settings still hydrate through the complete module graph.
const saved = JSON.parse(browser.store.get('folio-f-list-studio-v1')!);
const reopened = boot(fs.readFileSync('build/app.js', 'utf8'), saved);
assert.equal(
  reopened.$('profileName').value,
  saved.drafts.find((d: { id: string; name: string }) => d.id === saved.active).name,
);
assert.equal(reopened.document.documentElement.dataset.appTheme, saved.editorTheme);
assert.equal(reopened.$('theme').value, saved.theme);
const standalone = boot(null, null, true);
const standaloneSnapshot = standalone.snapshot();
standaloneSnapshot.preview = hash(standaloneSnapshot.preview);
assert.deepEqual(
  standaloneSnapshot,
  baseline.snapshots[0].snapshot,
  'Standalone HTML boots with the same initial behavior',
);
console.log(
  `${outputs.length} formatting/diagnostic cases and ${steps.length} complete-app scenarios match ${baseline.commit.slice(0, 7)}`,
);
