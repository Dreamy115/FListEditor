import assert from './helpers/assert';
import fs from 'node:fs';
import { parseHTML } from 'linkedom';

const html = fs.readFileSync('dist/Folio-Profile-Studio.html', 'utf8');
const { document } = parseHTML(html);
assert.equal(
  document.querySelectorAll<HTMLElement>('script[src],link[rel="stylesheet"]').length,
  0,
  'Standalone HTML embeds every script and stylesheet',
);
assert.ok(
  html.includes(fs.readFileSync('build/app.js', 'utf8')),
  'Standalone HTML contains the current TypeScript bundle',
);
assert.ok(!html.includes('assets/flist/'), 'F-List image assets are embedded');
assert.ok(
  fs.readFileSync('build/app.js', 'utf8').includes('// src/formatting/markdown.ts'),
  'Bundle retains readable source labels',
);
console.log('Single-file standalone output and current TypeScript bundle verified');

assert.deepEqual(
  fs
    .readdirSync('src', { recursive: true })
    .filter((file) => /\.(?:js|cjs|mjs)$/.test(String(file))),
  [],
  'Owned application source stays TypeScript',
);
assert.deepEqual(
  fs.readdirSync('tests', { recursive: true }).filter((file) => String(file).endsWith('.cjs')),
  [],
  'Tests run directly from TypeScript',
);
const tasks = JSON.parse(fs.readFileSync('.vscode/tasks.json', 'utf8')).tasks;
assert.ok(
  tasks.some(
    (task) =>
      task.label === 'Folio: Test all' && task.script === 'test:all' && task.group.kind === 'test',
  ),
  'VS Code exposes the complete TypeScript suite',
);
