const assert = require('node:assert/strict');
const fs = require('node:fs');
const css = fs.readFileSync('src/editor-themes.css', 'utf8');
const palettes = [...css.matchAll(/\.editor-shell(?:\[data-editor-theme="([^"]+)"\])?\{([^}]+)\}/g)]
  .map(match => ({name: match[1] || 'folio', vars: Object.fromEntries([...match[2].matchAll(/--editor-([\w-]+):([^;]+);/g)].map(m => [m[1], m[2]]))}))
  .filter(p => p.vars.bg);
function luminance(hex) {
  const rgb = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255)
    .map(v => v<=0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4);
  return rgb.reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
}
const foregrounds = ['text','number','active-number','marker','structural','bold','italic','bold-italic','underline','strike','link','literal','escape','entity',
  ...['block','macro','tag'].flatMap(kind=>[0,1,2,3,4].map(depth=>kind+depth))];
assert.deepEqual(palettes.map(p=>p.name), ['folio','graphite','forest','paper']);
for (const {name,vars} of palettes) {
  const bg=luminance(vars.bg);
  for (const key of foregrounds) {
    const fg=luminance(vars[key]);
    assert.ok((Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05)>=4.5, `${name}: ${key}`);
  }
  for (const kind of ['block','macro','tag']) assert.equal(new Set([0,1,2,3,4].map(i=>vars[kind+i])).size,5);
  assert.ok(parseInt(vars.section.slice(-2),16)/255<=.05, name + ': subtle section tint');
  if (name === 'paper') {
    assert.equal(vars['color-shadow-black'], 'none');
    assert.notEqual(vars['color-shadow-white'], 'none');
  } else {
    assert.notEqual(vars['color-shadow-black'], 'none');
    assert.equal(vars['color-shadow-white'], 'none');
  }
}
console.log('Editor theme palette and contrast checks passed');
