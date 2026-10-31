
(() => {
'use strict';
const $ = id => document.getElementById(id);
const source = $('source');
let diagnosticHover;
const STORAGE='folio-f-list-studio-v1';
const makeId=()=> 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
// Templates are authored in Extended Markdown, never raw BBCode.
const intro=`:::center
{color:purple|{big|**YOUR CHARACTER NAME**}}
*An intriguing sentence that captures their essence.*
:::

---

## At a glance

**Species:** Your species
**Appearance:** A few memorable details
**Personality:** Three compelling traits

## The story so far

A paragraph or two about who they are, what they want, and what makes them interesting to meet.

:::collapse ✧ More about this character
**Quirks:** A small but distinctive habit

**Hooks:** A reason someone might approach them
:::`;
const templates={
 dossier:intro,
 narrative:`:::center
{color:cyan|{big|**A NAME WRITTEN IN STARS**}}
*“Every story begins somewhere.”*
:::

---

The first thing you notice is…

**Name:** The character's name
**Presence:** Their mannerisms, voice, and bearing

## Who they are

Tell their story in scenes rather than facts. What do they hide? What do they hope for?

:::center
{small|✦ · ✦ · ✦}
:::

:::collapse Rumours and secrets
Details that reward a curious reader.

> “There are two sides to every story.”
:::`,
 compact:`# CHARACTER NAME

*A compact introduction in one sentence.*

---

**Species** · …
**Age** · …
**Build** · …
**Disposition** · …

## Overview

An easy-to-read paragraph about your character.

## Roleplay hooks

- A conversation starter
- A reason to approach
- A possible conflict`,
 archive:`:::center
{color:red|{big|**ARCHIVE // 014**}}
{small|CLASSIFIED PERSONNEL RECORD}
:::

---

{color:red|**SUBJECT DESIGNATION**} : UNKNOWN
{color:red|**CURRENT STATUS**} : ACTIVE
{color:red|**LAST SIGHTING**} : UNCONFIRMED

---

## Subject overview

> Some files were never meant to be read.

Describe the character's appearance and observed behaviours.

:::collapse ACCESS FILE: Incident report
*Restricted information follows.*

- **Date:** Unknown
- **Witness:** {user:Character Name}
:::`
};
function validateCustomTemplates(records){
 if(!Array.isArray(records))return [];
 const seen=new Set();
 return records.filter(record=>{
  if(!record||typeof record.id!=='string'||!record.id||seen.has(record.id)||typeof record.name!=='string'||!record.name.trim()||typeof record.content!=='string'||record.content.length>1500000)return false;
  seen.add(record.id);return true;
 }).slice(0,100).map(record=>({id:record.id,name:record.name.trim().slice(0,100),content:record.content}));
}
let data={customTemplates:[],drafts:[{id:makeId(),name:'New Character',content:intro}],active:null,theme:'flist-blue',editorTheme:'folio',previewFontSize:'16',splitRatio:.524,previewNoteDismissed:false,mixed:true};
data.active=data.drafts[0].id;
try{const loaded=JSON.parse(localStorage.getItem(STORAGE));if(loaded&&Array.isArray(loaded.drafts)&&loaded.drafts.length){const valid=loaded.drafts.filter(d=>typeof d.id==='string'&&typeof d.name==='string'&&typeof d.content==='string').slice(0,80);if(valid.length){data={customTemplates:validateCustomTemplates(loaded.customTemplates),drafts:valid,active:valid.some(d=>d.id===loaded.active)?loaded.active:valid[0].id,editorTheme:['folio','graphite','forest','paper'].includes(loaded.editorTheme)?loaded.editorTheme:'folio',theme:Array.from($('theme').options).some(option=>option.value===loaded.theme)?loaded.theme:'flist-blue',previewFontSize:parsePreviewFontSize(loaded.previewFontSize)||'16',splitRatio:typeof loaded.splitRatio==='number'&&Number.isFinite(loaded.splitRatio)?Math.max(.25,Math.min(.75,loaded.splitRatio)):.524,previewNoteDismissed:loaded.previewNoteDismissed===true,mixed:loaded.mixed!==false}}}}catch(e){}
let saveTimer=null,toastTimer=null;
let templateSession=null,editorLoaded=false;
const templateEditors=new Map(),characterEditors=new Map();
// Undo is managed explicitly because setRangeText() and textarea.value edits do not
// consistently enter the browser's native undo stack across browsers.
const editHistories=new Map();
const MAX_UNDO_STATES=180;
function editorSnapshot(){return {content:source.value,mixed:data.mixed,start:source.selectionStart,end:source.selectionEnd,scroll:source.scrollTop}}
function currentHistory(){
 let h=editHistories.get(templateSession?templateSession.historyId:data.active);
 if(!h){h={states:[editorSnapshot()],index:0,lastKind:null,lastAt:0,lastInputType:null};editHistories.set(templateSession?templateSession.historyId:data.active,h)}
 return h;
}
function refreshUndoButtons(){
 const h=currentHistory();
 $('undoEdit').disabled=h.index===0;
 $('redoEdit').disabled=h.index>=h.states.length-1;
}
// Before replacing a selection, remember the *actual* caret that the user set.
function rememberSelection(){
 const h=currentHistory(),prev=h.states[h.index];
 if(prev.content===source.value&&prev.mixed===data.mixed)h.states[h.index]=editorSnapshot();
}
function commitEdit(kind='action',inputType=''){
 const h=currentHistory(),next=editorSnapshot(),old=h.states[h.index];
 if(next.content===old.content&&next.mixed===old.mixed){h.states[h.index]=next;refreshUndoButtons();return}
 if(h.index<h.states.length-1)h.states.splice(h.index+1);
 const now=Date.now();
 const canGroup=kind==='typing'&&h.lastKind==='typing'&&h.lastInputType===inputType&&
  ['insertText','deleteContentBackward','deleteContentForward','insertCompositionText'].includes(inputType)&&
  now-h.lastAt<650;
 if(canGroup)h.states[h.index]=next;
 else{h.states.push(next);h.index++}
 if(h.states.length>MAX_UNDO_STATES){h.states.shift();h.index--}
 h.lastKind=kind;h.lastInputType=inputType;h.lastAt=now;
 refreshUndoButtons();
}
function restoreEdit(state){
 const scrollTop=source.scrollTop,scrollLeft=source.scrollLeft;
 const selectionStart=source.selectionStart,selectionEnd=source.selectionEnd,direction=source.selectionDirection;
 data.mixed=state.mixed;source.value=state.content;
 active().content=state.content;
 if(templateSession)updateTemplateStatus();
 updateMode();
 source.focus({preventScroll:true});
 source.setSelectionRange(Math.min(selectionStart,source.value.length),Math.min(selectionEnd,source.value.length),direction);
 updateActiveSyntax();
 const start=source.selectionStart,end=source.selectionEnd;
 const restoreScroll=()=>{source.scrollTop=scrollTop;source.scrollLeft=scrollLeft;syncHighlightScroll()};
 restoreScroll();
 // Browsers may reveal the restored selection after assigning textarea.value.
 // Keep the current viewport even when that caret is far outside it.
 requestAnimationFrame(()=>{
  if(source.value===state.content&&source.selectionStart===start&&source.selectionEnd===end)restoreScroll();
 });
 scheduleSave();refreshUndoButtons();
}
function undoEdit(){const h=currentHistory();if(!h.index)return;h.index--;h.lastKind=null;restoreEdit(h.states[h.index])}
function redoEdit(){const h=currentHistory();if(h.index>=h.states.length-1)return;h.index++;h.lastKind=null;restoreEdit(h.states[h.index])}
$('undoEdit').addEventListener('click',undoEdit);
$('redoEdit').addEventListener('click',redoEdit);
const active=()=>templateSession||data.drafts.find(d=>d.id===data.active)||data.drafts[0];
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(templateSession?{...data,mixed:templateSession.returnContext.mixed}:data));$('saveStatus').textContent=templateSession&&templateDirty()?'Template changes not saved':'● Saved locally';return true}catch(e){$('saveStatus').textContent='⚠ Storage unavailable';return false}}
function scheduleSave(){ $('saveStatus').textContent='◌ Saving…';clearTimeout(saveTimer);saveTimer=setTimeout(persist,260) }
let pendingConfirm=null;
function requestConfirmation(message,callback){pendingConfirm=callback;$('confirmText').textContent=message;$('confirmBar').hidden=false;}
function clearConfirmation(){pendingConfirm=null;$('confirmBar').hidden=true;}
$('confirmYes').addEventListener('click',()=>{const action=pendingConfirm;clearConfirmation();if(action)action()});
$('confirmNo').addEventListener('click',clearConfirmation);
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200)}
function cloneName(name,records){
 const names=new Set(records.map(record=>record.name));
 for(let count=1;;count++){const suffix=count===1?' copy':' copy '+count;const candidate=(name||'Untitled').slice(0,100-suffix.length)+suffix;if(!names.has(candidate))return candidate}
}
function cloneCharacter(id){
 stashEditor();const original=data.drafts.find(record=>record.id===id);if(!original)return;
 if(data.drafts.length>=80){toast('Maximum 80 characters. Delete one before cloning.');return}
 const mixed=characterEditors.get(id)?.mixed??(typeof original.mixed==='boolean'?original.mixed:templateSession?templateSession.returnContext.mixed:data.mixed);
 const copy={id:makeId(),name:cloneName(original.name,data.drafts),content:original.content,mixed};
 data.drafts.unshift(copy);loadDraft(copy.id);$('profileName').focus();$('profileName').select();toast('Character cloned');
}
function renderDrafts(){
 const list=$('draftList');list.replaceChildren();
 for(const d of data.drafts){
  const btn=document.createElement('button');btn.className='draft'+(!templateSession&&d.id===data.active?' active':'');btn.title=d.name;
  const label=document.createElement('span');label.textContent=d.name;btn.append(label);btn.addEventListener('click',()=>loadDraft(d.id));
  list.append(btn);
 }
 renderTemplateTargets();
}
function stashEditor(){
 if(!editorLoaded)return;
 rememberSelection();
 const context={mixed:data.mixed,start:source.selectionStart,end:source.selectionEnd,scroll:source.scrollTop};
 active().content=source.value;
 if(templateSession)Object.assign(templateSession,context,{name:$('profileName').value});
 else characterEditors.set(data.active,context);
}
function loadDraft(id){
 const fallbackMode=templateSession?templateSession.returnContext.mixed:data.mixed;
 stashEditor();clearConfirmation();templateSession=null;data.active=id;setTemplateEditorUI(false);
 const d=active(),context=characterEditors.get(id);
 data.mixed=context?context.mixed:typeof d.mixed==='boolean'?d.mixed:fallbackMode;source.value=d.content;$('profileName').value=d.name;
 editorLoaded=true;renderDrafts();renderCustomTemplates();updateMode();
 const h=editHistories.get(id);if(h&&(h.states[h.index].content!==source.value||h.states[h.index].mixed!==data.mixed))editHistories.delete(id);
 refreshUndoButtons();
 source.setSelectionRange(context?context.start:0,context?context.end:0);source.scrollTop=context?context.scroll:0;
}

function updateMode(){
 if(templateSession)templateSession.mixed=data.mixed;else if(editorLoaded)active().mixed=data.mixed;
 $('mixedMode').classList.toggle('active',data.mixed);
 $('bbMode').classList.toggle('active',!data.mixed);
 $('mixedMode').setAttribute('aria-pressed',String(data.mixed));
 $('bbMode').setAttribute('aria-pressed',String(!data.mixed));
 $('modeHint').textContent=data.mixed
  ? 'Markdown and custom macros. Switch to BBCode to compile; switch back to decompile.'
  : 'Plain F-List BBCode. Switch to Markdown+ to decompile into editable Markdown and macros.';
 refresh();persist();
}
function wrapInline(tag,placeholder='your text'){
 const s=source.selectionStart,e=source.selectionEnd,selected=source.value.slice(s,e)||placeholder;
 let prefix='['+tag+']',suffix='[/'+tag.split('=')[0]+']',block=false;
 if(tag==='heading'){prefix='[heading][big]';suffix='[/big][/heading]'}
 if(data.mixed){
  if(tag==='quote'){
   const lead=s>0&&source.value[s-1]!=='\n'?'\n':'';
   const tail=e<source.value.length&&source.value[e]!=='\n'?'\n':'';
   const quoted=selected.split('\n').map(line=>'> '+line).join('\n');
   replaceRange(lead+quoted+tail,s,e,s+lead.length+2,s+lead.length+quoted.length);return;
  }
  const marks={b:'**',i:'*',u:'++',s:'~~'};
  if(marks[tag]&&!selected.includes('\n')){prefix=marks[tag];suffix=marks[tag]}
  else if(tag==='heading'&&!selected.includes('\n')){prefix='# ';suffix='';block=true}
  else if(tag==='big'&&!selected.includes('\n')){prefix='{big|';suffix='}'}
  else if(tag==='heading'){prefix=':::heading\n:::big\n';suffix='\n:::\n:::';block=true}
  else if(tag==='center'||selected.includes('\n')){prefix=':::'+tag+'\n';suffix='\n:::';block=true}
  else{prefix='{'+tag+'|';suffix='}'}
 }
 const lead=block&&s>0&&source.value[s-1]!=='\n'?'\n':'';
 const tail=block&&e<source.value.length&&source.value[e]!=='\n'?'\n':'';
 replaceRange(lead+prefix+selected+suffix+tail,s,e,s+lead.length+prefix.length,s+lead.length+prefix.length+selected.length);
}
function replaceRange(text,s=source.selectionStart,e=source.selectionEnd,selStart=s+text.length,selEnd=selStart){rememberSelection();source.focus();source.setRangeText(text,s,e,'end');source.setSelectionRange(selStart,selEnd);syncFromEditor();commitEdit('action')}
function addLine(text){const s=source.selectionStart,e=source.selectionEnd,lead=s>0&&source.value[s-1]!=='\n'?'\n':'',tail=e<source.value.length&&source.value[e]!=='\n'?'\n':'';replaceRange(lead+text+tail,s,e,s+lead.length+text.length,s+lead.length+text.length)}
function getCompiled(){return normalizeColorTags(data.mixed?markdownToBB(source.value):source.value)}
// Extended Markdown compiles to the ordinary F-List tags, never custom tags in the export.
const macroInlineNames=new Set(['color','b','i','s','big','small','u','underline','sup','sub','user','icon','eicon','img','image','link','noparse','br','heading','hr']);
const macroBlockNames=new Set(['center','left','right','justify','indent','quote','collapse','big','small','color','heading','b','i','u','s']);
// F-List accepts exactly these twelve named colors, not arbitrary CSS hex codes.
const presetColors={
 red:'#f00',orange:'#f60',yellow:'#ff0',green:'#0f0',
 cyan:'#0ff',purple:'#93f',blue:'#06f',pink:'#f9c',
 black:'#000',brown:'#8a6d3b',white:'#fff',gray:'#ccc'
};
const colorNames=Object.keys(presetColors);
function colorSafe(param){const name=String(param||'').trim().toLowerCase();return Object.hasOwn(presetColors,name)?name:null}
function hexRGB(hex){const raw=String(hex||'').trim().replace(/^#/,'');if(!/^(?:[a-f0-9]{3}|[a-f0-9]{6})$/i.test(raw))return null;
 const h=raw.length===3?[...raw].map(c=>c+c).join(''):raw;return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));}
function closestPreset(hex){const rgb=hexRGB(hex);if(!rgb)return null;let best=null,dist=Infinity;
 for(const name of colorNames){const candidate=hexRGB(presetColors[name]);const d=rgb.reduce((sum,part,i)=>sum+Math.pow(part-candidate[i],2),0);
  if(d<dist){dist=d;best=name}}
 return best;}
function resolvedColor(value){return colorSafe(value)||closestPreset(value)}
// Existing drafts may contain old hex colors or arbitrary [color=...] tags.
// Normalize on output without changing the original text until a mode switch.
function normalizeColorTags(text){const re=/\[(\/)?(color|noparse)(?:=([^\]\n]*))?\]/gi;let out='',last=0,insideLiteral=false;const stack=[];let m;
 while((m=re.exec(text))){out+=text.slice(last,m.index);last=re.lastIndex;
  const close=!!m[1],tag=m[2].toLowerCase();
  if(tag==='noparse'){out+=m[0];insideLiteral= !close;continue}
  if(insideLiteral){out+=m[0];continue}
  if(close){out+=stack.length?(stack.pop()?'[/color]':''):'';continue}
  const name=resolvedColor(m[3]);stack.push(!!name);out+=name?'[color='+name+']':'';
 }
 return out+text.slice(last);
}
function colorWarning(value){
 if(colorSafe(value))return null;
 const label=String(value||'').trim()||'(missing value)',preset=closestPreset(value);
 return preset?'Color '+label+' is not supported by F-List profiles; exported as '+preset:'Color '+label+' is not supported by F-List profiles; formatting is stripped on export';
}
function colorWarnings(text,mixed=true){
 const issues=[];
 // Literal examples are not color definitions.
 text=text.replace(/\[noparse\][\s\S]*?(?:\[\/noparse\]|$)/gi,'');
 if(mixed)text=text.replace(/^\s*```[^\n]*\n[\s\S]*?(?:^\s*```[^\n]*(?:\n|$)|(?![\s\S]))/gm,'').replace(/`[^`\n]+`/g,'');
 const check=value=>{const warning=colorWarning(value);if(warning)issues.push(warning)};
 for(const m of text.matchAll(/\[color(?:=([^\]\n]*))?\]/gi))check(m[1]);
 if(mixed){
  for(const m of text.matchAll(/\{color(?::([^|}\n]*))?\|/gi))check(m[1]);
  for(const m of text.matchAll(/^\s*:::color(?:[ \t]+([^\n]*))?$/gmi))check(m[1]);
 }
 return [...new Set(issues)];
}
function inlineMarkdown(text,protectedParts=[],issues=[]){
 const warn=message=>issues.push(message);
 const protect=value=>{const id=protectedParts.length;protectedParts.push(value);return '\uE000'+id+'\uE001'};
 // Shield literal inline code before interpreting any BBCode or custom macros.
 text=text.replace(/`([^`\n]+)`/g,(_,literal)=>protect('[noparse]'+literal+'[/noparse]'));
 // Shield raw BBCode tag delimiters (the contents still accept Markdown).
 text=text.replace(/\[\/?(?:b|i|u|s|sup|sub|heading|big|small|center|right|left|justify|indent|quote|color|url|collapse|img|user|icon|eicon|noparse|hr)(?:=[^\]\n]*)?\]/gi,m=>protect(m));
 // Support nested inline macros, e.g. {color:purple|**bright**}.
 let output='';
 for(let i=0;i<text.length;){
  if(text[i]==='\\' && i+1<text.length && /[{}*_~+`\[\]\\#>\-]/.test(text[i+1])){output+=protect(text[i+1]);i+=2;continue}
  if(text[i]!=='{'){output+=text[i++];continue}
  let depth=1,j=i+1;for(;j<text.length&&depth;j++){if(text[j]==='{'&&text[j-1]!=='\\')depth++;else if(text[j]==='}'&&text[j-1]!=='\\')depth--}
  if(depth){if(/^[a-z][a-z0-9_-]*(?=[:|}\s]|$)/i.test(text.slice(i+1)))warn('Unclosed inline macro: '+text.slice(i));output+=text[i++];continue}
  const expression=text.slice(i+1,j-1),m=expression.match(/^([a-z]+)(:([^|]*))?(?:\|([\s\S]*))?$/i);
  if(!m||!macroInlineNames.has(m[1].toLowerCase())){warn('Invalid or unknown inline macro: '+text.slice(i,j)+'; exported as literal text');output+=text.slice(i,j);i=j;continue}
  const name=m[1].toLowerCase(),arg=(m[3]||'').trim(),body=m[4];let compiled=null;
  if(name==='br'&&body===undefined&&!arg)compiled='\n';
  else if(name==='hr'&&body===undefined&&!arg)compiled='[hr]';
  else if(name==='color'&&body!==undefined){const color=resolvedColor(arg);const content=inlineMarkdown(body,protectedParts,issues);compiled=color?'[color='+color+']'+content+'[/color]':content;}
  else if(['b','i','s','big','small','u','underline','sup','sub','noparse','heading'].includes(name)&&body!==undefined){let tag=name==='underline'?'u':name;compiled='['+tag+']'+(name==='noparse'?body:inlineMarkdown(body,protectedParts,issues))+'[/'+tag+']'}
  else if(['user','icon','eicon'].includes(name)&&arg&&body===undefined&&!/[\[\]{}]/.test(arg))compiled='['+name+']'+arg+'[/'+name+']';
  else if(['img','image'].includes(name)&&arg){if(/^\d+$/.test(arg))compiled='[img='+arg+']'+(body===undefined?'':body)+'[/img]';else if(body===undefined&&safeUrl(arg))compiled='[img]'+arg+'[/img]'}
  else if(name==='link'&&safeUrl(arg)&&body!==undefined)compiled='[url='+arg+']'+inlineMarkdown(body,protectedParts,issues)+'[/url]';
  if(compiled===null)warn('Invalid inline macro: '+text.slice(i,j)+'; exported as literal text');
  output+=compiled===null?text.slice(i,j):protect(compiled);i=j;
 }
 text=output;
 text=text.replace(/<(https?:\/\/[^<>\s]+)>/gi,(match,url)=>safeUrl(url)?protect('[url]'+url+'[/url]'):match);
 // Protect links and images, and ensure only valid http(s) URLs are exported.
 text=text.replace(/!?\[([^\]\n]*)\]\((https?:\/\/[^\s)]+)\)/gi,(match,label,url)=>{
  if(!safeUrl(url))return match;
  return protect(match.startsWith('!')?'[img]'+url+'[/img]':'[url='+url+']'+inlineMarkdown(label,protectedParts,issues)+'[/url]');
 });
 text=text.replace(/\*\*\*([^*\n]+)\*\*\*/g,'[b][i]$1[/i][/b]')
  .replace(/\*\*([^*\n]+)\*\*/g,'[b]$1[/b]')
  .replace(/__([^_\n]+)__/g,'[b]$1[/b]')
  .replace(/~~([^~\n]+)~~/g,'[s]$1[/s]')
  .replace(/\+\+([^+\n]+)\+\+/g,'[u]$1[/u]')
  .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g,'[i]$1[/i]')
  .replace(/(?<!\w)_([^_\n]+)_(?!\w)/g,'[i]$1[/i]');
 let revealed=text;for(let n=0;n<16&&revealed.includes('\uE000');n++){const next=revealed.replace(/\uE000(\d+)\uE001/g,(_,id)=>protectedParts[+id]??'');if(next===revealed)break;revealed=next}return revealed;
}
function markdownToBB(input,issues=[]){
 const lines=input.replace(/\r\n?/g,'\n').split('\n'),parts=[],stack=[];
 // Only content lines contribute breaks. Macro/fence delimiters attach to their
 // contents: pretty-printing BBCode tags would create visible F-List spacing.
 let pendingBreak=false,afterClose=false,trailingHeading=false;
 const beforeLine=()=>{if(pendingBreak)parts.push('\n');pendingBreak=false};
 const out={
  push(value){if(value===''&&afterClose){parts.push('\n');return}beforeLine();parts.push(value);pendingBreak=true;afterClose=false},
  open(value){pendingBreak=false;afterClose=false;parts.push(value)},
  close(value){pendingBreak=false;afterClose=true;parts.push(value)},
  heading(value){pendingBreak=false;afterClose=true;trailingHeading=true;parts.push(value)}
 };
 let inFence=false,inNoParse=false;
 for(let index=0;index<lines.length;index++){
  let line=lines[index];
  if(index===lines.length-1&&line===''&&trailingHeading)continue;
  if(line!=='')trailingHeading=false;
  const soft=!inFence&&!inNoParse&&index<lines.length-1&&((line.match(/\\+$/)||[''])[0].length%2===1);
  if(soft)line=line.slice(0,-1).replace(/[ \t]*$/,' ');
  try{
  const trimmed=line.trim();
  // A fenced code block is literal text. F-List supports noparse, not Markdown fences.
  if(/^```/.test(trimmed)){if(!inNoParse){if(inFence)out.close('[/noparse]');else out.open('[noparse]');inFence=!inFence;continue}}
  if(inFence){out.push(line);continue}
  if(inNoParse){out.push(line);if(/\[\/noparse\]/i.test(line))inNoParse=false;continue}
  if(/\[noparse\]/i.test(line)){inNoParse=!/\[\/noparse\]/i.test(line);out.push(line);continue}
  if(trimmed===':::'){
   if(stack.length){const closing=stack.pop();if(closing)out.close('[/'+closing+']');continue}
   issues.push('Unmatched block macro closing marker: :::; exported as literal text');out.push(line);continue;
  }
  const block=line.match(/^\s*:::([a-z]+)(?:\s+(.+))?\s*$/i);
  if(block){const tag=block[1].toLowerCase(),arg=(block[2]||'').trim();
   if(macroBlockNames.has(tag)){
    if(tag==='color'&&!resolvedColor(arg)){stack.push('');continue;}
    if((tag==='collapse'&&arg&&!/[\[\]]/.test(arg))||(tag==='color'&&resolvedColor(arg))||(!['collapse','color'].includes(tag)&&!arg)){
     out.open('['+tag+(arg?'='+(tag==='color'?resolvedColor(arg):arg):'')+']');stack.push(tag);continue;
    }
   }
   issues.push('Invalid or unknown block macro: '+trimmed+'; exported as literal text');
  }else if(trimmed.startsWith(':::'))issues.push('Malformed block macro: '+trimmed+'; exported as literal text');
  const heading=line.match(/^[ \t]*(#{1,6})[ \t]+(.*)$/);
  if(heading){
   const level=heading[1].length,rawHeading=heading[2].replace(/\s+#+\s*$/,'');
   const content=inlineMarkdown(soft?rawHeading.replace(/[ \t]+$/,''):rawHeading,[],issues);
   // Heading lines are structural, like ::: boundaries and dividers.
   // Their editing newline must not become an extra F-List line break.
   out.heading(level===1?'[heading][big]'+content+'[/big][/heading]':'[heading]'+content+'[/heading]');
   if(soft)parts.push(' ');
   continue;
  }
  if(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)){out.close('[hr]');continue}
  const quote=line.match(/^[ \t]*>[ \t]?(.*)$/);
  if(quote){
   const body=[quote[1]];
   while(index+1<lines.length){const next=lines[index+1].match(/^[ \t]*>[ \t]?(.*)$/);if(!next)break;body.push(next[1]);index++}
   out.push('[quote]'+markdownToBB(body.join('\n'),issues)+'[/quote]');continue;
  }
  const bullet=line.match(/^([ \t]*)[-*+]([ \t]+)(.*)$/);
  if(bullet){out.push(bullet[1]+'•'+bullet[2]+inlineMarkdown(bullet[3],[],issues));continue}
  // Numbered lists are already readable as plain text on F-List.
  out.push(inlineMarkdown(line,[],issues));
  }finally{if(soft)pendingBreak=false}
 }
 // Do not silently drop a missing closing ::: marker.
 while(stack.length){const closing=stack.pop();issues.push('Unclosed block macro'+(closing?': :::'+closing:'')+'; closing marker added on export');if(closing)out.close('[/'+closing+']')}
 if(inFence)out.close('[/noparse]');
 return parts.join('');
}
const allowedTags=new Set(['b','i','u','s','sup','sub','heading','big','small','center','right','left','justify','indent','quote','color','url','collapse','img','user','icon','eicon','noparse','hr']);
function safeUrl(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:null}catch(e){return null}}
// Convert a BBCode syntax tree to Extended Markdown. Keep constructs verbatim when
// their Markdown equivalent cannot be compiled back without semantic changes.
const convertibleTags=new Set(['b','i','u','s','sup','sub','heading','big','small','center','right','left','justify','indent','quote','color','url','collapse','img','user','icon','eicon','noparse','hr']);
function parseBBCode(input){
 const root={tag:null,children:[]},stack=[root],token=/\[(\/?)(([a-z]+))(?:=([^\]\n]*))?\]/gi;
 let last=0,m;
 const add=text=>{if(text)stack.at(-1).children.push({text})};
 while((m=token.exec(input))){
  const tag=m[2].toLowerCase(),param=m[4]||'',close=!!m[1];
  if(!convertibleTags.has(tag))continue;
  if(stack.at(-1).tag==='noparse'&&!(close&&tag==='noparse'))continue;
  if(['user','icon','eicon','img'].includes(stack.at(-1).tag)&&!(close&&tag===stack.at(-1).tag))continue;
  add(input.slice(last,m.index));last=token.lastIndex;
  if(tag==='hr'&&!close){stack.at(-1).children.push({tag:'hr',children:[],open:'[hr]'});continue}
  if(close){
   if(stack.length>1&&stack.at(-1).tag===tag){stack.pop()}
   else add(m[0]); // Crossing/unmatched tags must never be silently moved.
  }else{
   const node={tag,param,children:[],open:m[0],closed:false};
   stack.at(-1).children.push(node);stack.push(node);
  }
 }
 add(input.slice(last));
 // Incomplete BBCode stays literal (including any nested content).
 function mark(node){if(!node.children)return;node.children.forEach(mark);if(node.tag&&stack.includes(node))node.unclosed=true}
 mark(root);
 return root;
}
function escapePlainMarkdown(text){
 return text.replace(/([\\*_{}`~+])/g,'\\$1')
  .replace(/^(\s*)(#{1,6}\s|>\s|[-*+]\s|(?:-{3,}|\*{3,}|_{3,})\s*$)/gm,(_,indent,lead)=>indent+'\\'+lead);
}
function bbcodeToMarkdown(input,escapePlain=true){
 const normalized=normalizeColorTags(input),tree=parseBBCode(normalized);
 let preserveLayout=false,editableLayout=false;
 const blockTags=new Set(['center','left','right','justify','indent','quote','collapse']);
 const raw=node=>node.text!==undefined?node.text:node.tag==='hr'?'[hr]':node.open+node.children.map(raw).join('')+(node.unclosed?'':'[/'+node.tag+']');
 const children=node=>node.children.map(convert).join('');
 const hasBlocks=node=>node.children.some(child=>child.tag&&(blockTags.has(child.tag)||child.tag==='heading'||hasBlocks(child)));
 const boundaries=value=>'\uE006'+value+'\uE007';
 function block(tag,arg,body){if(editableLayout)return boundaries(':::'+tag+(arg?' '+arg:'')+'\uE007'+body+'\uE006:::');return boundaries(':::'+tag+(arg?' '+arg:'')+'\n'+body+'\n:::')}
 function convert(node){
  if(node.text!==undefined)return escapePlain?escapePlainMarkdown(node.text):node.text;
  if(!node.tag)return children(node);
  if(node.unclosed)return raw(node);
  const tag=node.tag,content=children(node),plain=node.children.map(raw).join('');
  const inline=!/[\r\n]/.test(content)&&!hasBlocks(node);
  // Markdown block syntax needs its own lines. Keep BBCode wrappers when
  // those syntax boundaries would change significant whitespace on export.
  if(preserveLayout&&(blockTags.has(tag)||['heading','hr','noparse'].includes(tag)||!inline)){
   if(tag==='hr')return '[hr]';
   if(tag==='noparse')return raw(node);
   return node.open+content+'[/'+tag+']';
  }
  if(tag==='hr')return boundaries('---');
  if(tag==='heading'){
   if(editableLayout||!inline)return block('heading','',content);
   const large=node.children.length===1&&node.children[0].tag==='big';
   return boundaries(large?'# '+children(node.children[0]):'## '+content);
  }
  if(tag==='big'&&inline&&!editableLayout&&!preserveLayout)return '{big|'+content+'}';
  if(['b','i','u','s'].includes(tag)){
   const marks={b:'**',i:'*',u:'++',s:'~~'};
   if(!inline)return block(tag,'',content);
   // Nested emphasis with surrounding prose is ambiguous to the compact parser.
   const nestedEmphasis=node.children.some(c=>['b','i'].includes(c.tag));
   const simpleBoldItalic=tag==='b'&&node.children.length===1&&node.children[0].tag==='i'&&node.children[0].children.every(c=>c.text!==undefined);
   if(['b','i','s'].includes(tag)&&nestedEmphasis&&!simpleBoldItalic)return '{'+tag+'|'+content+'}';
   return marks[tag]+content+marks[tag];
  }
  if(['sup','sub','big','small'].includes(tag))return inline?'{'+tag+'|'+content+'}':block(tag,'',content);
  if(tag==='color'){
   const name=colorSafe(node.param);if(!name)return content;
   return inline?'{color:'+name+'|'+content+'}':block('color',name,content);
  }
  if(tag==='quote'&&!editableLayout)return boundaries(content.split('\n').map(line=>'> '+line).join('\n'));
  if(blockTags.has(tag)){
   if(tag==='collapse'&&(!node.param||/[\[\]\n]/.test(node.param)))return raw(node);
   return block(tag,tag==='collapse'?node.param:'',content);
  }
  if(tag==='url'){
   if(!node.param)return safeUrl(plain)&&!/[<>\s]/.test(plain)?'<'+plain+'>':raw(node);
   if(!safeUrl(node.param))return raw(node);
   if(inline&&!/[\[\]]/.test(content))return '['+content+']('+node.param+')';
   if(inline&&!/[{}]/.test(content))return '{link:'+node.param+'|'+content+'}';
   return raw(node);
  }
  if(['user','icon','eicon'].includes(tag))return /^[^{}\[\]\n]+$/.test(plain)?'{'+tag+':'+plain+'}':raw(node);
  if(tag==='img'){
   if(node.param&&/^\d+$/.test(node.param)&&!/[{}\r\n]/.test(plain))return '{img:'+node.param+(plain?'|'+plain:'')+'}';
   if(!node.param&&safeUrl(plain)&&!/[\s)]/.test(plain))return '![]('+plain+')';
   if(!node.param&&plain===plain.trim()&&safeUrl(plain))return '{img:'+plain+'}';
   return raw(node);
  }
  if(tag==='noparse'){
   if(plain&&!/[`\r\n]/.test(plain))return '`'+plain+'`';
   if(!/[{}\n]/.test(plain))return '{noparse|'+plain+'}';
   if(!/```|\[\/noparse\]/i.test(plain))return boundaries('```\n'+plain+'\n```');
   return raw(node);
  }
  return raw(node);
 }
 const result=children(tree);
 const restoreHashBoundaryBreaks=(markdown,expected)=>{
  for(const match of [...markdown.matchAll(/^#{1,6} [^\n]*(?:\n|$)/gm)].reverse()){
   const line=match[0],start=match.index,end=start+line.length;
   const addBefore=start>0&&markdown[start-1]==='\n',atEnd=end===markdown.length,addAfter=(end<markdown.length&&markdown[end-1]==='\n')||(atEnd&&expected.endsWith('\n'));
   for(const before of (addBefore?[false,true]:[false]))for(const after of (addAfter?[false,true]:[false])){
    if(!before&&!after)continue;
    const afterText=after?(atEnd?'\n'.repeat((expected.match(/\n+$/)||[''])[0].length+1):'\n'):'';
    const candidate=markdown.slice(0,start)+(before?'\n':'')+line+afterText+markdown.slice(end);
    if(markdownToBB(candidate)===expected)return candidate;
   }
  }
  return markdown;
 };
 // Boundary sentinels ensure the Markdown syntax lands on its own line,
 // while reusing line breaks that were already present in the BBCode.
 let markdown=result.replace(/[\uE006\uE007\n]+/g,part=>'\n'.repeat(Math.max(1,(part.match(/\n/g)||[]).length))).trim();
 const expected=normalized.replace(/\r\n?/g,'\n');
 if(markdownToBB(markdown)!==expected)markdown=restoreHashBoundaryBreaks(markdown,expected);
 if(markdownToBB(markdown)===expected)return preferStandardMarkdown(markdown);
 editableLayout=true;
 const structured=children(tree).replace(/^[\uE006\uE007]+|[\uE006\uE007]+$/g,'');
 let editable=structured.replace(/[\uE006\uE007\n]+/g,(part,offset)=>'\n'.repeat((part.match(/\n/g)||[]).length+(/[\uE006\uE007]/.test(part)&&offset+part.length<structured.length?1:0)));
 if(markdownToBB(editable)!==expected)editable=restoreHashBoundaryBreaks(editable,expected);
 if(markdownToBB(editable)===expected)return preferStandardMarkdown(editable);
 editableLayout=false;preserveLayout=true;
 return preferStandardMarkdown(children(tree));
}
// Choose heading notation locally, so one tightly packed heading does not
// force every other heading in the profile back to explicit macros.
function preferHashHeadings(markdown){
 const expected=markdownToBB(markdown);
 const unwrapBig=text=>{
  if(!text.startsWith('{big|')||!text.endsWith('}'))return null;
  let depth=0;
  for(let i=0;i<text.length;i++){
   if(text[i]==='\\'){i++;continue}
   if(text[i]==='{')depth++;
   if(text[i]==='}'&&--depth===0&&i!==text.length-1)return null;
  }
  return depth===0?text.slice(5,-1):null;
 };
 const candidates=[...markdown.matchAll(/^:::heading\n([^\n]*)\n:::/gm).map(match=>{
  const large=unwrapBig(match[1]);return {start:match.index,length:match[0].length,replacement:large===null?'## '+match[1]:'# '+large};
 })];
 // Find balanced inline big macros too, including when the BBCode heading was
 // adjacent to prose and the editable fallback could not put the macro alone.
 for(let start=markdown.indexOf('{big|');start>=0;start=markdown.indexOf('{big|',start+1)){
  let depth=0,end=-1;
  for(let i=start;i<markdown.length;i++){
   if(markdown[i]==='\\'){i++;continue}
   if(markdown[i]==='{')depth++;
   else if(markdown[i]==='}'&&--depth===0){end=i+1;break}
  }
  if(end<0)continue;
  const body=unwrapBig(markdown.slice(start,end));if(body!==null&&start>=3&&markdown.slice(start-3,start)==='## '){
   const headingStart=start-3;
   candidates.push({start:headingStart,length:end-headingStart,replacement:'# '+body});
  }
 }
 // Work backwards to keep offsets stable after each accepted replacement.
 for(const candidate of candidates.sort((a,b)=>b.start-a.start)){
  const rewritten=standardMarkdownRewrite(markdown,candidate.start,candidate.length,candidate.replacement,expected);
  if(rewritten!==null)markdown=rewritten;
 }
 return markdown;
}
function standardMarkdownRewrite(markdown,start,length,replacement,expected){
 const before=markdown.slice(0,start),after=markdown.slice(start+length);
 // Macro boundaries absorb a source newline; Markdown prose does not. Try
 // reusing that boundary before retaining an unnecessary visible blank line.
 const prefixes=[before,before.replace(/\n$/,'')],suffixes=[after,after.replace(/^\n/,'')];
 if(/^#{1,6} /.test(replacement)){
  if(before&& !before.endsWith('\n'))prefixes.push(before+'\n');
  if(before.endsWith('\n'))prefixes.push(before+'\n');
  if(after&& !after.startsWith('\n'))suffixes.push('\n'+after);
  if(after.startsWith('\n')||after==='')suffixes.push('\n'+after);
 }
 for(const prefix of prefixes){
  for(const suffix of suffixes){
   const candidate=prefix+replacement+suffix;
   if(markdownToBB(candidate)===expected)return candidate;
  }
 }
 return null;
}
// Prefer standard notation locally; a packed quote must not force unrelated
// quotes back to macros. Validate every rewrite against significant whitespace.
function preferStandardMarkdown(markdown){
 markdown=preferHashHeadings(markdown);
 const expected=markdownToBB(markdown);
 // F-List lists are plain text bullets/numbers, not [list] tags. Recover the
 // Markdown bullet marker while keeping every indentation and separator byte.
 // Include quote prefixes so lists inside > blocks remain editable too.
 const bullets=/^((?:[ \t]*>[ \t]?)*[ \t]*)•([ \t]+)/gm;
 for(const match of [...markdown.matchAll(bullets)].reverse()){
  const candidate=markdown.slice(0,match.index)+match[1]+'-'+match[2]+markdown.slice(match.index+match[0].length);
  if(markdownToBB(candidate)===expected)markdown=candidate;
 }
 let changed=true;
 while(changed){
  changed=false;
  const lines=markdown.split('\n');let offset=0;
  for(let index=0;index<lines.length;index++){
   const line=lines[index],start=offset;offset+=line.length+1;
   if(line!==':::quote')continue;
   let depth=1,end=index+1;
   for(;end<lines.length;end++){
    if(lines[end]===':::'){if(!--depth)break}
    else if(/^:::[a-z]+(?:\s|$)/i.test(lines[end]))depth++;
   }
   if(depth)continue;
   const original=lines.slice(index,end+1).join('\n');
   const content=preferStandardMarkdown(lines.slice(index+1,end).join('\n'));
   const body=content.split('\n').map(text=>'> '+text).join('\n');
   const candidate=standardMarkdownRewrite(markdown,start,original.length,body,expected);
   if(candidate!==null){markdown=candidate;changed=true;break}
  }
 }
 return markdown;
}
function renderBB(input){return FolioHorizon.render(input)}
function countWarnings(compiled){
 const issues=[],stack=[];let literal=false;
 for(const m of compiled.matchAll(/\[(\/?)([a-z][a-z0-9_-]*|\*)(?:=[^\]\n]*)?\]/gi)){
  const tag=m[2].toLowerCase(),close=!!m[1];
  if(literal){if(close&&tag==='noparse'){literal=false;stack.pop()}continue}
  if(!allowedTags.has(tag)){issues.push('['+tag+'] is not supported by F-List profiles');continue}
  if(tag==='color'&&!close){const warning=colorWarning(m[0].match(/^\[color=([^\]]*)\]$/i)?.[1]);if(warning)issues.push(warning)}
  if(tag==='hr'){if(close)issues.push('Unmatched [/hr]');continue}
  if(close){
   const index=stack.lastIndexOf(tag);
   if(index<0)issues.push('Unmatched [/'+tag+']');
   else{if(index!==stack.length-1)issues.push('Misnested [/'+tag+']: close ['+stack.at(-1)+'] first');stack.splice(index,1)}
  }else{stack.push(tag);if(tag==='noparse')literal=true}
 }
 for(const tag of stack)issues.push('Unclosed ['+tag+']');
 const parsedText=compiled.replace(/\[noparse\][\s\S]*?(?:\[\/noparse\]|$)/gi,'');
 if(/\[img\][\s\S]*?\[\/img\]|\[img=(?!\d+\])[^\]\n]*\]/i.test(parsedText))issues.push('External image URLs are not supported by F-List profiles; use an uploaded profile image ID such as [img=12345] instead');
 if(/<\/?(?:div|span|table|p|br)\b/i.test(parsedText))issues.push('HTML is not supported in descriptions');
 return [...new Set(issues)];
}
function macroWarnings(text){
 const issues=[];markdownToBB(text,issues);
 return [...new Set([...issues.filter(message=>!message.includes('block macro')),...blockMacroWarnings(text).map(issue=>issue.message)])];
}
function blockMacroWarnings(text){
 const searchable=warningSource(text,true),stack=[],issues=[];
 const report=(message,start,end,priority=0)=>issues.push({message,start,end,line:text.slice(0,start).split('\n').length,priority});
 for(const match of searchable.matchAll(/^[ \t]*(?:>[ \t]*)*(:{2,}[^\n]*)/gm)){
  const marker=match[1].trim(),start=match.index+match[0].indexOf(match[1]),end=start+marker.length;
  if(marker===':::'){
   if(stack.length)stack.pop();
   else report('Unmatched block macro closing marker: :::; remove this marker or add an opening macro',start,end,2);
   continue;
  }
  if(/^:+$/.test(marker)){
   report('Malformed block macro closing marker: '+marker+'; use ::: to close the block',start,end);
   if(stack.length)stack.pop();
   continue;
  }
  const parsed=marker.match(/^:::([a-z]+)(?:[ \t]+(.+))?\s*$/i);
  const name=parsed?.[1].toLowerCase(),arg=(parsed?.[2]||'').trim();
  let error='';
  if(!parsed)error='Malformed block macro: '+marker+'; use :::name to open a block';
  else if(!macroBlockNames.has(name))error='Unknown block macro: '+marker+'; check the macro name';
  else if(name==='collapse'&&(!arg||/[\[\]]/.test(arg)))error='Invalid block macro: '+marker+'; collapse requires a title without square brackets';
  else if(!['collapse','color'].includes(name)&&arg)error='Invalid block macro: '+marker+'; '+name+' does not accept an argument';
  if(error)report(error,start,end);
  // Recover the intended nesting for diagnostics, even when compilation leaves
  // this opener literal. Its closing marker is a consequence, not a new error.
  stack.push({name,start,end,invalid:!!error});
 }
 for(const open of stack)if(!open.invalid)report('Unclosed block macro: :::'+open.name+'; add a closing ::: marker',open.start,open.end,1);
 return issues;
}
// Preserve source offsets while excluding literal examples from diagnostic navigation.
function warningSource(text,mixed){
 const blank=value=>value.replace(/[^\n]/g,' ');
 text=text.replace(/(\[noparse\])([\s\S]*?)(\[\/noparse\]|$)/gi,(_,open,body,close)=>open+blank(body)+close);
 if(mixed)text=text.replace(/^\s*```[^\n]*\n[\s\S]*?(?:^\s*```[^\n]*(?:\n|$)|(?![\s\S]))/gm,blank).replace(/`[^`\n]+`/g,blank).replace(/\\[{}]/g,blank);
 return text;
}
function locatedWarnings(text,mixed,compiled){
 const searchable=warningSource(text,mixed),records=[];
 const add=(message,start,end)=>{const line=text.slice(0,start).split('\n').length;if(!records.some(item=>item.message===message&&item.start===start))records.push({message,start,end,line})};
 const messages=[...countWarnings(compiled),...colorWarnings(text,mixed),...(mixed?macroWarnings(text).filter(message=>!message.includes('block macro')):[])];
 if(mixed)records.push(...blockMacroWarnings(text));
 for(const message of messages){
  let matches=[];
  if(message.startsWith('Color ')){
   const color=message.slice(6,message.indexOf(' is not supported'));
   const tokens=/\[color(?:=([^\]\n]*))?\]|\{color(?::([^|}\n]*))?\||^\s*:::color(?:[ \t]+([^\n]*))?$/gmi;
   matches=[...searchable.matchAll(tokens)].filter(m=>(mixed||m[0].startsWith('['))&&((m[1]??m[2]??m[3]??'').trim()||'(missing value)')===color);
  }else if(/^(?:Invalid|Malformed|Unclosed inline)/.test(message)){
   const marker=message.slice(message.indexOf(': ')+2).replace(/; exported as literal text$/,'');
   let index=searchable.indexOf(marker);while(index>=0){matches.push({index,0:marker});index=searchable.indexOf(marker,index+marker.length)}
  }else if(message.startsWith('External image URLs ')){
   matches=[...searchable.matchAll(mixed?/!\[[^\]\n]*\]\([^\n)]*\)|\{(?:img|image):https?:[^}\n]*\}|\[img\][\s\S]*?\[\/img\]|\[img=(?!\d+\])[^\]\n]*\]/gi:/\[img\][\s\S]*?\[\/img\]|\[img=(?!\d+\])[^\]\n]*\]/gi)];
  }else if(message.startsWith('HTML '))matches=[...searchable.matchAll(/<\/?(?:div|span|table|p|br)\b[^>]*>/gi)];
  else{
   const tag=message.match(/\[(\/?[a-z0-9_*-]+)\]/i)?.[1];
   if(tag)matches=[...searchable.matchAll(/\[(\/?[a-z][a-z0-9_-]*|\*)(?:=[^\]\n]*)?\]/gi)].filter(m=>m[1].toLowerCase()===tag.toLowerCase());
  }
  for(const match of matches)add(message,match.index,match.index+match[0].length);
 }
 const priority=issue=>issue.priority??(/^(?:Invalid|Malformed|Unknown|Unclosed inline|Color )/.test(issue.message)?0:1);
 return records.sort((a,b)=>priority(a)-priority(b)||a.start-b.start);
}
function jumpToWarning(problem){
 source.focus();source.setSelectionRange(problem.start,problem.end);
 const line=$('sourceLineNumbers').children[problem.line-1];
 if(line)source.scrollTop=Math.max(0,line.offsetTop-source.clientHeight/2);
 syncHighlightScroll();updateActiveSyntax();
 $('warningDetails').open=false;
}
function updateWarnings(problems){
 const count=$('warningCount'),details=$('warningDetails'),list=$('warningList');
 count.textContent=problems.length?'\u26a0 '+problems.length+' potential issue'+(problems.length===1?'':'s'):'No obvious issues';
 count.title=problems.length?'Show compiler warnings':'';
 details.classList.toggle('has-issues',problems.length>0);
 list.replaceChildren(...problems.map(problem=>{const item=document.createElement('li');if(typeof problem==='string'){item.textContent=problem;return item}const button=document.createElement('button');button.type='button';button.textContent='Line '+problem.line+': '+problem.message;button.addEventListener('click',()=>jumpToWarning(problem));item.appendChild(button);return item}));
 if(!problems.length)details.open=false;
}
function refresh(){diagnosticHover?.hide();const bb=getCompiled(),problems=locatedWarnings(source.value,data.mixed,bb);FolioSyntax.highlight($('sourceHighlight'),source.value,data.mixed,problems);updateLineNumbers();syncHighlightScroll();$('previewTitle').textContent=$('profileName').value.trim()||'Untitled character';const preview=$('preview');try{FolioPreview.update(preview,preview.closest('.frame'),bb,renderBB,templateSession?templateSession.historyId:'character:'+data.active)}catch(e){preview.textContent='Preview error: '+e.message}const text=source.value;$('stats').textContent=(text.trim()?text.trim().split(/\s+/).length:0)+' words · '+text.length.toLocaleString()+' characters';updateWarnings(problems)}
function syncFromEditor(){active().content=source.value;if(templateSession)updateTemplateStatus();refresh();scheduleSave()}
function syncName(){active().name=$('profileName').value||(templateSession?'Untitled template':'Untitled character');if(templateSession)updateTemplateStatus();renderDrafts();refresh();scheduleSave()}
function updateActiveSyntax(){
 FolioSyntax.markActive($('sourceHighlight'),source.selectionStart);
 const line=source.value.slice(0,source.selectionStart).split('\n').length;
 for(const number of $('sourceLineNumbers').children)number.classList.toggle('active',Number(number.dataset.line)===line);
}
function updateLineNumbers(){
 const layer=$('sourceHighlight'),numbers=$('sourceLineNumbers');
 const anchors=layer.querySelectorAll('.source-line-anchor');
 source.parentElement.style.setProperty('--gutter-width',Math.max(3,String(anchors.length).length+1)+'ch');
 layer.style.width=(source.clientWidth+2)+'px';
 const fragment=document.createDocumentFragment();
 for(const anchor of anchors){
  const number=document.createElement('span');number.className='source-line-number';
  number.textContent=anchor.dataset.line;number.dataset.line=anchor.dataset.line;
  number.style.top=anchor.offsetTop+'px';fragment.appendChild(number);
 }
 numbers.replaceChildren(fragment);numbers.style.top='0px';
 // Match the glyph baseline, including the editor's fractional line-height.
 if(anchors.length&&numbers.firstChild){
  const range=document.createRange();range.selectNodeContents(numbers.firstChild);
  const delta=range.getBoundingClientRect().top-anchors[0].getBoundingClientRect().top;
  numbers.style.top=-delta+'px';
 }
 updateActiveSyntax();
}
function syncHighlightScroll(){
 const layer=$('sourceHighlight');
 layer.style.width=(source.clientWidth+2)+'px';
 layer.scrollTop=source.scrollTop;layer.scrollLeft=source.scrollLeft;
 FolioSyntax.paintActive(layer);
 $('sourceLineNumbers').style.transform='translateY('+(-source.scrollTop)+'px)';
}
source.addEventListener('scroll',syncHighlightScroll);
source.addEventListener('select',updateActiveSyntax);
source.addEventListener('keyup',updateActiveSyntax);
source.addEventListener('click',updateActiveSyntax);
new ResizeObserver(()=>{updateLineNumbers();syncHighlightScroll()}).observe(source);
source.addEventListener('input',e=>{syncFromEditor();commitEdit('typing',e.inputType||'input')});
// Some browsers dispatch historyUndo/historyRedo beforeinput rather than keydown.
source.addEventListener('beforeinput',e=>{
 if(e.inputType==='historyUndo'||e.inputType==='historyRedo'){
  e.preventDefault();(e.inputType==='historyUndo'?undoEdit:redoEdit)();
 }
});
$('profileName').addEventListener('input',syncName);
$('newDraft').addEventListener('click',()=>{
 stashEditor();const d={id:makeId(),name:'Untitled character',content:''};data.drafts.unshift(d);loadDraft(d.id);$('profileName').focus();$('profileName').select();toast('New character draft created');
});
$('deleteDraft').addEventListener('click',()=>requestConfirmation('Delete the current draft? This cannot be undone.',()=>{data.drafts=data.drafts.filter(d=>d.id!==data.active);if(!data.drafts.length)data.drafts.push({id:makeId(),name:'New Character',content:''});loadDraft(data.drafts[0].id);toast('Draft deleted')}));
function applyTemplate(content,name){
 rememberSelection();source.value=data.mixed?content:markdownToBB(content);
 source.focus();syncFromEditor();commitEdit('action');toast(name+' template applied');
}
function requestApplyTemplate(content,name,targetId){
 const character=data.drafts.find(d=>d.id===targetId);
 if(!character)return;
 requestConfirmation('Replace character "'+character.name+'" with template "'+name+'"? This replaces the profile description.',()=>{
  if(!data.drafts.some(d=>d.id===targetId)){renderTemplateTargets();toast('That character no longer exists');return}
  loadDraft(targetId);applyTemplate(content,name);
 });
}
document.querySelectorAll('[data-template]').forEach(btn=>btn.addEventListener('click',()=>loadTemplateForm('builtin:'+btn.dataset.template)));
document.querySelectorAll('[data-wrap]').forEach(btn=>btn.addEventListener('click',()=>wrapInline(btn.dataset.wrap)));
document.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>{switch(btn.dataset.action){case 'hr':case 'divider':addLine(data.mixed?'---':'[hr]');break;case 'details':addLine(data.mixed?'**Field:** Details':'[b]Field:[/b] Details');break}}));

const palette=$('colorPalette');
function wrapColor(name){if(!colorSafe(name))return;
 if(!data.mixed){wrapInline('color='+name);return}
 const s=source.selectionStart,e=source.selectionEnd,chosen=source.value.slice(s,e)||'your text';
 const block=chosen.includes('\n');
 const lead=block&&s>0&&source.value[s-1]!=='\n'?'\n':'';
 const tail=block&&e<source.value.length&&source.value[e]!=='\n'?'\n':'';
 const prefix=lead+(block?':::color '+name+'\n':'{color:'+name+'|'),suffix=block?'\n:::'+tail:'}';
 replaceRange(prefix+chosen+suffix,s,e,s+prefix.length,s+prefix.length+chosen.length);
}
colorNames.forEach(name=>{const btn=document.createElement('button');btn.type='button';btn.className='palette-option';btn.title='Apply F-List '+name;
 btn.setAttribute('aria-label','Apply '+name+' text color');
 const swatch=document.createElement('span');swatch.className='color-swatch';swatch.style.setProperty('--swatch','var(--flist-'+name+')');
 btn.append(swatch,document.createTextNode(name));
 btn.addEventListener('click',()=>{wrapColor(name);palette.hidden=true;$('colorBtn').setAttribute('aria-expanded','false')});palette.append(btn)});
const colorHint=document.createElement('span');colorHint.className='palette-hint';colorHint.textContent='F-List named presets only';palette.append(colorHint);
$('colorBtn').addEventListener('click',()=>{palette.hidden=!palette.hidden;$('colorBtn').setAttribute('aria-expanded',String(!palette.hidden))});
function switchMode(toMixed){
 if(data.mixed===toMixed)return;
 rememberSelection();
 const oldLength=source.value.length;
 const oldStart=source.selectionStart,oldEnd=source.selectionEnd;
 const oldScroll=source.scrollTop;
 const converted=toMixed?bbcodeToMarkdown(source.value,true):normalizeColorTags(markdownToBB(source.value));
 data.mixed=toMixed;
 source.value=converted;
 // Preserve the editing position approximately after a full-source transformation.
 const start=oldLength?Math.round(oldStart/oldLength*converted.length):0;
 const end=oldLength?Math.round(oldEnd/oldLength*converted.length):0;
 source.setSelectionRange(start,end);
 source.scrollTop=oldScroll;
 active().content=converted;
 updateMode();
 source.focus();commitEdit('action');scheduleSave();
 toast(toMixed?'Converted BBCode to Markdown+':'Compiled Markdown+ to BBCode');
}
$('mixedMode').addEventListener('click',()=>switchMode(true));
$('bbMode').addEventListener('click',()=>switchMode(false));
function setEditorTheme(){
 document.documentElement.dataset.appTheme=data.editorTheme;
 source.parentElement.dataset.editorTheme=data.editorTheme;
 $('editorTheme').value=data.editorTheme;
}
$('editorTheme').addEventListener('change',e=>{data.editorTheme=e.target.value;setEditorTheme();persist()});
$('theme').addEventListener('change',e=>{data.theme=e.target.value;setTheme();persist()});function setTheme(){document.documentElement.dataset.flistScheme=data.theme;$('previewPage').className='previewpage'+(data.theme==='default'?'':' '+data.theme);$('theme').value=data.theme;setPreviewFontSize()}
function parsePreviewFontSize(value){
 if(value==null)return null;
 const text=String(value??'').trim().toLowerCase();
 if(text===''||text==='site')return 'site';
 if(!/^(?:\d+(?:\.\d+)?|\.\d+)(?:\s*px)?$/.test(text))return null;
 const size=Number(text.replace(/\s*px$/,''));return Number.isFinite(size)&&size>=1&&size<=200?String(size):null;
}
function setPreviewFontSize(){
 $('preview').style.fontSize=data.previewFontSize==='site'?'':data.previewFontSize+'px';
 $('previewFontSize').value=data.previewFontSize==='site'?'':data.previewFontSize;
 $('previewFontSize').removeAttribute('aria-invalid');
}
$('previewFontSize').addEventListener('input',e=>{
 const size=parsePreviewFontSize(e.target.value);
 if(!size){e.target.setAttribute('aria-invalid','true');return}
 e.target.removeAttribute('aria-invalid');data.previewFontSize=size;
 $('preview').style.fontSize=size==='site'?'':size+'px';persist();
});
$('previewFontSize').addEventListener('change',setPreviewFontSize);
// All toolbar insertion tools edit the source directly, with no prompt or modal.
const insertionSpecs={
 link:{prefix:'[url=https://example.com]',suffix:'[/url]',fallback:'link text',select:'https://example.com'},
 image:{prefix:'[img]',suffix:'[/img]',fallback:'https://example.com/image.png'},
 inlineimg:{prefix:'[img=12345]',suffix:'[/img]',fallback:'',select:'12345'},
 collapse:{prefix:'[collapse=More details]\n',suffix:'\n[/collapse]',fallback:'Write details here',select:'More details'},
 user:{prefix:'[user]',suffix:'[/user]',fallback:'Character Name'},
 icon:{prefix:'[icon]',suffix:'[/icon]',fallback:'Character Name'},
 eicon:{prefix:'[eicon]',suffix:'[/eicon]',fallback:'eicon-name'},
 noparse:{prefix:'[noparse]',suffix:'[/noparse]',fallback:'literal **text**'},
};
const markdownInsertionSpecs={
 link:{prefix:'[',suffix:'](https://example.com)',fallback:'link text',select:'https://example.com'},
 image:{prefix:'![](',suffix:')',fallback:'https://example.com/image.png'},
 inlineimg:{prefix:'{img:12345',suffix:'}',fallback:'',select:'12345'},
 collapse:{prefix:':::collapse More details\n',suffix:'\n:::',fallback:'Write details here',select:'More details',block:true},
 user:{prefix:'{user:',suffix:'}',fallback:'Character Name'},
 icon:{prefix:'{icon:',suffix:'}',fallback:'Character Name'},
 eicon:{prefix:'{eicon:',suffix:'}',fallback:'eicon-name'},
 noparse:{prefix:'`',suffix:'`',fallback:'literal **text**'}
};
function insertTag(type){
 let spec=(data.mixed?markdownInsertionSpecs:insertionSpecs)[type];if(!spec)return;
 const s=source.selectionStart,e=source.selectionEnd,chosen=source.value.slice(s,e);
 if(data.mixed&&type==='inlineimg'&&chosen)spec={...spec,prefix:spec.prefix+'|'};
 if(data.mixed&&type==='noparse'){
  if(chosen.includes('\n')||chosen.includes('`'))spec=chosen.includes('```')?insertionSpecs.noparse:{prefix:'```\n',suffix:'\n```',fallback:'literal text',block:true};
 }
 const lead=spec.block&&s>0&&source.value[s-1]!=='\n'?'\n':'';
 const tail=spec.block&&e<source.value.length&&source.value[e]!=='\n'?'\n':'';
 const text=lead+spec.prefix+(chosen||spec.fallback)+spec.suffix+tail;
 const target=spec.select||(!chosen?spec.fallback:null);
 const at=target?text.indexOf(target):-1;
 replaceRange(text,s,e,at<0?s+text.length:s+at,at<0?s+text.length:s+at+target.length);
}

document.querySelectorAll('[data-insert]').forEach(btn=>btn.addEventListener('click',()=>insertTag(btn.dataset.insert)));
// A searchable reference that stays inside the editor rather than blocking it.
const guideExamples=[
 ['Basics','Bold and italics','Mix emphasis in a sentence','**Bold**, *italic*, and ***both***.'],
 ['Basics','Underline and strikethrough','Underline uses a Folio extension','++Underlined++ and ~~crossed out~~.'],
 ['Basics','Heading and divider','Break your bio into readable sections','# About me\nA curious traveller.\n\n---\n## Story hooks'],
 ['Basics','Heading levels','One # adds heading + big; two or more # add a regular heading','# Large heading\n## Standard heading\n### Smaller heading'],
 ['Basics','Big text','Use the inline macro for F-List big text','{big|Large text}'],
 ['Basics','Links','A link with human-friendly text','[Visit my inspiration board](https://example.com)'],
 ['Basics','Quotes','Standard Markdown blockquotes','> “Everything has a price.”'],
 ['Basics','Bullet list','Plain text bullets compatible with F-List','- Adventurous\n- Sarcastic\n- Fond of stargazing'],
 ['Basics','Numbered list','Numbers remain readable','1. First encounter\n2. Second chance\n3. Final chapter'],
 ['Basics','Nested lists','Leading spaces and tabs survive BBCode conversion','- Parent item\n  - Nested bullet\n    1. Nested numbered item\n    2. Another numbered item\n- Next parent'],
 ['Basics','Inline code','Show syntax literally, without formatting','Write `[b]bold[/b]` to display code.'],
 ['Basics','Literal block','Triple backticks convert to noparse','```\n[b]Printed literally[/b]\n```'],
 ['Macros','Color presets','F-List supports red, orange, yellow, green, cyan, purple, blue, pink, black, brown, white and gray','{color:purple|An important note} and {color:orange|a warm welcome}'],
 ['Macros','Colored Markdown','Combine nested custom macros and bold','{color:cyan|**Cyan and bold**}'],
 ['Macros','Every color','All 12 native F-List color presets','{color:red|Red} {color:orange|Orange} {color:yellow|Yellow} {color:green|Green} {color:cyan|Cyan} {color:purple|Purple} {color:blue|Blue} {color:pink|Pink} {color:black|Black} {color:brown|Brown} {color:white|White} {color:gray|Gray}'],
 ['Macros','Character mention','Clickable F-List character name','A friend: {user:Character Name}'],
 ['Macros','Character avatar','Show another character’s icon','{icon:Character Name}'],
 ['Macros','Eicon','Display an uploaded F-List eicon','{eicon:eicon-name}'],
 ['Macros','Uploaded profile image','Reference a numeric F-List image ID','{img:12345}'],
 ['Macros','Labeled profile image','Preserve the text associated with an uploaded image','{img:12345|Portrait label}'],
 ['Macros','Heading block','Multiline headings use the same spacing rules as other block macros',':::heading\n{color:cyan|Character name}\n{big|Subtitle}\n:::'],
 ['Macros','Inline heading and divider','Insert headings and rules without extra line breaks','{heading|About me}{hr}Profile text'],
 ['Macros','Big and small','Use F-List native size tags','{big|Shout!} and {small|a whisper.}'],
 ['Macros','Superscript & subscript','Text above or below the baseline','H{sub|2}O and x{sup|2}'],
 ['Macros','Literal inline text','Prevent formatting for a segment','{noparse|**This is not bold**}'],
 ['Macros','Special link','Macro alternative to Markdown links','{link:https://example.com|Read more}'],
 ['Layout','Centered section','Multiline macros begin with :::',':::center\n# Welcome\n*“A line of flavour text.”*\n:::'],
 ['Layout','Collapsible biography','Create a native F-List collapse',':::collapse Hidden backstory\nA secret from long ago.\n\n- A clue\n- Another clue\n:::'],
 ['Layout','Right aligned caption','Position a line to the right',':::right\n{small|A quiet afterthought…}\n:::'],
 ['Layout','Indented passage','Visually separate a story excerpt',':::indent\nThe journal was found beneath the floorboards.\n:::'],
 ['Layout','Multiline quote','Quote entire paragraphs together',':::quote\n“Have you ever watched the stars go out?”\n\n“Not yet.”\n:::'],
 ['Layout','Justified layout','Align text along both edges',':::justify\nA longer paragraph of carefully considered prose belongs here.\n:::'],
 ['Layout','Colored panel content','Color applies to the whole block',':::color cyan\n# Cyan archive\n**Status:** Active\n:::'],
 ['Macros','Bold & italic containers','Macros help when deeply nested emphasis cannot be written cleanly','{b|Bold text with *italic* inside} and {i|italic with **bold** inside}'],
 ['Macros','Nested formatting','Combine ordinary Markdown with a custom color macro','{color:purple|**Bright**, *italic*, and ++underlined++ text}'],
 ['Layout','Nested sections','A secret inside a colored centered section',':::center\n:::color purple\n# Private notes\n**Status:** Hidden\n:::collapse More information\n*The full story goes here.*\n:::\n:::\n:::'],
 ['Recipes','Character card','A ready-made compact profile',':::center\n# ✦ Astra Vale ✦\n{color:purple|*An enigma in plain sight*}\n:::\n\n---\n**Species:** Unknown\n**Occupation:** Scout\n**Personality:** Clever, guarded, curious'],
 ['Recipes','Relationship section','Character links plus an expandable roster','# Connections\n- {user:First Companion}: Trusted friend\n- {user:Second Companion}: An old rival\n\n:::collapse More connections\n{icon:Another Character} A mysterious ally.\n:::'],
 ['Recipes','Roleplay hooks','Small sections to inspire interaction','## Roleplay hooks\n- You recognize the locket she wears.\n- She seems to be waiting for someone.\n- There is a bounty on her name.'],
 ['Recipes','Colored dossier','Mix big headings, colors, and secrets',':::center\n{color:red|{big|CLASSIFIED • FILE 07}}\n{small|AUTHORIZED EYES ONLY}\n:::\n\n**Name:** REDACTED\n**Status:** ACTIVE\n\n:::collapse Incident details\n*Report pending.*\n:::']
];
let guideCategory='All';
const guidePanel=$('guidePanel');
function renderGuide(){
 const tabs=$('guideTabs');tabs.replaceChildren();
 ['All','Basics','Macros','Layout','Recipes'].forEach(category=>{
  const button=document.createElement('button');button.type='button';button.textContent=category;button.className=guideCategory===category?'active':'';button.setAttribute('aria-pressed',String(guideCategory===category));
  button.addEventListener('click',()=>{guideCategory=category;renderGuide()});tabs.append(button);
 });
 const list=$('guideExamples');list.replaceChildren();const filter=$('guideSearch').value.toLowerCase().trim();
 for(const [category,title,desc,example] of guideExamples){
  if(guideCategory!=='All'&&category!==guideCategory)continue;
  if(filter&&!(category+' '+title+' '+desc+' '+example).toLowerCase().includes(filter))continue;
  const card=document.createElement('article');card.className='example-card';
  const heading=document.createElement('h4');heading.textContent=title;
  const sub=document.createElement('p');sub.textContent=desc;
  const pre=document.createElement('pre');const code=document.createElement('code');code.textContent=example;pre.append(code);
  const foot=document.createElement('div');foot.className='example-footer';const label=document.createElement('span');label.textContent=category;
  const button=document.createElement('button');button.type='button';button.textContent='＋ Insert';button.setAttribute('aria-label','Insert '+title+' example');
  button.addEventListener('click',()=>{const start=source.selectionStart,end=source.selectionEnd;const snippet=data.mixed?example:markdownToBB(example);replaceRange(snippet,start,end,start,start+snippet.length);toast(title+(data.mixed?' Markdown':' BBCode')+' inserted');});
  foot.append(label,button);card.append(heading,sub,pre,foot);list.append(card);
 }
 if(!list.children.length){const empty=document.createElement('p');empty.className='inline-tip';empty.textContent='No examples match that search.';list.append(empty)}
}
$('guideSearch').addEventListener('input',renderGuide);
function toggleGuide(force){const show=typeof force==='boolean'?force:guidePanel.hidden;guidePanel.hidden=!show;$('guideBtn').setAttribute('aria-expanded',String(show));if(show)renderGuide()}
$('guideBtn').addEventListener('click',()=>toggleGuide());$('closeGuide').addEventListener('click',()=>toggleGuide(false));
async function copyCode(){const code=getCompiled();try{await navigator.clipboard.writeText(code);toast('BBCode copied. Paste into F-List!')}catch(e){const box=document.createElement('textarea');box.value=code;box.style.cssText='position:fixed;opacity:0;top:0';document.body.append(box);box.select();try{document.execCommand('copy');toast('BBCode copied')}catch(error){toast('Use Export .bbcode to save your code')}box.remove()}}
$('copyCode').addEventListener('click',copyCode);
function download(text,file,type='text/plain;charset=utf-8'){const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([text],{type}));link.download=file;document.body.append(link);link.click();setTimeout(()=>URL.revokeObjectURL(link.href),2000);link.remove()}
const slug=()=> (active().name||'character').trim().replace(/[^a-z0-9_-]+/gi,'_').replace(/^_+|_+$/g,'').slice(0,60)||'character';
$('downloadCode').addEventListener('click',()=>{download(getCompiled(),slug()+'.bbcode');toast('BBCode exported')});
$('downloadMarkdown').addEventListener('click',()=>{download(data.mixed?source.value:bbcodeToMarkdown(source.value,true),slug()+'.md','text/markdown;charset=utf-8');toast('Markdown source exported')});
$('backupBtn').addEventListener('click',()=>{download(JSON.stringify({format:'folio-profile',version:1,name:active().name,content:active().content,mixed:data.mixed},null,2),slug()+'.folio.json','application/json');toast('Editable backup exported')});
// Full-app backups contain the complete persisted state, separate from profile backups.
function validateAppBackup(record){
 if(!record||record.format!=='folio-app'||record.version!==1)throw Error('Unsupported app backup');
 const value=record.data;
 if(!value||!Array.isArray(value.drafts)||!value.drafts.length||value.drafts.length>80||!Array.isArray(value.customTemplates)||value.customTemplates.length>100)throw Error('Invalid app data');
 for(const records of [value.drafts,value.customTemplates]){
  const ids=new Set();
  for(const item of records){
   if(!item||typeof item.id!=='string'||!item.id||ids.has(item.id)||typeof item.name!=='string'||typeof item.content!=='string'||item.content.length>1500000||('mixed' in item&&typeof item.mixed!=='boolean'))throw Error('Invalid character or template');
   ids.add(item.id);
  }
 }
 if(!value.drafts.some(draft=>draft.id===value.active)||typeof value.mixed!=='boolean'||typeof value.previewNoteDismissed!=='boolean'||!['folio','graphite','forest','paper'].includes(value.editorTheme)||!Array.from($('theme').options).some(option=>option.value===value.theme)||!parsePreviewFontSize(value.previewFontSize)||typeof value.splitRatio!=='number'||!Number.isFinite(value.splitRatio)||value.splitRatio<.25||value.splitRatio>.75)throw Error('Invalid app settings');
 return value;
}
function replaceAppData(next){
 clearTimeout(saveTimer);editorLoaded=false;templateSession=null;
 templateEditors.clear();characterEditors.clear();editHistories.clear();
 data=next;setEditorTheme();setTheme();applyPaneSplit();
 $('previewNote').hidden=data.previewNoteDismissed;
 loadDraft(data.active);
}
$('exportAll').addEventListener('click',()=>{
 stashEditor();
 const snapshot=JSON.parse(JSON.stringify(templateSession?{...data,mixed:templateSession.returnContext.mixed}:data));
 for(const draft of snapshot.drafts){const context=characterEditors.get(draft.id);if(context)draft.mixed=context.mixed}
 download(JSON.stringify({format:'folio-app',version:1,data:snapshot},null,2),'folio-all-data.json','application/json');
 toast('All characters, saved templates and settings exported');
});
$('importAll').addEventListener('click',()=>$('appDataImport').click());
$('appDataImport').addEventListener('change',async event=>{
 const file=event.target.files[0];event.target.value='';if(!file)return;
 let next;
 try{next=validateAppBackup(JSON.parse(await file.text()))}catch(error){toast('Not a valid full-app Folio backup');return}
 requestConfirmation('Replace ALL characters, templates and settings with this backup? Unsaved template edits will be lost.',()=>{
  // Write first so a storage failure leaves the current session intact.
  try{localStorage.setItem(STORAGE,JSON.stringify(next))}catch(error){toast('Import failed: browser storage unavailable or full');return}
  replaceAppData(next);toast('All app data imported');
 });
});
$('purgeData').addEventListener('click',()=>requestConfirmation('Permanently delete ALL locally saved characters, templates and settings, including unsaved edits? Export all data first to keep a backup.',()=>{
 try{localStorage.removeItem(STORAGE)}catch(error){toast('Could not delete local data');return}
 const draft={id:makeId(),name:'New Character',content:''};
 replaceAppData({customTemplates:[],drafts:[draft],active:draft.id,theme:'flist-blue',editorTheme:'folio',previewFontSize:'16',splitRatio:.524,previewNoteDismissed:false,mixed:true});
 clearTimeout(saveTimer);
 try{localStorage.removeItem(STORAGE);$('saveStatus').textContent='Local data purged'}catch(error){toast('Could not delete local data');return}
 toast('All local app data purged');
}));
$('importBtn').addEventListener('click',()=>$('fileImport').click());
$('fileImport').addEventListener('change',async(e)=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>1500000){toast('File is too large (max 1.5 MB)');return}let str=await file.text(),name=file.name.replace(/\.(folio\.json|bbcode|txt|md|json)$/i,'');if(file.name.toLowerCase().endsWith('.json')){try{const record=JSON.parse(str);if(typeof record.content!=='string')throw Error('No profile content');name=String(record.name||name);str=record.content;if(typeof record.mixed==='boolean'){data.mixed=record.mixed;updateMode()}}catch(error){toast('Not a valid Folio backup');return}}
 const apply=()=>{if(templateSession){rememberSelection();active().name=name.slice(0,100);$('profileName').value=active().name;source.value=str;syncFromEditor();commitEdit('action')}else{active().name=name.slice(0,100);active().content=str;loadDraft(data.active)}toast('Source imported')};if(source.value.trim())requestConfirmation('Replace this draft with the imported file?',apply);else apply()});
document.addEventListener('keydown',e=>{
 if(e.key==='Enter'&&e.ctrlKey){e.preventDefault();copyCode();return}
 if(document.activeElement!==source)return;
 if((e.ctrlKey||e.metaKey)&&!e.altKey){
  const key=e.key.toLowerCase();
  if(key==='z'){e.preventDefault();(e.shiftKey?redoEdit:undoEdit)();return}
  if(key==='y'){e.preventDefault();redoEdit();return}
  if(['b','i','u'].includes(key)){e.preventDefault();wrapInline(key);return}
 }
 if(e.key==='Tab'){e.preventDefault();replaceRange('  ')}
});
source.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files'))e.preventDefault()});
let templateChoiceValue='';
function templateFormSnapshot(){return JSON.stringify([$('profileName').value,source.value,data.mixed])}
function templateDirty(){return !!templateSession&&templateFormSnapshot()!==templateSession.snapshot}
function updateTemplateStatus(){
 $('templateStatus').textContent=templateDirty()?'Unsaved template changes. Save when ready.':'Template saved. Edits use the full profile editor below.';
}
function renderTemplateTargets(){
 for(const [selectId,buttonId] of [['templateTarget','applyTemplate'],['templateSource','templateFromDraft']]){
  const select=$(selectId),previous=select.value;select.replaceChildren();
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose a character';select.append(placeholder);
  for(const character of data.drafts){const option=document.createElement('option');option.value=character.id;option.textContent=character.name;select.append(option)}
  select.value=data.drafts.some(character=>character.id===previous)?previous:'';
  $(buttonId).disabled=!select.value;
 }
}
function renderCustomTemplates(){
 const list=$('customTemplateList');list.replaceChildren();
 if(!data.customTemplates.length){const empty=document.createElement('small');empty.className='inline-tip';empty.textContent='No custom templates yet.';list.append(empty)}
 for(const record of data.customTemplates){
  const row=document.createElement('div');row.className='custom-template-row';
  const open=document.createElement('button');open.className='custom-template-open'+(templateSession?.id===record.id?' active':'');open.textContent=record.name;open.title='Edit '+record.name;
  open.addEventListener('click',()=>openTemplateManager(record.id));
  row.append(open);list.append(row);
 }
 const choice=$('templateChoice');choice.replaceChildren();
 const blank=document.createElement('option');blank.value='';blank.textContent='New template';choice.append(blank);
 const unsaved=[...templateEditors.values()].filter(editor=>!editor.id&&!editor.key.startsWith('builtin:')).map(editor=>({value:editor.key,name:editor.name||'Untitled template'}));
 for(const [label,records] of [['Template drafts',unsaved],['My templates',data.customTemplates.map(t=>({value:'custom:'+t.id,name:t.name}))],['Built-in templates',Object.keys(templates).map(id=>({value:'builtin:'+id,name:document.querySelector('[data-template="'+id+'"]').querySelector('strong').textContent}))]]){
  const group=document.createElement('optgroup');group.label=label;
  for(const record of records){const option=document.createElement('option');option.value=record.value;option.textContent=record.name;group.append(option)}
  choice.append(group);
 }
 choice.value=templateChoiceValue;
 for(const button of document.querySelectorAll('[data-template]'))button.classList.toggle('active',templateSession?.key==='builtin:'+button.dataset.template);
}
function setTemplateEditorUI(editing){
 $('templateEditorControls').hidden=!editing;$('backToProfile').hidden=!editing;$('deleteDraft').hidden=editing;
 $('editorContext').textContent=editing?'Editing reusable template':'Editing character profile';
 $('profileName').setAttribute('aria-label',editing?'Template name':'Character name');
 $('cloneEditor').title=editing?'Clone current template':'Clone current character';
 $('cloneEditor').setAttribute('aria-label',editing?'Clone template':'Clone character');
 $('profileName').placeholder=editing?'Template name':'';
}
function loadTemplateForm(value,sourceCharacterId=null){
 const profile=sourceCharacterId?data.drafts.find(d=>d.id===sourceCharacterId):null;
 if(sourceCharacterId&&!profile){renderTemplateTargets();toast('That character no longer exists');return}
 const returnContext=templateSession?templateSession.returnContext:{id:data.active,mixed:data.mixed};
 stashEditor();clearConfirmation();clearTimeout(saveTimer);
 const key=value||'new:'+makeId();
 let session=templateEditors.get(key);
 if(!session){
  let id=null,name='',content='';
  if(value.startsWith('custom:')){const record=data.customTemplates.find(t=>t.id===value.slice(7));if(record){id=record.id;name=record.name;content=record.content}}
  else if(value.startsWith('builtin:')){const builtin=value.slice(8);content=templates[builtin]||'';name=document.querySelector('[data-template="'+builtin+'"]').querySelector('strong').textContent+' copy'}
  if(profile){const mode=characterEditors.get(profile.id)?.mixed??(typeof profile.mixed==='boolean'?profile.mixed:returnContext.mixed);name=(profile.name+' template').slice(0,100);content=mode?profile.content:bbcodeToMarkdown(profile.content,true)}
  session={key,id,name,content,historyId:'template:'+makeId(),mixed:true,start:0,end:0,scroll:0,snapshot:id||value.startsWith('builtin:')?JSON.stringify([name,content,true]):JSON.stringify(['','',true])};
  templateEditors.set(key,session);
 }
 templateSession=session;session.returnContext=returnContext;templateChoiceValue=key;
 data.mixed=session.mixed;source.value=session.content;$('profileName').value=session.name;
 editorLoaded=true;setTemplateEditorUI(true);renderDrafts();renderCustomTemplates();$('deleteTemplate').disabled=false;
 updateTemplateStatus();updateMode();refreshUndoButtons();
 source.focus();source.setSelectionRange(session.start,session.end);source.scrollTop=session.scroll;
}
function openTemplateManager(id){
 if(templateSession&&!id){source.focus();return}
 loadTemplateForm(id?'custom:'+id:templateChoiceValue);
}
function exitTemplateEditor(){if(templateSession)loadDraft(data.active)}
function cloneTemplate(key){
 stashEditor();
 if(data.customTemplates.length>=100){toast('Maximum 100 templates. Delete one before cloning.');return}
 const editor=templateEditors.get(key);
 let name,content,mixed=true;
 if(editor){({name,content,mixed}=editor)}
 else if(key.startsWith('custom:')){const record=data.customTemplates.find(record=>record.id===key.slice(7));if(!record)return;({name,content}=record)}
 else if(key.startsWith('builtin:')){const id=key.slice(8);content=templates[id];if(content===undefined)return;name=document.querySelector('[data-template="'+id+'"]').querySelector('strong').textContent}
 else return;
 name=cloneName(name,data.customTemplates);
 const record={id:makeId(),name,content:mixed?content:bbcodeToMarkdown(content,true)};
 data.customTemplates.push(record);
 const cloneKey='custom:'+record.id;
 templateEditors.set(cloneKey,{key:cloneKey,id:record.id,name,content,mixed,start:0,end:0,scroll:0,historyId:'template:'+makeId(),snapshot:JSON.stringify([name,content,mixed])});
 loadTemplateForm(cloneKey);$('profileName').focus();$('profileName').select();toast('Template cloned');
}
$('cloneEditor').addEventListener('click',()=>{if(templateSession)cloneTemplate(templateSession.key);else cloneCharacter(data.active)});
function saveCustomTemplate(){
 if(!templateSession)return null;
 const name=$('profileName').value.trim().slice(0,100),content=data.mixed?source.value:bbcodeToMarkdown(source.value,true);
 if(!name){$('templateStatus').textContent='Enter a template name above.';$('profileName').focus();return null}
 if(content.length>1500000){$('templateStatus').textContent='Template is too large (max 1.5 MB).';return null}
 if(!templateSession.id&&data.customTemplates.length>=100){$('templateStatus').textContent='Maximum 100 custom templates. Delete one first.';return null}
 let record=data.customTemplates.find(t=>t.id===templateSession.id);
 if(record){record.name=name;record.content=content}else{record={id:makeId(),name,content};data.customTemplates.push(record)}
 templateEditors.delete(templateSession.key);templateSession.id=record.id;templateSession.name=name;templateSession.key='custom:'+record.id;templateChoiceValue=templateSession.key;templateEditors.set(templateSession.key,templateSession);renderCustomTemplates();
 $('profileName').value=name;templateSession.snapshot=templateFormSnapshot();$('deleteTemplate').disabled=false;
 $('templateStatus').textContent=persist()?'Template saved.':'Saved for this session only; browser storage is unavailable.';
 return record;
}
for(const id of ['manageTemplates','openTemplateManager'])$(id).addEventListener('click',()=>openTemplateManager());
$('backToProfile').addEventListener('click',exitTemplateEditor);
$('templateChoice').addEventListener('change',e=>loadTemplateForm(e.target.value));
$('newTemplate').addEventListener('click',()=>loadTemplateForm(''));
$('templateFromDraft').addEventListener('click',()=>{const id=$('templateSource').value;if(id)loadTemplateForm('',id)});
$('templateSource').addEventListener('change',()=>{$('templateFromDraft').disabled=!$('templateSource').value});
$('saveTemplate').addEventListener('click',()=>{clearConfirmation();saveCustomTemplate()});
$('applyTemplate').addEventListener('click',()=>{
 if(!templateSession)return;
 const content=data.mixed?source.value:bbcodeToMarkdown(source.value,true);
 requestApplyTemplate(content,$('profileName').value.trim()||'Untitled template',$('templateTarget').value);
});
$('templateTarget').addEventListener('change',()=>{clearConfirmation();$('applyTemplate').disabled=!$('templateTarget').value});
$('newFromTemplate').addEventListener('click',()=>{
 if(!templateSession)return;
 const name=('New from '+($('profileName').value.trim()||'template')).slice(0,100);
 const character={id:makeId(),name,content:source.value,mixed:data.mixed};
 data.drafts.unshift(character);loadDraft(character.id);
 $('profileName').focus();$('profileName').select();toast('New character created from template');
});
$('deleteTemplate').addEventListener('click',()=>{
 const session=templateSession;if(!session)return;
 requestConfirmation('Delete this template'+(templateDirty()?' and its unsaved changes':'')+'?',()=>{
  data.customTemplates=data.customTemplates.filter(t=>t.id!==session.id);
  exitTemplateEditor();templateEditors.delete(session.key);editHistories.delete(session.historyId);templateChoiceValue='';renderCustomTemplates();persist();
 });
});
window.addEventListener('beforeunload',e=>{
 stashEditor();
 if([...templateEditors.values()].some(session=>JSON.stringify([session.name,session.content,session.mixed])!==session.snapshot)){e.preventDefault();e.returnValue=''}
});
renderCustomTemplates();setTemplateEditorUI(false);
const paneDivider=$('paneDivider');
function applyPaneSplit(){
 const app=document.querySelector('.app');
 app.style.setProperty('--editor-share',data.splitRatio+'fr');
 app.style.setProperty('--preview-share',(1-data.splitRatio)+'fr');
 paneDivider.setAttribute('aria-valuenow',String(Math.round(data.splitRatio*100)));
 paneDivider.setAttribute('aria-valuetext',Math.round(data.splitRatio*100)+'% source');
}
function movePaneDivider(clientX){
 const editor=$('sourcePane').getBoundingClientRect(),preview=$('previewPane').getBoundingClientRect();
 const width=preview.right-editor.left-paneDivider.offsetWidth;
 if(width>0){data.splitRatio=Math.max(.25,Math.min(.75,(clientX-editor.left-paneDivider.offsetWidth/2)/width));applyPaneSplit()}
}
paneDivider.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;
 e.preventDefault();paneDivider.focus();paneDivider.setPointerCapture(e.pointerId);
 document.body.classList.add('resizing-panes');movePaneDivider(e.clientX);
});
paneDivider.addEventListener('pointermove',e=>{if(paneDivider.hasPointerCapture(e.pointerId))movePaneDivider(e.clientX)});
function finishPaneResize(){document.body.classList.remove('resizing-panes');persist()}
for(const event of ['pointerup','pointercancel'])paneDivider.addEventListener(event,e=>{
 if(paneDivider.hasPointerCapture(e.pointerId))paneDivider.releasePointerCapture(e.pointerId);
 finishPaneResize();
});
paneDivider.addEventListener('lostpointercapture',finishPaneResize);
paneDivider.addEventListener('dblclick',()=>{data.splitRatio=.524;applyPaneSplit();persist()});
paneDivider.addEventListener('keydown',e=>{
 const steps={ArrowLeft:-.02,ArrowRight:.02};
 if(e.key in steps)data.splitRatio=Math.max(.25,Math.min(.75,data.splitRatio+steps[e.key]*(e.shiftKey?5:1)));
 else if(e.key==='Home')data.splitRatio=.25;
 else if(e.key==='End')data.splitRatio=.75;
 else return;
 e.preventDefault();applyPaneSplit();persist();
});
$('previewNote').hidden=data.previewNoteDismissed;
$('dismissPreviewNote').addEventListener('click',()=>{data.previewNoteDismissed=true;$('previewNote').hidden=true;$('theme').focus();persist()});
applyPaneSplit();
diagnosticHover=FolioDiagnostics.attach({source,layer:$('sourceHighlight'),
 getConfig:()=>({mixed:data.mixed,inlineNames:macroInlineNames,blockNames:macroBlockNames,colors:colorNames,resolveColor:resolvedColor}),
 applyFix:fix=>replaceRange(fix.text,fix.start,fix.end)
});
setEditorTheme();setTheme();loadDraft(data.active);updateMode();refreshUndoButtons();
})();
