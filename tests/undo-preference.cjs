const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('src/app.js','utf8');
const source={value:'literal',selectionStart:0,selectionEnd:0,scrollTop:200,scrollLeft:0,focus(){},setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end}};
const data={active:'one',mixed:true,preferLiterals:true},elements=new Map(),handlers={};
const $=id=>{if(!elements.has(id))elements.set(id,{addEventListener:(type,fn)=>handlers[id+':'+type]=fn});return elements.get(id)};
const context=vm.createContext({source,data,$,templateSession:null,editHistories:new Map(),active:()=>({}),
 updateMode:()=>{$('preferLiterals').checked=data.preferLiterals!==false},updateActiveSyntax:()=>{},syncHighlightScroll:()=>{},scheduleSave:()=>{},
 requestAnimationFrame:()=>{},refresh:()=>{},persist:()=>{},convertEntityPreference:(text,literals)=>literals?'literal':'code'});
vm.runInContext(app.slice(app.indexOf('const MAX_UNDO_STATES='),app.indexOf('const active=')),context);
context.replaceRange=text=>{context.rememberSelection();source.value=text;context.commitEdit('action')};
vm.runInContext(app.slice(app.indexOf("$('preferLiterals').addEventListener('change'"),app.indexOf('function switchMode(')),context);
handlers['preferLiterals:change']({target:{checked:false}});
assert.equal(source.value,'code');assert.equal(data.preferLiterals,false);
context.undoEdit();assert.equal(source.value,'literal');assert.equal(data.preferLiterals,true);assert.equal($('preferLiterals').checked,true);
context.redoEdit();assert.equal(source.value,'code');assert.equal(data.preferLiterals,false);assert.equal($('preferLiterals').checked,false);
// Preference-only changes must also have an undo step.
context.convertEntityPreference=text=>text;
handlers['preferLiterals:change']({target:{checked:true}});
assert.equal(source.value,'code');assert.equal(data.preferLiterals,true);
context.undoEdit();assert.equal(source.value,'code');assert.equal($('preferLiterals').checked,false);
context.redoEdit();assert.equal(source.value,'code');assert.equal($('preferLiterals').checked,true);
assert.equal(source.scrollTop,200);
console.log('Literal preference undo/redo and preference-only history checks passed');
