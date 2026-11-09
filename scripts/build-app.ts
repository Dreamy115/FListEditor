import { prepareRenderer } from './build-renderer';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
prepareRenderer();
execFileSync(
  process.execPath,
  [
    path.join(root, 'node_modules/typescript/bin/tsc'),
    '--project',
    path.join(root, 'tsconfig.json'),
  ],
  { stdio: 'inherit' },
);
execFileSync(
  process.execPath,
  [
    path.join(root, 'node_modules/typescript/bin/tsc'),
    '--project',
    path.join(root, 'tsconfig.tools.json'),
  ],
  { stdio: 'inherit' },
);
await build({
  absWorkingDir: root,
  entryPoints: Object.fromEntries([
    ['app', 'src/main.ts'],
    ...[
      'horizon-renderer',
      'syntax',
      'diagnostics',
      'preview-state',
      'templates',
      'feature-showcase',
      'screenshot',
      'local-images',
      'preview-themes',
    ].map((name) => [name, 'src/' + name + '.ts']),
  ]),
  outdir: 'build',
  loader: { '.md': 'text' },
  bundle: true,
  format: 'iife',
  target: 'es2022',
  minify: false,
  charset: 'utf8',
  legalComments: 'inline',
  banner: {
    js: '// Generated from TypeScript sources. Edit the TypeScript sources, then run npm run build.',
  },
});
