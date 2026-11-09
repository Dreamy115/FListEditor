// Keep vendored files unchanged; adapt their imports in an ignored build intermediate.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));

export function prepareRenderer(): void {
  const sources = ['parser', 'core', 'standard'].map((name) =>
    fs
      .readFileSync(path.join(root, 'vendor/horizon/bbcode', name + '.ts'), 'utf8')
      .replace(/^import\b[\s\S]*?;\s*/gm, '')
      .replace(/^export /gm, ''),
  );
  fs.mkdirSync(path.join(root, 'build'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'build/horizon.ts'),
    '// Generated from unmodified vendored Horizon sources. MPL-2.0.\n' +
      '// See vendor/horizon/README.md and license notices. Do not edit.\n' +
      "import { Utils, InlineDisplayMode, normalizeCharacterName, core, setImmediate, IconView, UrlTagView } from '../src/horizon-adapter';\n" +
      "import type { InlineImage, ComponentView as Vue } from '../src/horizon-adapter';\n" +
      sources.join('\n') +
      '\nexport {StandardBBCodeParser, BBCodeTextTag, analyzeUrlTag, truncateBBCode};\n',
  );
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  prepareRenderer();
