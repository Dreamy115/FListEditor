const assert = require('node:assert/strict');
const fs = require('node:fs');

const themes = fs.readFileSync('src/flist-themes.css', 'utf8');
const editor = fs.readFileSync('src/editor-themes.css', 'utf8');
const names = ['red','orange','yellow','green','cyan','purple','blue','pink','black','brown','white','gray'];
const defaults = {red:'#f00',orange:'#f60',yellow:'#ff0',green:'#0f0',cyan:'#0ff',purple:'#93f',blue:'#06f',pink:'#f9c',black:'#000',brown:'#8a6d3b',white:'#fff',gray:'#ccc'};
const root = themes.match(/:root\s*\{([^}]+)\}/)?.[1] || '';
for (const name of names) {
  assert.match(root, new RegExp('--flist-'+name+':'+defaults[name].replace('#','\\#')+';'), name+' F-List default palette');
  assert.match(themes, new RegExp('--site-'+name+':var\\(--flist-'+name+'\\)'), name+' preview uses shared palette');
  assert.match(editor, new RegExp('syntax-color-value\\[data-color="'+name+'"\\]\\{color:var\\(--flist-'+name+'\\)'), name+' editor uses shared palette');
}
for (const scheme of ['flist-blue','flist-dark','flist-light']) assert.ok(themes.includes(':root[data-flist-scheme="'+scheme+'"]'));
console.log('F-List color parity checks passed');
