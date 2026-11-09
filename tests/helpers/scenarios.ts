import * as importedFileSystem from 'node:fs';
import type { boot } from './browser';
const steps: [string, (browser: ReturnType<typeof boot>) => void][] = [
  ['startup', () => {}],
  ['edit', (b) => b.input('# Title\n\n:::color cyan\n**Hello** ◆\n:::')],
  ['compile', (b) => b.click('bbMode')],
  ['decompile', (b) => b.click('mixedMode')],
  ['undo', (b) => b.click('undoEdit')],
  ['redo', (b) => b.click('redoEdit')],
  ['theme', (b) => b.change('editorTheme', 'paper')],
  ['preview', (b) => b.change('theme', 'flist-dark')],
  ['new character', (b) => b.click('newDraft')],
  ['rename', (b) => b.change('profileName', 'Alice')],
  ['clone character', (b) => b.click('cloneEditor')],
  ['template', (b) => b.click('newTemplate')],
  [
    'edit template',
    (b) => {
      b.change('profileName', 'Reusable');
      b.input(':::center\nA template\n:::');
    },
  ],
  ['save template', (b) => b.click('saveTemplate')],
  ['clone template', (b) => b.click('cloneEditor')],
  ['new from template', (b) => b.click('newFromTemplate')],
  [
    'delete character',
    (b) => {
      b.click('deleteDraft');
      b.click('confirmYes');
    },
  ],
];
function corpus() {
  const atoms = [
    'plain ◆ 😀',
    '**bold**',
    '*italic*',
    '[b]literal[/b]',
    '{color:cyan|blue}',
    '{color:nope|bad}',
    '{font:smallcaps|Hello}',
    '`literal **text**`',
    '&mdash; &#x25C6;',
    '{img:123|label}',
    '[link](https://example.com)',
    '{typo|text}',
    '{b|{i|nested}}',
    '  leading\ntrailing  ',
    '> quoted\n> next',
  ];
  const result = ['', importedFileSystem.readFileSync('docs/feature-showcase.md', 'utf8')];
  for (let i = 0; i < 750; i++) {
    const a = atoms[i % atoms.length],
      b = atoms[(i * 7 + 3) % atoms.length];
    result.push(
      [
        a + '\n\n' + b,
        ':::center\n' + a + '\n' + b + '\n:::',
        '# ' + a + '\n' + b,
        '```\n' + a + '\n```\n' + b,
        '{b|' + a + '}\n' + b,
      ][i % 5],
    );
  }
  return result;
}
export { steps, corpus };
