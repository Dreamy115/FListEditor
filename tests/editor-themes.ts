import assert from './helpers/assert';
import fs from 'node:fs';

const css = fs.readFileSync('src/editor-themes.css', 'utf8');
const palettes = [...css.matchAll(/\.editor-shell(?:\[data-editor-theme="([^"]+)"\])?\{([^}]+)\}/g)]
  .map((match) => ({
    name: match[1] || 'folio',
    vars: Object.fromEntries(
      [...match[2].matchAll(/--editor-([\w-]+):([^;]+);/g)].map((m) => [m[1], m[2]]),
    ),
  }))
  .filter((p) => p.vars.bg);
function luminance(hex) {
  const rgb = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb.reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}
const foregrounds = [
  'text',
  'number',
  'active-number',
  'marker',
  'structural',
  'emphasis',
  'bold',
  'italic',
  'bold-italic',
  'underline',
  'strike',
  'link',
  'literal',
  'escape',
  'entity',
  'warning',
  ...['block', 'macro', 'tag'].flatMap((kind) => [0, 1, 2, 3, 4].map((depth) => kind + depth)),
];
assert.deepEqual(
  palettes.map((p) => p.name),
  ['folio', 'graphite', 'forest', 'paper'],
);
for (const { name, vars } of palettes) {
  const bg = luminance(vars.bg);
  for (const key of foregrounds) {
    const fg = luminance(vars[key]);
    const minimum = ['text', 'number', 'active-number'].includes(key) ? 4.5 : 7;
    assert.ok((Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05) >= minimum, `${name}: ${key}`);
  }
  for (const kind of ['block', 'macro', 'tag'])
    assert.equal(new Set([0, 1, 2, 3, 4].map((i) => vars[kind + i])).size, 5);
  assert.ok(parseInt(vars.section.slice(-2), 16) / 255 <= 0.05, name + ': subtle section tint');
  if (name === 'paper') {
    assert.equal(vars['color-shadow-black'], 'none');
    assert.notEqual(vars['color-shadow-white'], 'none');
  } else {
    assert.notEqual(vars['color-shadow-black'], 'none');
    assert.equal(vars['color-shadow-white'], 'none');
  }
}
console.log('Editor theme palette and contrast checks passed');

// Named source colors must remain legible without borrowing the preview palette.
function rgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
function composite(foreground, background) {
  const alpha = foreground.length === 9 ? parseInt(foreground.slice(7), 16) / 255 : 1;
  return (
    '#' +
    rgb(foreground)
      .map((v, i) =>
        Math.round(v * alpha + rgb(background)[i] * (1 - alpha))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
function contrast(a, b) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
for (const { name, vars } of palettes.filter((p) => p.name !== 'folio')) {
  const section = composite(vars.section, vars.bg);
  const delimiter = composite(vars.delimiter, section);
  const selected = composite(vars.selection, delimiter);
  const colors = [
    'red',
    'orange',
    'yellow',
    'green',
    'cyan',
    'purple',
    'blue',
    'pink',
    'black',
    'brown',
    'white',
    'gray',
  ];
  for (const key of [
    ...foregrounds.filter((key) => !['number', 'active-number'].includes(key)),
    ...colors.map((c) => 'color-' + c),
  ]) {
    for (const background of [vars.bg, section, delimiter, selected]) {
      assert.ok(contrast(vars[key], background) >= 4.5, `${name}: ${key} on ${background}`);
    }
  }
  assert.ok(contrast(vars.placeholder, vars.bg) >= 4.5, name + ': placeholder');
  assert.ok(contrast(vars.number, vars.gutter) >= 4.5, name + ': gutter numbers');
}
console.log('Non-Folio syntax contrast passed on section, delimiter, and selection backgrounds');

const appCss = fs.readFileSync('src/app-themes.css', 'utf8');
for (const match of appCss.matchAll(
  /:root\[data-app-theme="(graphite|paper|forest)"\]\{([^}]+)\}/g,
)) {
  const vars = Object.fromEntries(
    [...match[2].matchAll(/--([\w-]+):([^;]+);/g)].map((m) => [m[1], m[2]]),
  );
  if (!vars.bg) continue;
  for (const foreground of ['text', 'muted', 'accent', 'accent2']) {
    for (const background of [
      'bg',
      'surface',
      'surface2',
      'ui-sidebar',
      'ui-header',
      'ui-toolbar',
      'ui-input',
      'ui-control',
      'ui-active',
      'ui-hover',
    ]) {
      assert.ok(
        contrast(vars[foreground], vars[background]) >= 4.5,
        `${match[1]}: ${foreground} on ${background}`,
      );
    }
  }
}
console.log('Non-Folio app control and status contrast checks passed');
