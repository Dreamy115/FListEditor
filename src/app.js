
(() => {
'use strict';
const $ = id => document.getElementById(id);
const source = $('source');
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
let data={drafts:[{id:makeId(),name:'New Character',content:intro}],active:null,theme:'default',mixed:true};
data.active=data.drafts[0].id;
try{const loaded=JSON.parse(localStorage.getItem(STORAGE));if(loaded&&Array.isArray(loaded.drafts)&&loaded.drafts.length){const valid=loaded.drafts.filter(d=>typeof d.id==='string'&&typeof d.name==='string'&&typeof d.content==='string').slice(0,80);if(valid.length){data={drafts:valid,active:valid.some(d=>d.id===loaded.active)?loaded.active:valid[0].id,theme:['default','classic','noir'].includes(loaded.theme)?loaded.theme:'default',mixed:loaded.mixed!==false}}}}catch(e){}
let saveTimer=null,toastTimer=null;
// Undo is managed explicitly because setRangeText() and textarea.value edits do not
// consistently enter the browser's native undo stack across browsers.
const editHistories=new Map();
const MAX_UNDO_STATES=180;
function editorSnapshot(){return {content:source.value,mixed:data.mixed,start:source.selectionStart,end:source.selectionEnd,scroll:source.scrollTop}}
function currentHistory(){
 let h=editHistories.get(data.active);
 if(!h){h={states:[editorSnapshot()],index:0,lastKind:null,lastAt:0,lastInputType:null};editHistories.set(data.active,h)}
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
 data.mixed=state.mixed;source.value=state.content;
 active().content=state.content;
 updateMode();
 source.focus();
 source.setSelectionRange(Math.min(state.start,source.value.length),Math.min(state.end,source.value.length));
 source.scrollTop=state.scroll;
 scheduleSave();refreshUndoButtons();
}
function undoEdit(){const h=currentHistory();if(!h.index)return;h.index--;h.lastKind=null;restoreEdit(h.states[h.index])}
function redoEdit(){const h=currentHistory();if(h.index>=h.states.length-1)return;h.index++;h.lastKind=null;restoreEdit(h.states[h.index])}
$('undoEdit').addEventListener('click',undoEdit);
$('redoEdit').addEventListener('click',redoEdit);
const active=()=>data.drafts.find(d=>d.id===data.active)||data.drafts[0];
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(data));$('saveStatus').textContent='● Saved locally'}catch(e){$('saveStatus').textContent='⚠ Storage unavailable'}}
function scheduleSave(){ $('saveStatus').textContent='◌ Saving…';clearTimeout(saveTimer);saveTimer=setTimeout(persist,260) }
let pendingConfirm=null;
function requestConfirmation(message,callback){pendingConfirm=callback;$('confirmText').textContent=message;$('confirmBar').hidden=false;}
function clearConfirmation(){pendingConfirm=null;$('confirmBar').hidden=true;}
$('confirmYes').addEventListener('click',()=>{const action=pendingConfirm;clearConfirmation();if(action)action()});
$('confirmNo').addEventListener('click',clearConfirmation);
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200)}
function renderDrafts(){const list=$('draftList');list.replaceChildren();data.drafts.forEach(d=>{const btn=document.createElement('button');btn.className='draft'+(d.id===data.active?' active':'');btn.title=d.name;const label=document.createElement('span');label.textContent='◇  '+d.name;btn.append(label);btn.addEventListener('click',()=>loadDraft(d.id));list.append(btn)})}
function loadDraft(id){data.active=id;const d=active();source.value=d.content;$('profileName').value=d.name;renderDrafts();refresh();const h=editHistories.get(id);if(h&&(h.states[h.index].content!==source.value||h.states[h.index].mixed!==data.mixed))editHistories.delete(id);refreshUndoButtons();persist()}
function updateMode(){
 $('mixedMode').classList.toggle('active',data.mixed);
 $('bbMode').classList.toggle('active',!data.mixed);
 $('mixedMode').setAttribute('aria-pressed',String(data.mixed));
 $('bbMode').setAttribute('aria-pressed',String(!data.mixed));
 $('modeHint').textContent=data.mixed
  ? 'Markdown and custom macros. Switch to BBCode to compile; switch back to decompile.'
  : 'Plain F-List BBCode. Switch to Markdown+ to decompile into editable Markdown and macros.';
 refresh();persist();
}
function wrapInline(tag,placeholder='your text'){const s=source.selectionStart,e=source.selectionEnd,selected=source.value.slice(s,e)||placeholder;replaceRange('['+tag+']'+selected+'[/'+tag.split('=')[0]+']',s,e,s+tag.length+2,s+tag.length+2+selected.length)}
function replaceRange(text,s=source.selectionStart,e=source.selectionEnd,selStart=s+text.length,selEnd=selStart){rememberSelection();source.focus();source.setRangeText(text,s,e,'end');source.setSelectionRange(selStart,selEnd);syncFromEditor();commitEdit('action')}
function addLine(text){const pos=source.selectionStart;replaceRange('\n'+text+'\n',pos,pos,pos+1+text.length,pos+1+text.length)}
function getCompiled(){return normalizeColorTags(data.mixed?markdownToBB(source.value):source.value)}
// Extended Markdown compiles to the ordinary F-List tags, never custom tags in the export.
const macroInlineNames=new Set(['color','b','i','s','big','small','u','underline','sup','sub','user','icon','eicon','img','image','link','noparse']);
const macroBlockNames=new Set(['center','left','right','justify','indent','quote','collapse','big','small','color']);
// F-List accepts exactly these twelve named colors, not arbitrary CSS hex codes.
const presetColors={
 red:'#e15261',orange:'#ed9a41',yellow:'#e8cf62',green:'#69c879',
 cyan:'#65d1d9',purple:'#a98de7',blue:'#6997df',pink:'#e88fbf',
 black:'#17171b',brown:'#996e4a',white:'#f0ecf0',gray:'#9997a2'
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
function colorWarnings(text){const issues=[];
 const check=value=>{if(!colorSafe(value))issues.push(closestPreset(value)?'Hex color '+value+' is approximated to an F-List preset':'Unsupported color '+value+' is stripped on export')};
 for(const m of text.matchAll(/\[color=([^\]\n]*)\]/gi))check(m[1]);
 for(const m of text.matchAll(/\{color:([^|}\n]+)\|/gi))check(m[1]);
 for(const m of text.matchAll(/^\s*:::color\s+(\S+).*$/gmi))check(m[1]);
 return [...new Set(issues)];}
function inlineMarkdown(text,protectedParts=[]){
 const protect=value=>{const id=protectedParts.length;protectedParts.push(value);return '\uE000'+id+'\uE001'};
 // Shield literal inline code before interpreting any BBCode or custom macros.
 text=text.replace(/`([^`\n]+)`/g,(_,literal)=>protect('[noparse]'+literal+'[/noparse]'));
 // Shield raw BBCode tag delimiters (the contents still accept Markdown).
 text=text.replace(/\[\/?(?:b|i|u|s|sup|sub|heading|big|small|center|right|left|justify|indent|quote|color|url|collapse|img|user|icon|eicon|noparse|hr)(?:=[^\]\n]*)?\]/gi,m=>protect(m));
 // Support nested inline macros, e.g. {color:purple|**bright**}.
 let output='';
 for(let i=0;i<text.length;){
  if(text[i]==='\\' && i+1<text.length && /[{}*_~+`\[\]\\]/.test(text[i+1])){output+=protect(text[i+1]);i+=2;continue}
  if(text[i]!=='{'){output+=text[i++];continue}
  let depth=1,j=i+1;for(;j<text.length&&depth;j++){if(text[j]==='{'&&text[j-1]!=='\\')depth++;else if(text[j]==='}'&&text[j-1]!=='\\')depth--}
  if(depth){output+=text[i++];continue}
  const expression=text.slice(i+1,j-1),m=expression.match(/^([a-z]+)(:([^|]*))?(?:\|([\s\S]*))?$/i);
  if(!m||!macroInlineNames.has(m[1].toLowerCase())){output+=text.slice(i,j);i=j;continue}
  const name=m[1].toLowerCase(),arg=(m[3]||'').trim(),body=m[4];let compiled=null;
  if(name==='color'&&body!==undefined){const color=resolvedColor(arg);const content=inlineMarkdown(body,protectedParts);compiled=color?'[color='+color+']'+content+'[/color]':content;}
  else if(['b','i','s','big','small','u','underline','sup','sub','noparse'].includes(name)&&body!==undefined){let tag=name==='underline'?'u':name;compiled='['+tag+']'+(name==='noparse'?body:inlineMarkdown(body,protectedParts))+'[/'+tag+']'}
  else if(['user','icon','eicon'].includes(name)&&arg&&body===undefined&&!/[\[\]{}]/.test(arg))compiled='['+name+']'+arg+'[/'+name+']';
  else if(['img','image'].includes(name)&&arg&&body===undefined){if(/^\d+$/.test(arg))compiled='[img='+arg+'][/img]';else if(safeUrl(arg))compiled='[img]'+arg+'[/img]'}
  else if(name==='link'&&safeUrl(arg)&&body!==undefined)compiled='[url='+arg+']'+inlineMarkdown(body,protectedParts)+'[/url]';
  output+=compiled===null?text.slice(i,j):protect(compiled);i=j;
 }
 text=output;
 // Protect links and images, and ensure only valid http(s) URLs are exported.
 text=text.replace(/!?\[([^\]\n]*)\]\((https?:\/\/[^\s)]+)\)/gi,(match,label,url)=>{
  if(!safeUrl(url))return match;
  return protect(match.startsWith('!')?'[img]'+url+'[/img]':'[url='+url+']'+inlineMarkdown(label,protectedParts)+'[/url]');
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
function markdownToBB(input){
 const lines=input.replace(/\r\n?/g,'\n').split('\n'),out=[],stack=[];
 let inFence=false,inNoParse=false;
 for(const line of lines){
  const trimmed=line.trim();
  // A fenced code block is literal text. F-List supports noparse, not Markdown fences.
  if(/^```/.test(trimmed)){if(!inNoParse){out.push(inFence?'[/noparse]':'[noparse]');inFence=!inFence;continue}}
  if(inFence){out.push(line);continue}
  if(inNoParse){out.push(line);if(/\[\/noparse\]/i.test(line))inNoParse=false;continue}
  if(/\[noparse\]/i.test(line)){inNoParse=!/\[\/noparse\]/i.test(line);out.push(line);continue}
  if(trimmed===':::'){
   if(stack.length){const closing=stack.pop();if(closing)out.push('[/'+closing+']');continue}
   out.push(line);continue;
  }
  const block=line.match(/^\s*:::([a-z]+)(?:\s+(.+))?\s*$/i);
  if(block){const tag=block[1].toLowerCase(),arg=(block[2]||'').trim();
   if(macroBlockNames.has(tag)){
    if(tag==='color'&&!resolvedColor(arg)){stack.push('');continue;}
    if((tag==='collapse'&&arg&&!/[\[\]]/.test(arg))||(tag==='color'&&resolvedColor(arg))||(!['collapse','color'].includes(tag)&&!arg)){
     out.push('['+tag+(arg?'='+(tag==='color'?resolvedColor(arg):arg):'')+']');stack.push(tag);continue;
    }
   }
  }
  if(/^\s*#{1,6}\s+/.test(line)){out.push('[heading]'+inlineMarkdown(line.replace(/^\s*#{1,6}\s+/,'').replace(/\s+#+\s*$/,''))+'[/heading]');continue}
  if(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)){out.push('[hr]');continue}
  const quote=line.match(/^\s*>\s?(.*)$/);if(quote){out.push('[quote]'+inlineMarkdown(quote[1])+'[/quote]');continue}
  const bullet=line.match(/^(\s*)[-*+]\s+(.+)$/);if(bullet){out.push(bullet[1]+'• '+inlineMarkdown(bullet[2]));continue}
  // Numbered lists are already readable as plain text on F-List.
  out.push(inlineMarkdown(line));
 }
 // Do not silently drop a missing closing ::: marker.
 while(stack.length)out.push('[/'+stack.pop()+']');
 if(inFence)out.push('[/noparse]');
 return out.join('\n');
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
 const tree=parseBBCode(normalizeColorTags(input));
 const blockTags=new Set(['center','left','right','justify','indent','quote','collapse']);
 const raw=node=>node.text!==undefined?node.text:node.tag==='hr'?'[hr]':node.open+node.children.map(raw).join('')+(node.unclosed?'':'[/'+node.tag+']');
 const children=node=>node.children.map(convert).join('');
 const hasBlocks=node=>node.children.some(child=>child.tag&&(blockTags.has(child.tag)||child.tag==='heading'||hasBlocks(child)));
 const boundaries=value=>'\uE006'+value.replace(/^\n+|\n+$/g,'')+'\uE007';
 function block(tag,arg,body){return boundaries(':::'+tag+(arg?' '+arg:'')+'\n'+body.replace(/^\n+|\n+$/g,'')+'\n:::')}
 function convert(node){
  if(node.text!==undefined)return escapePlain?escapePlainMarkdown(node.text):node.text;
  if(!node.tag)return children(node);
  if(node.unclosed)return raw(node);
  const tag=node.tag,content=children(node),plain=node.children.map(raw).join('');
  const inline=!/[\r\n]/.test(content)&&!hasBlocks(node);
  if(tag==='hr')return boundaries('---');
  if(tag==='heading')return inline?boundaries('# '+content):raw(node);
  if(['b','i','u','s'].includes(tag)){
   const marks={b:'**',i:'*',u:'++',s:'~~'};
   // Nested emphasis with surrounding prose is ambiguous to the compact parser.
   const nestedEmphasis=node.children.some(c=>['b','i'].includes(c.tag));
   const simpleBoldItalic=tag==='b'&&node.children.length===1&&node.children[0].tag==='i'&&node.children[0].children.every(c=>c.text!==undefined);
   if(['b','i','s'].includes(tag)&&nestedEmphasis&&!simpleBoldItalic)return '{'+tag+'|'+content+'}';
   if(/[\r\n]/.test(content))return raw(node);
   return marks[tag]+content+marks[tag];
  }
  if(['sup','sub','big','small'].includes(tag))return inline?'{'+tag+'|'+content+'}':block(tag,'',content);
  if(tag==='color'){
   const name=colorSafe(node.param);if(!name)return content;
   return inline?'{color:'+name+'|'+content+'}':block('color',name,content);
  }
  if(blockTags.has(tag)){
   if(tag==='collapse'&&(!node.param||/[\[\]\n]/.test(node.param)))return raw(node);
   return block(tag,tag==='collapse'?node.param:'',content);
  }
  if(tag==='url'){
   if(!node.param||!safeUrl(node.param))return raw(node);
   if(inline&&!/[\[\]]/.test(content))return '['+content+']('+node.param+')';
   if(inline&&!/[{}]/.test(content))return '{link:'+node.param+'|'+content+'}';
   return raw(node);
  }
  if(['user','icon','eicon'].includes(tag))return /^[^{}\[\]\n]+$/.test(plain)?'{'+tag+':'+plain+'}':raw(node);
  if(tag==='img'){
   if(node.param&&/^\d+$/.test(node.param)&&!plain.trim())return '{img:'+node.param+'}';
   if(!node.param&&safeUrl(plain.trim()))return '{img:'+plain.trim()+'}';
   return raw(node);
  }
  if(tag==='noparse'){
   if(!/[{}\n]/.test(plain))return '{noparse|'+plain+'}';
   if(!/```|\[\/noparse\]/i.test(plain))return boundaries('```\n'+plain.replace(/^\n+|\n+$/g,'')+'\n```');
   return raw(node);
  }
  return raw(node);
 }
 const result=children(tree);
 // Boundary sentinels ensure the Markdown syntax lands on its own line,
 // while reusing line breaks that were already present in the BBCode.
 return result.replace(/[\uE006\uE007\n]+/g,part=>'\n'.repeat(Math.max(1,(part.match(/\n/g)||[]).length))).trim();
}
function renderBB(input){
 const root=document.createDocumentFragment();let cursor=root;
 const stack=[];
 const token=/\[(\/?)((?:[a-z]+))(?:=([^\]\n]*))?\]/gi;let previous=0,match;
 const appendText=(value)=>{if(value)cursor.appendChild(document.createTextNode(value))};
 function close(tag){const idx=stack.map(x=>x.tag).lastIndexOf(tag);if(idx<0)return false;while(stack.length>idx){const frame=stack.pop();if(frame.tag==='url'&&!frame.param){const href=safeUrl(frame.el.textContent.trim());if(href)frame.el.href=href;else{frame.el.removeAttribute('href');frame.el.title='Invalid URL'}}if(['eicon','user','icon','img','noparse'].includes(frame.tag))finishSpecial(frame);cursor=stack.length?stack[stack.length-1].inner:root}return true}
 function finishSpecial(frame){const str=frame.inner.textContent.trim();const holder=frame.el;holder.replaceChildren();if(frame.tag==='noparse'){holder.append(document.createTextNode(str));return}if(frame.tag==='user'||frame.tag==='icon'){const href='https://www.f-list.net/c/'+encodeURIComponent(str);const a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.className='usermention';if(frame.tag==='icon'){const img=document.createElement('img');img.className='eicon';img.alt=str;img.loading='lazy';img.src='https://static.f-list.net/images/avatar/'+encodeURIComponent(str.toLowerCase())+'.png';a.append(img)}else a.textContent='@'+str;holder.append(a);return}
 if(frame.tag==='eicon'){if(!/^[\w\- ]{1,80}$/.test(str)){holder.textContent='[eicon]'+str+'[/eicon]';return}const img=document.createElement('img');img.className='eicon';img.alt='eicon: '+str;img.loading='lazy';img.src='https://static.f-list.net/images/eicon/'+encodeURIComponent(str.toLowerCase())+'.gif';holder.append(img);return}
 if(frame.tag==='img'){const imageSrc=frame.param?'':safeUrl(str);if(imageSrc){const img=document.createElement('img');img.className='profileimg';img.alt='Profile image';img.loading='lazy';img.src=imageSrc;holder.append(img)}else{const span=document.createElement('span');span.className='placeholder-image';span.textContent=frame.param?'▧ F-List inline image #'+frame.param+' (preview unavailable)':'▧ Image unavailable: '+str.slice(0,90);holder.append(span)}}
 }
 function make(tag,param){let el,inner;
 switch(tag){case 'b':el=document.createElement('strong');break;case 'i':el=document.createElement('em');break;case 'u':el=document.createElement('u');break;case 's':el=document.createElement('s');break;case 'sup':el=document.createElement('sup');break;case 'sub':el=document.createElement('sub');break;case 'heading':el=document.createElement('h2');break;case 'big':case 'small':el=document.createElement('span');el.className=tag;break;case 'center':case 'right':case 'justify':case 'left':el=document.createElement('div');el.className='align-'+tag;break;case 'indent':el=document.createElement('div');el.className='indent';break;case 'quote':el=document.createElement('blockquote');break;case 'color':el=document.createElement('span');if(colorSafe(param))el.style.color=presetColors[colorSafe(param)];break;case 'url':el=document.createElement('a');el.target='_blank';el.rel='nofollow noopener noreferrer';if(safeUrl(param||''))el.href=safeUrl(param);break;case 'collapse':el=document.createElement('details');{let summary=document.createElement('summary');summary.textContent=param||'More details';el.append(summary);inner=document.createElement('div');inner.className='foldbody';el.append(inner)}break;case 'eicon':case 'icon':case 'user':case 'img':case 'noparse':el=document.createElement('span');inner=document.createElement('span');el.append(inner);break;default:return null}
 return {tag,param,el,inner:inner||el}}
 while((match=token.exec(input))!==null){
 const [full,closing,rawTag,rawParam]=match,tag=rawTag.toLowerCase(),param=(rawParam||'').trim();
 // Inside noparse, preserve all tags except its closing tag.
 if(stack.some(f=>f.tag==='noparse')&&!(closing&&tag==='noparse'))continue;
 // Treat special content tags as raw until closed.
 const special=stack.findLast(f=>['eicon','user','icon','img'].includes(f.tag));
 if(special&&!(closing&&tag===special.tag))continue;
 if(!allowedTags.has(tag)){continue}
 appendText(input.slice(previous,match.index));previous=token.lastIndex;
 if(tag==='hr'&&!closing){cursor.append(document.createElement('hr'));continue}
 if(closing){if(!close(tag))appendText(full);continue}
 const frame=make(tag,param);if(!frame){appendText(full);continue}cursor.append(frame.el);stack.push(frame);cursor=frame.inner;
 }
 appendText(input.slice(previous));return root;
}
function countWarnings(compiled){let issues=[];const opens={};for(const m of compiled.matchAll(/\[(\/?)((?:[a-z]+))(?:=[^\]\n]*)?\]/gi)){let tag=m[2].toLowerCase();if(!allowedTags.has(tag)){if(['session','list','li','size','table','font','spoiler','youtube','code'].includes(tag))issues.push('Unsupported or unverified tag: '+tag);continue}if(tag==='hr')continue;if(m[1]){if((opens[tag]||0)===0)issues.push('Unmatched [/'+tag+']');else opens[tag]--}else opens[tag]=(opens[tag]||0)+1}Object.keys(opens).filter(tag=>opens[tag]).forEach(tag=>issues.push('Unclosed ['+tag+']'));if(/<\/?(?:div|span|table|p|br)\b/i.test(compiled))issues.push('HTML is not supported in descriptions');return [...new Set(issues)]}
function refresh(){const bb=getCompiled();$('previewTitle').textContent=$('profileName').value.trim()||'Untitled character';const preview=$('preview');preview.replaceChildren();try{preview.appendChild(renderBB(bb))}catch(e){preview.textContent='Preview error: '+e.message}const text=source.value;$('stats').textContent=(text.trim()?text.trim().split(/\s+/).length:0)+' words · '+text.length.toLocaleString()+' characters';const problems=[...countWarnings(bb),...colorWarnings(source.value)];$('warningCount').textContent=problems.length?problems.length+' potential issue'+(problems.length===1?'':'s'):'No obvious issues';$('warningCount').title=problems.join('\n')}
function syncFromEditor(){active().content=source.value;refresh();scheduleSave()}
function syncName(){active().name=$('profileName').value||'Untitled character';renderDrafts();refresh();scheduleSave()}
source.addEventListener('input',e=>{syncFromEditor();commitEdit('typing',e.inputType||'input')});
// Some browsers dispatch historyUndo/historyRedo beforeinput rather than keydown.
source.addEventListener('beforeinput',e=>{
 if(e.inputType==='historyUndo'||e.inputType==='historyRedo'){
  e.preventDefault();(e.inputType==='historyUndo'?undoEdit:redoEdit)();
 }
});
$('profileName').addEventListener('input',syncName);
$('newDraft').addEventListener('click',()=>{let d={id:makeId(),name:'Untitled character',content:''};data.drafts.unshift(d);loadDraft(d.id);$('profileName').focus();$('profileName').select();toast('New character draft created')});
$('deleteDraft').addEventListener('click',()=>requestConfirmation('Delete the current draft? This cannot be undone.',()=>{data.drafts=data.drafts.filter(d=>d.id!==data.active);if(!data.drafts.length)data.drafts.push({id:makeId(),name:'New Character',content:''});loadDraft(data.drafts[0].id);toast('Draft deleted')}));
document.querySelectorAll('[data-template]').forEach(btn=>btn.addEventListener('click',()=>{const type=btn.dataset.template;const apply=()=>{rememberSelection();source.value=data.mixed?templates[type]:markdownToBB(templates[type]);source.focus();syncFromEditor();commitEdit('action');toast('Markdown-first template applied')};if(source.value.trim())requestConfirmation('Replace this draft with the '+type+' template?',apply);else apply()}));
document.querySelectorAll('[data-wrap]').forEach(btn=>btn.addEventListener('click',()=>wrapInline(btn.dataset.wrap)));
document.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>{switch(btn.dataset.action){case 'hr':case 'divider':addLine('[hr]');break;case 'details':addLine('[b]Field:[/b] Details');break}}));
const palette=$('colorPalette');
function wrapColor(name){if(!colorSafe(name))return;
 if(!data.mixed){wrapInline('color='+name);return}
 const s=source.selectionStart,e=source.selectionEnd,chosen=source.value.slice(s,e)||'your text';
 const prefix='{color:'+name+'|';replaceRange(prefix+chosen+'}',s,e,s+prefix.length,s+prefix.length+chosen.length);
}
colorNames.forEach(name=>{const btn=document.createElement('button');btn.type='button';btn.className='palette-option';btn.title='Apply F-List '+name;
 btn.setAttribute('aria-label','Apply '+name+' text color');
 const swatch=document.createElement('span');swatch.className='color-swatch';swatch.style.setProperty('--swatch',presetColors[name]);
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
$('theme').addEventListener('change',e=>{data.theme=e.target.value;setTheme();persist()});function setTheme(){$('previewPage').className='previewpage'+(data.theme==='default'?'':' '+data.theme);$('theme').value=data.theme}
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
function insertTag(type){
 const spec=insertionSpecs[type];if(!spec)return;
 const s=source.selectionStart,e=source.selectionEnd,chosen=source.value.slice(s,e);
 const text=spec.prefix+(chosen||spec.fallback)+spec.suffix;
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
 ['Basics','Links','A link with human-friendly text','[Visit my inspiration board](https://example.com)'],
 ['Basics','Image from URL','The target site may restrict external images','![A portrait](https://example.com/portrait.png)'],
 ['Basics','Quotes','Standard Markdown blockquotes','> “Everything has a price.”'],
 ['Basics','Bullet list','Plain text bullets compatible with F-List','- Adventurous\n- Sarcastic\n- Fond of stargazing'],
 ['Basics','Numbered list','Numbers remain readable','1. First encounter\n2. Second chance\n3. Final chapter'],
 ['Basics','Inline code','Show syntax literally, without formatting','Write `[b]bold[/b]` to display code.'],
 ['Basics','Literal block','Triple backticks convert to noparse','```\n[b]Printed literally[/b]\n```'],
 ['Macros','Color presets','F-List supports red, orange, yellow, green, cyan, purple, blue, pink, black, brown, white and gray','{color:purple|An important note} and {color:orange|a warm welcome}'],
 ['Macros','Colored Markdown','Combine nested custom macros and bold','{color:cyan|**Cyan and bold**}'],
 ['Macros','Every color','All 12 native F-List color presets','{color:red|Red} {color:orange|Orange} {color:yellow|Yellow} {color:green|Green} {color:cyan|Cyan} {color:purple|Purple} {color:blue|Blue} {color:pink|Pink} {color:black|Black} {color:brown|Brown} {color:white|White} {color:gray|Gray}'],
 ['Macros','Character mention','Clickable F-List character name','A friend: {user:Character Name}'],
 ['Macros','Character avatar','Show another character’s icon','{icon:Character Name}'],
 ['Macros','Eicon','Display an uploaded F-List eicon','{eicon:eicon-name}'],
 ['Macros','Uploaded profile image','Reference a numeric F-List image ID','{img:12345}'],
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
 ['Recipes','Decompiled profile','What a former BBCode profile looks like after conversion',':::center\n:::color purple\n# Old profile\n:::\n:::'],
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
$('openSite').addEventListener('click',()=>window.open('https://www.f-list.net/','_blank','noopener,noreferrer'));
async function copyCode(){const code=getCompiled();try{await navigator.clipboard.writeText(code);toast('BBCode copied. Paste into F-List!')}catch(e){const box=document.createElement('textarea');box.value=code;box.style.cssText='position:fixed;opacity:0;top:0';document.body.append(box);box.select();try{document.execCommand('copy');toast('BBCode copied')}catch(error){toast('Use Export .bbcode to save your code')}box.remove()}}
$('copyCode').addEventListener('click',copyCode);
function download(text,file,type='text/plain;charset=utf-8'){const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([text],{type}));link.download=file;document.body.append(link);link.click();setTimeout(()=>URL.revokeObjectURL(link.href),2000);link.remove()}
const slug=()=> (active().name||'character').trim().replace(/[^a-z0-9_-]+/gi,'_').replace(/^_+|_+$/g,'').slice(0,60)||'character';
$('downloadCode').addEventListener('click',()=>{download(getCompiled(),slug()+'.bbcode');toast('BBCode exported')});
$('backupBtn').addEventListener('click',()=>{download(JSON.stringify({format:'folio-profile',version:1,name:active().name,content:active().content,mixed:data.mixed},null,2),slug()+'.folio.json','application/json');toast('Editable backup exported')});
$('importBtn').addEventListener('click',()=>$('fileImport').click());
$('fileImport').addEventListener('change',async(e)=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>1500000){toast('File is too large (max 1.5 MB)');return}let str=await file.text(),name=file.name.replace(/\.(folio\.json|bbcode|txt|md|json)$/i,'');if(file.name.toLowerCase().endsWith('.json')){try{const record=JSON.parse(str);if(typeof record.content!=='string')throw Error('No profile content');name=String(record.name||name);str=record.content;if(typeof record.mixed==='boolean'){data.mixed=record.mixed;updateMode()}}catch(error){toast('Not a valid Folio backup');return}}
 const apply=()=>{active().name=name.slice(0,100);active().content=str;loadDraft(data.active);toast('Profile imported')};if(source.value.trim())requestConfirmation('Replace this draft with the imported file?',apply);else apply()});
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
setTheme();loadDraft(data.active);updateMode();refreshUndoButtons();
})();
