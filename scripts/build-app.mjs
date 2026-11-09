import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
execFileSync(
  process.execPath,
  [
    path.join(root, 'node_modules/typescript/bin/tsc'),
    '--project',
    path.join(root, 'tsconfig.json'),
  ],
  { stdio: 'inherit' },
);
await build({
  absWorkingDir: root,
  entryPoints: ['src/main.ts'],
  outfile: 'build/app.js',
  bundle: true,
  format: 'iife',
  target: 'es2022',
  minify: false,
  charset: 'utf8',
  legalComments: 'inline',
  banner: {
    js: '// Generated from src/main.ts. Edit the TypeScript sources, then run npm run build.',
  },
});
