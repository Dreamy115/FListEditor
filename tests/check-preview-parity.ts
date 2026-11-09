import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBrowserFixture } from './helpers/browser-fixture';
const root = fileURLToPath(new URL('..', import.meta.url));
const globals: Record<string, unknown> = {
  horizonProfileFixture: readFileSync(
    path.join(root, 'tests/fixtures/horizon-profile.bbcode'),
    'utf8',
  ),
};
if (process.argv.includes('--site-reference')) {
  globals.siteReferenceCSS = Object.fromEntries(
    await Promise.all(
      ['common/default-0.0.10.css', 'default.css', 'dark.css', 'light.css'].map(
        async (name: string) => {
          const response = await fetch('https://static.f-list.net/css/' + name, {
            signal: AbortSignal.timeout(20_000),
          });
          if (!response.ok)
            throw Error(`Reference CSS download failed: ${name} (${response.status})`);
          return [name, await response.text()];
        },
      ),
    ),
  );
}
if (process.argv.includes('--horizon-reference')) {
  const directory =
    process.env.HORIZON_THEME_DIR ||
    path.join(
      process.env.PROGRAMFILES || 'C:/Program Files',
      'Horizon/resources/app.asar.unpacked/themes',
    );
  globals.horizonReferenceCSS = Object.fromEntries(
    ['default', 'light', 'dark', 'moon-prism'].map((name: string) => [
      name,
      readFileSync(path.join(directory, name + '.css'), 'utf8'),
    ]),
  );
}
await runBrowserFixture({
  script: 'preview-parity.browser.js',
  resultId: 'preview-parity-result',
  widths: [1440, 800, 600],
  globals,
  gallery: process.argv.includes('--gallery')
    ? [
        'flist-blue',
        'flist-dark',
        'flist-light',
        'default',
        'classic',
        'noir',
        'horizon-moon-prism',
      ]
    : [],
});
