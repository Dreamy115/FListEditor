/** Run independent TypeScript test programs without emitting JavaScript. */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('..', import.meta.url));
const browserSuites = new Set([
  'check-local-images.ts',
  'check-preview-scroll.ts',
  'check-screenshot.ts',
  'check-wrapped-caret.ts',
  'folio-contrast.ts',
  'preview-themes.ts',
]);
const browser = process.argv.includes('--browser');
const all = process.argv.includes('--all');
const files = readdirSync(path.join(root, 'tests'))
  .filter(
    (file) =>
      file.endsWith('.ts') &&
      !file.endsWith('.d.ts') &&
      (all || browserSuites.has(file) === browser),
  )
  .sort();
let failures = 0;
for (const file of files) {
  console.log(`\n→ ${file}`);
  const result = spawnSync(process.execPath, ['--import', 'tsx', path.join(root, 'tests', file)], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error) console.error(result.error);
  if (result.status !== 0) failures++;
}
console.log(`\n${files.length - failures}/${files.length} test programs passed.`);
if (failures) process.exitCode = 1;
