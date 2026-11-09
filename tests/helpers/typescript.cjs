/** Run isolated UI units with each test's existing DOM/state stubs.
 * Formatting tests use the real bundled module graph. UI units deliberately
 * omit imports so the test controls collaborators rather than booting the app.
 */
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const esbuild = require('esbuild');
const cache = new Map();

function load(context, file, { names = [], effects = [] } = {}) {
  const source = fs.readFileSync(`src/${file}.ts`, 'utf8');
  const ast = ts.createSourceFile(file + '.ts', source, ts.ScriptTarget.Latest, true);
  const selected = [];
  for (const node of ast.statements) {
    if (ts.isFunctionDeclaration(node)) {
      if (names.includes(node.name.text)) selected.push(node.getText(ast));
      if (node.name.text.startsWith('initialize') || node.name.text.startsWith('bind')) {
        for (const effect of node.body.statements) {
          if (
            effects.some((needle) =>
              effect.getText(ast).replace(/\s+/g, '').includes(needle.replace(/\s+/g, '')),
            )
          )
            selected.push(effect.getText(ast));
        }
      }
    } else if (
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.some((d) => names.includes(d.name.getText(ast)))
    ) {
      selected.push(node.getText(ast));
    }
  }
  if (!selected.length) throw Error(`No test units selected from ${file}`);
  const code = selected
    .join('\n')
    .replace(/\bexport\s+/g, '')
    .replace(/\bstate\./g, '');
  vm.runInContext(
    ts.transpileModule(code, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
    }).outputText,
    context,
  );
}
function formatting(context) {
  if (!cache.has('formatting')) {
    cache.set(
      'formatting',
      esbuild.buildSync({
        stdin: {
          contents:
            [
              'tags',
              'fonts',
              'colors',
              'entities',
              'entity-preference',
              'escaping',
              'urls',
              'inline',
              'markdown',
              'bbcode',
              'warnings',
            ]
              .map((name) => `export * from './src/formatting/${name}';`)
              .join('\n') +
            "\nexport {default as namedCharacterReferences} from './src/formatting/named-references.json';",
          resolveDir: process.cwd(),
          loader: 'ts',
        },
        bundle: true,
        write: false,
        format: 'iife',
        globalName: 'FolioFormatting',
        target: 'es2022',
      }).outputFiles[0].text,
    );
  }
  vm.runInContext(cache.get('formatting'), context);
  Object.assign(context, context.FolioFormatting);
}
module.exports = { load, formatting };
