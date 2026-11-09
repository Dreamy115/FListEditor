/** Build all browser entries, then package a self-contained HTML file. */
import './build-app';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const readText = (file: string) =>
  readFileSync(path.join(root, file), 'utf8').replace(/\r\n?/g, '\n');
let page = readText('index.html');
page = page.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, file: string) => {
  let css = readText(file);
  if (file === 'src/flist-themes.css') {
    for (const asset of readdirSync(path.join(root, 'src/assets/flist')).filter((name) =>
      name.endsWith('.png'),
    )) {
      const encoded = readFileSync(path.join(root, 'src/assets/flist', asset)).toString('base64');
      css = css.replaceAll('assets/flist/' + asset, 'data:image/png;base64,' + encoded);
    }
  }
  return '<style>' + css + '</style>';
});
page = page.replace(
  /<script src="([^"]+)"><\/script>/g,
  (_, file: string) => '<script>' + readText(file) + '</script>',
);
const output = path.join(root, 'dist/Folio-Profile-Studio.html');
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, page, 'utf8');
console.log(output);
