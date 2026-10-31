// Regenerate after updating vendored sources: npm ci && npm run build:renderer.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const sources = ['parser', 'core', 'standard'].map(name => {
  let source = fs.readFileSync(path.join(root, 'vendor/horizon/bbcode', name + '.ts'), 'utf8');
  source = source.replace(/^import\b[\s\S]*?;\s*/gm, '');
  source = source.replace(/^export /gm, '');
  return ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2020}}).outputText;
});
const adapter = fs.readFileSync(path.join(root, 'src/horizon-adapter.js'), 'utf8');
fs.writeFileSync(path.join(root, 'src/horizon-renderer.js'),
  '// Generated from vendor/horizon and src/horizon-adapter.js. MPL-2.0.\n' +
  '// Source and notices: https://github.com/Dreamy115/FListEditor/tree/main/vendor/horizon\n' +
  '(() => {\n"use strict";\n' + adapter + '\n' + sources.join('\n') + `
const parser = new StandardBBCodeParser();
// Standalone previews have no profile API response mapping IDs to image hashes.
const imageTag = parser.getTag('img');
parser.addTag(new BBCodeTextTag('img', (p, parent, param, content) => {
  if (parser.inlines?.[param]) return imageTag.createElement(p, parent, param, content);
  const url = safeURL(content);
  const el = document.createElement(!param && url ? 'img' : 'span');
  if (!param && url) { el.src = url; el.alt = 'Profile image'; el.className = 'profileimg'; }
  else { el.className = 'placeholder-image'; el.textContent = 'F-List image #' + param + (content ? ' · ' + content : '') + ' (metadata unavailable)'; }
  parent.appendChild(el);
  return el;
}));
globalThis.FolioHorizon = {render: input => parser.parseEverything(input)};
})();
`);
