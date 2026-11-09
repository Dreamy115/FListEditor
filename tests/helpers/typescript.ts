import { isRecord, errorMessage } from '../../src/app/validation';
import type { Diagnostic } from '../../src/app/types';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import esbuild from 'esbuild';
/** Run isolated UI units with each test's existing DOM/state stubs.
 * Formatting tests use the real bundled module graph. UI units deliberately
 * omit imports so the test controls collaborators rather than booting the app.
 */

const cache = new Map<string, string>();

function load(
  context: vm.Context,
  file: string,
  { names = [], effects = [] }: { names?: string[]; effects?: string[] } = {},
) {
  Object.assign(context, { isRecord, errorMessage });
  const source = fs.readFileSync(`src/${file}.ts`, 'utf8');
  const ast = ts.createSourceFile(file + '.ts', source, ts.ScriptTarget.Latest, true);
  const selected = [];
  for (const node of ast.statements) {
    if (ts.isFunctionDeclaration(node)) {
      if (names.includes(node.name!.text)) selected.push(node.getText(ast));
      if (node.name!.text.startsWith('initialize') || node.name!.text.startsWith('bind')) {
        for (const effect of node.body!.statements) {
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
function formatting(context: vm.Context) {
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
              .map((name: string) => `export * from './src/formatting/${name}';`)
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
  vm.runInContext(cache.get('formatting')!, context);
  Object.assign(context, context.FolioFormatting);
}
export { load, formatting };

/** Typed interfaces for data returned across the isolated VM boundary.
 * Node's vm.Context dictionary is dynamically keyed (and uses any in Node's
 * declarations): evaluated scripts install functions at runtime. Keep that
 * interop boundary here; known renderer/compiler results have explicit types.
 */
export function createContext(sandbox: vm.Context = {}) {
  return vm.createContext(sandbox) as vm.Context & {
    FolioHorizon: typeof FolioHorizon;
    FolioSyntax: typeof FolioSyntax;
    FolioDiagnostics: typeof FolioDiagnostics;
    FolioTemplates: typeof FolioTemplates;
    countWarnings(input: string): string[];
    colorWarnings(text: string, mixed?: boolean): string[];
    macroWarnings(text: string): string[];
    locatedWarnings(text: string, mixed: boolean, compiled: string): Diagnostic[];
    blockMacroWarnings(text: string): Diagnostic[];
    nestedFontWarnings(text: string): Diagnostic[];
  };
}
