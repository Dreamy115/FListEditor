const assert = require('node:assert/strict');
const fs = require('node:fs');
const { parseHTML } = require('linkedom');
const html = fs.readFileSync('dist/Folio-Profile-Studio.html', 'utf8');
const { document } = parseHTML(html);
assert.equal(
  document.querySelectorAll('script[src],link[rel="stylesheet"]').length,
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
