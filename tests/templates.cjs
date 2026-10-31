const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync('src/app.js', 'utf8');
const context = vm.createContext({});
vm.runInContext(app.slice(app.indexOf('function validateCustomTemplates('), app.indexOf('let data=')), context);
const validate = value => JSON.parse(JSON.stringify(context.validateCustomTemplates(value)));
assert.deepEqual(validate(undefined), []);
assert.deepEqual(validate({}), []);
assert.deepEqual(validate([
  null, {}, {id:'bad',name:' ',content:''},
  {id:'one',name:'  Reusable profile  ',content:'# Name\n\n:::i\nLine one\nLine two\n:::'},
  {id:'one',name:'Duplicate',content:'bad'},
  {id:'large',name:'Too large',content:'x'.repeat(1500001)}
]), [{id:'one',name:'Reusable profile',content:'# Name\n\n:::i\nLine one\nLine two\n:::'}]);
assert.equal(validate([{id:'long',name:'x'.repeat(120),content:''}])[0].name.length, 100);
assert.equal(validate(Array.from({length:110}, (_,i) => ({id:String(i),name:'Template '+i,content:''}))).length, 100);
console.log('Custom template storage validation checks passed');

// Sidebar labels must render names exactly, without decorative prefixes or
// stripping question marks that are part of the user's actual character name.
const {document} = require('linkedom').parseHTML('<div id="draftList"></div>');
const drafts = [{id:'one',name:'Character'}, {id:'two',name:'?User-chosen name'}];
let selected;
const renderContext = vm.createContext({document, data:{drafts,active:'one'}, templateSession:null,
  $:id=>document.getElementById(id), loadDraft:id=>{selected=id}, renderTemplateTargets:()=>{}});
vm.runInContext(app.slice(app.indexOf('function renderDrafts()'), app.indexOf('function stashEditor()')), renderContext);
renderContext.renderDrafts();
assert.deepEqual([...document.querySelectorAll('.draft span')].map(el=>el.textContent), drafts.map(d=>d.name));
document.querySelectorAll('.draft')[1].click();
assert.equal(selected, 'two');

// The separately loaded catalogue must compile and render through the real pipeline.
const {window, document:previewDocument} = require('linkedom').parseHTML('<html></html>');
const builtinContext = vm.createContext({URL, window, document:previewDocument});
vm.runInContext(fs.readFileSync('src/templates.js', 'utf8'), builtinContext);
vm.runInContext(app.slice(app.indexOf('const macroInlineNames='), app.indexOf('function renderBB(')), builtinContext);
vm.runInContext(app.slice(app.indexOf('function countWarnings('), app.indexOf('function refresh(')), builtinContext);
vm.runInContext(fs.readFileSync('src/horizon-renderer.js', 'utf8'), builtinContext);
assert.deepEqual(Object.keys(builtinContext.FolioTemplates), ['dossier','narrative','compact','archive']);
for (const [id, markdown] of Object.entries(builtinContext.FolioTemplates)) {
  const bbcode = builtinContext.markdownToBB(markdown);
  assert.deepEqual(Array.from(builtinContext.countWarnings(bbcode)), [], id+' compiles without warnings');
  const preview = builtinContext.FolioHorizon.render(bbcode);
  assert.ok(preview.querySelector('h2'), id+' has a rendered heading');
  assert.ok(preview.querySelector('.bbcode-collapse'), id+' has expandable details');
  assert.ok(!preview.textContent.includes(':::') && !preview.textContent.includes('{color:'), id+' has no uncompiled layout markers');
}
const page = fs.readFileSync('index.html', 'utf8');
assert.ok(page.indexOf('<script src="src/templates.js">') < page.indexOf('<script src="src/app.js">'));
console.log('Separate built-in template catalogue compilation and rendering checks passed');
