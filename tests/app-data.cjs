const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('src/app.js','utf8');
const handlers={};
const elements=new Map();
const $=id=>{if(!elements.has(id))elements.set(id,{options:[{value:'flist-blue'}],addEventListener:(type,fn)=>{handlers[id+':'+type]=fn}});return elements.get(id)};
let stored='old',confirmation,applied;
const context=vm.createContext({STORAGE:"folio-f-list-studio-v1",$,parsePreviewFontSize:v=>v==='16'?'16':null,clearTimeout:()=>{},saveTimer:1,makeId:()=> 'fresh',requestConfirmation:(message,fn)=>{confirmation=fn},localStorage:{removeItem:()=>{stored=null}},toast:()=>{},replaceAppData:next=>{applied=next;stored='default'}});
vm.runInContext(app.slice(app.indexOf('function validateAppBackup('),app.indexOf('function replaceAppData(')),context);
const backup={format:'folio-app',version:1,data:{drafts:[{id:'one',name:'One',content:'[b]Hello[/b]',mixed:false}],customTemplates:[{id:'custom',name:'Template',content:'# Heading'}],active:'one',mixed:false,previewNoteDismissed:true,editorTheme:'forest',theme:'flist-blue',previewFontSize:'16',splitRatio:.6}};
assert.equal(context.validateAppBackup(backup),backup.data);
for(const modify of [b=>b.version=2,b=>b.data.drafts.push({...b.data.drafts[0]}),b=>b.data.drafts=[null],b=>b.data.active='missing',b=>b.data.splitRatio=9,b=>b.data.customTemplates[0].content=42]){
 const invalid=structuredClone(backup);modify(invalid);assert.throws(()=>context.validateAppBackup(invalid));
}
vm.runInContext(app.slice(app.indexOf("$('purgeData').addEventListener"),app.indexOf("$('importBtn').addEventListener")),context);
handlers['purgeData:click']();assert.equal(stored,'old');assert.equal(applied,undefined);
confirmation();assert.equal(stored,null);assert.equal(applied.drafts[0].content,'');assert.equal(applied.customTemplates.length,0);assert.equal(applied.editorTheme,'folio');
console.log('Full-app backup validation and confirmed purge checks passed');
