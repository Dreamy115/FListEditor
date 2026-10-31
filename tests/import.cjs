const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('src/app.js','utf8');
function setup({content='Original',mixed=true,template=false}={}){
 const handlers={},elements=new Map(),messages=[],saved=[];
 const record={id:'one',name:'Original name',content};
 const source={value:content},data={active:'one',mixed};
 let confirmation;
 const $=id=>{if(!elements.has(id))elements.set(id,{addEventListener:(type,fn)=>handlers[id+':'+type]=fn});return elements.get(id)};
 const context=vm.createContext({$,source,data,templateSession:template?record:null,active:()=>record,
  rememberSelection(){},uniqueCharacterName:name=>name,renderDrafts(){},
  updateMode(){record.mixed=data.mixed;saved.push({...record})},
  syncFromEditor(){record.content=source.value},commitEdit(){},
  toast:message=>messages.push(message),requestConfirmation:(message,fn)=>{confirmation=fn}});
 vm.runInContext(app.slice(app.indexOf("$('importBtn').addEventListener"),app.indexOf("document.addEventListener('keydown'")),context);
 return {record,source,data,messages,saved,confirm:()=>confirmation(),
  import:async(name,text)=>{const target={files:[{name,size:100,text:async()=>text}],value:name};await handlers['fileImport:change']({target});assert.equal(target.value,'')}};
}
(async()=>{
 for(const template of [false,true]){
  const test=setup({template});
  await test.import('restored.folio.json',JSON.stringify({name:'Restored',content:'Imported',mixed:false}));
  assert.equal(test.source.value,'Original');assert.equal(test.record.name,'Original name');
  assert.equal(test.data.mixed,true);assert.equal(test.saved.length,0);
  // Dismissing confirmation leaves this untouched state intact.
  test.confirm();
  assert.equal(test.record.name,'Restored');assert.equal(test.source.value,'Imported');
  assert.equal(test.record.content,'Imported');assert.equal(test.record.mixed,false);
  assert.equal(test.saved.at(-1).content,'Imported');
 }
 for(const [filename,initial,expected] of [['source.MD',false,true],['source.BBCODE',true,false],['source.txt',false,false],['source.txt',true,true]]){
  const test=setup({content:'',mixed:initial});await test.import(filename,'New source');
  assert.equal(test.source.value,'New source');assert.equal(test.record.content,'New source');
  assert.equal(test.data.mixed,expected);assert.equal(test.record.mixed,expected);
 }
 const invalid=setup();await invalid.import('invalid.json','null');
 assert.equal(invalid.source.value,'Original');assert.equal(invalid.saved.length,0);
 assert.equal(invalid.messages.at(-1),'Not a valid Folio backup');
 console.log('Profile import replacement, confirmation, template and source mode checks passed');
})().catch(error=>{console.error(error);process.exitCode=1});
