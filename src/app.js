
(() => {
'use strict';
const $ = id => document.getElementById(id);
const source = $('source');
let diagnosticHover;
const STORAGE='folio-f-list-studio-v1';
const makeId=()=> 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const templates=globalThis.FolioTemplates;
const intro=templates.dossier;
function validateCustomTemplates(records){
 if(!Array.isArray(records))return [];
 const seen=new Set();
 return records.filter(record=>{
  if(!record||typeof record.id!=='string'||!record.id||seen.has(record.id)||typeof record.name!=='string'||!record.name.trim()||typeof record.content!=='string'||record.content.length>1500000)return false;
  seen.add(record.id);return true;
 }).slice(0,100).map(record=>({id:record.id,name:record.name.trim().slice(0,100),content:record.content}));
}
let data={customTemplates:[],drafts:[{id:makeId(),name:'New Character',content:intro}],active:null,theme:'flist-blue',editorTheme:'folio',previewFontSize:'site',splitRatio:.524,previewNoteDismissed:false,preferLiterals:true,mixed:true};
data.active=data.drafts[0].id;
try{const loaded=JSON.parse(localStorage.getItem(STORAGE));if(loaded&&Array.isArray(loaded.drafts)&&loaded.drafts.length){const valid=loaded.drafts.filter(d=>typeof d.id==='string'&&typeof d.name==='string'&&typeof d.content==='string').slice(0,80);if(valid.length){data={customTemplates:validateCustomTemplates(loaded.customTemplates),drafts:valid,active:valid.some(d=>d.id===loaded.active)?loaded.active:valid[0].id,editorTheme:['folio','graphite','forest','paper'].includes(loaded.editorTheme)?loaded.editorTheme:'folio',theme:Array.from($('theme').options).some(option=>option.value===loaded.theme)?loaded.theme:'flist-blue',previewFontSize:parsePreviewFontSize(loaded.previewFontSize)||'site',splitRatio:typeof loaded.splitRatio==='number'&&Number.isFinite(loaded.splitRatio)?Math.max(.25,Math.min(.75,loaded.splitRatio)):.524,previewNoteDismissed:loaded.previewNoteDismissed===true,preferLiterals:loaded.preferLiterals!==false,mixed:loaded.mixed!==false}}}}catch(e){}
let saveTimer=null,toastTimer=null;
let templateSession=null,editorLoaded=false;
const templateEditors=new Map(),characterEditors=new Map();
// Undo is managed explicitly because setRangeText() and textarea.value edits do not
// consistently enter the browser's native undo stack across browsers.
const editHistories=new Map();
const MAX_UNDO_STATES=180;
function editorSnapshot(){return {content:source.value,mixed:data.mixed,preferLiterals:data.preferLiterals!==false,start:source.selectionStart,end:source.selectionEnd,scroll:source.scrollTop}}
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
 if(prev.content===source.value&&prev.mixed===data.mixed&&(prev.preferLiterals!==false)===(data.preferLiterals!==false))h.states[h.index]=editorSnapshot();
}
function commitEdit(kind='action',inputType=''){
 const h=currentHistory(),next=editorSnapshot(),old=h.states[h.index];
 if(next.content===old.content&&next.mixed===old.mixed&&next.preferLiterals===(old.preferLiterals!==false)){h.states[h.index]=next;refreshUndoButtons();return}
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
 data.mixed=state.mixed;data.preferLiterals=state.preferLiterals!==false;source.value=state.content;
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
 $('preferLiterals').checked=data.preferLiterals!==false;$('preferLiterals').disabled=!data.mixed;
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
 if(tag==='heading2'){prefix='[heading]';suffix='[/heading]'}
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
  else if(tag==='heading2'&&!selected.includes('\n')){prefix='## ';suffix='';block=true}
  else if(tag==='heading2'){prefix=':::heading\n';suffix='\n:::';block=true}
  else if(tag==='heading'&&!selected.includes('\n')){prefix='# ';suffix='';block=true}
  else if(tag==='big'&&!selected.includes('\n')){prefix='{big|';suffix='}'}
  else if(tag==='heading'){prefix=':::heading\n:::big\n';suffix='\n:::\n:::';block=true}
  else if(['center','right','justify'].includes(tag)||selected.includes('\n')){prefix=':::'+tag+'\n';suffix='\n:::';block=true}
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
const macroInlineNames=new Set(['center','left','right','justify','indent','quote','collapse','font','color','b','i','s','big','small','u','underline','sup','sub','user','icon','eicon','img','image','link','noparse','br','heading','hr']);
const macroBlockNames=new Set(['font','center','left','right','justify','indent','quote','collapse','big','small','color','heading','b','i','u','s']);
// Unicode alphabets export as ordinary text, without unsupported [font] tags.
const fontAlphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function unicodeAlphabet(upper,lower,digits=null,exceptions={}){
 return [...fontAlphabet].map((char,index)=>exceptions[char]||String.fromCodePoint(index<26?upper+index:index<52?lower+index-26:digits===null?char.codePointAt(0):digits+index-52));
}
const fontStyles={
 smallcaps:{label:'Small caps',chars:[...('ABCDEFGHIJKLMNOPQRSTUVWXYZ\u1d00\u0299\u1d04\u1d05\u1d07\ua730\u0262\u029c\u026a\u1d0a\u1d0b\u029f\u1d0d\u0274\u1d0f\u1d18\ua7af\u0280\ua731\u1d1b\u1d1c\u1d20\u1d21x\u028f\u1d22'+'0123456789')]},
 bold:{label:'Bold Unicode',chars:[...Array.from({length:26},(_,i)=>String.fromCodePoint(0x1d400+i)),...Array.from({length:26},(_,i)=>String.fromCodePoint(0x1d41a+i)),...Array.from({length:10},(_,i)=>String.fromCodePoint(0x1d7ce+i))]},
 doublestruck:{label:'Double-struck',chars:[...Array.from({length:26},(_,i)=>({2:'\u2102',7:'\u210d',13:'\u2115',15:'\u2119',16:'\u211a',17:'\u211d',25:'\u2124'}[i]||String.fromCodePoint(0x1d538+i))),...Array.from({length:26},(_,i)=>String.fromCodePoint(0x1d552+i)),...Array.from({length:10},(_,i)=>String.fromCodePoint(0x1d7d8+i))]},
 italic:{label:'Italic Unicode',chars:unicodeAlphabet(0x1d434,0x1d44e,null,{h:'\u210e'})},
 bolditalic:{label:'Bold italic Unicode',chars:unicodeAlphabet(0x1d468,0x1d482)},
 sans:{label:'Sans serif',chars:unicodeAlphabet(0x1d5a0,0x1d5ba,0x1d7e2)},
 sansbold:{label:'Sans serif bold',chars:unicodeAlphabet(0x1d5d4,0x1d5ee,0x1d7ec)},
 fraktur:{label:'Fraktur',chars:unicodeAlphabet(0x1d504,0x1d51e,null,{C:'\u212d',H:'\u210c',I:'\u2111',R:'\u211c',Z:'\u2128'})},
 monospace:{label:'Monospace',chars:[...Array.from({length:26},(_,i)=>String.fromCodePoint(0x1d670+i)),...Array.from({length:26},(_,i)=>String.fromCodePoint(0x1d68a+i)),...Array.from({length:10},(_,i)=>String.fromCodePoint(0x1d7f6+i))]},
 fullwidth:{label:'Fullwidth',chars:[...fontAlphabet].map(c=>String.fromCodePoint(c.charCodeAt(0)+0xfee0))}
};
function applyFont(text,name){
 const style=fontStyles[name];if(!style)return text;
 // Preserve BBCode parameters, URLs, image labels and literal text.
 return text.split(/(\[noparse\][\s\S]*?\[\/noparse\]|\[(?:url|img|user|icon|eicon)(?:=[^\]]*)?\][\s\S]*?\[\/(?:url|img|user|icon|eicon)\]|\[[^\]\n]*\])/gi).map((part,i)=>i%2?part:[...part].map(c=>{const index=fontAlphabet.indexOf(c);return index<0?c:style.chars[index]}).join('')).join('');
}
function decompileFonts(text,escapePlain){
 const plain=value=>escapePlain?escapePlainMarkdown(value):value;
 const reverse=new Map();
 for(const [name,style] of Object.entries(fontStyles))style.chars.forEach((char,i)=>{if(char!==fontAlphabet[i])reverse.set(char,{name,char:fontAlphabet[i]})});
 let result='',buffer='',style=null;
 const flush=()=>{
  if(buffer){
   // Spacing and symbols can bridge styled text, but are not trailing font text.
   const trailing=style?(buffer.match(/[\p{Z}\p{S}\t]+$/u)?.[0]||''):'';
   const body=trailing?buffer.slice(0,-trailing.length):buffer;
   result+=style&&body?'{font:'+style+'|'+plain(body)+'}':plain(body);
   result+=plain(trailing);
  }
  buffer='';
 };
 const chars=[...text];
 const unchanged=(char,name)=>{
  if(char==='\n'||char==='\r'||reverse.has(char))return false;
  const index=fontAlphabet.indexOf(char);
  return index<0||fontStyles[name].chars[index]===char;
 };
 if(text.includes('\n')){
  const names=new Set(chars.map(char=>reverse.get(char)?.name).filter(Boolean));
  const styledLines=text.split(/\r?\n/).every(line=>!line.trim()||[...line].some(char=>reverse.has(char)));
  if(names.size===1&&styledLines){const name=[...names][0],decoded=chars.map(char=>reverse.get(char)?.char||char).join('');
   if(applyFont(decoded,name)===text)return '\uE006:::font '+name+'\n'+plain(decoded)+'\n:::\uE007';
  }
 }
 for(const char of chars){
  const entry=reverse.get(char);
  if(!entry&&style&&unchanged(char,style)){buffer+=char;continue}
  const next=entry?.name||null;
  if(next!==style){
   let prefix='';
   // Greedily recover the unchanged suffix before a styled run, too.
   if(next&&!style){
    const previous=[...buffer];let start=previous.length;
    while(start>0&&unchanged(previous[start-1],next))start--;
    prefix=previous.slice(start).join('');buffer=previous.slice(0,start).join('');
   }
   flush();style=next;buffer=prefix;
  }
  buffer+=entry?.char||char;
 }
 flush();return result;
}
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
 if(!mixed)text=text.replace(/\[noparse\][\s\S]*?(?:\[\/noparse\]|$)/gi,'');
 if(mixed)text=text.replace(/^\s*```[^\n]*\n[\s\S]*?(?:^\s*```[^\n]*(?:\n|$)|(?![\s\S]))/gm,'').replace(/`[^`\n]+`/g,'');
 const check=value=>{const warning=colorWarning(value);if(warning)issues.push(warning)};
 if(!mixed)for(const m of text.matchAll(/\[color(?:=([^\]\n]*))?\]/gi))check(m[1]);
 if(mixed){
  for(const m of text.matchAll(/\{color(?::([^|}\n]*))?\|/gi))check(m[1]);
  for(const m of text.matchAll(/^\s*:::color(?:[ \t]+([^\n]*))?$/gmi))check(m[1]);
 }
 return [...new Set(issues)];
}
// HTML5 named character references (Python standard-library html.entities.html5).
const namedCharacterReferences={"AElig":"\u00c6","AMP":"&","Aacute":"\u00c1","Abreve":"\u0102","Acirc":"\u00c2","Acy":"\u0410","Afr":"\ud835\udd04","Agrave":"\u00c0","Alpha":"\u0391","Amacr":"\u0100","And":"\u2a53","Aogon":"\u0104","Aopf":"\ud835\udd38","ApplyFunction":"\u2061","Aring":"\u00c5","Ascr":"\ud835\udc9c","Assign":"\u2254","Atilde":"\u00c3","Auml":"\u00c4","Backslash":"\u2216","Barv":"\u2ae7","Barwed":"\u2306","Bcy":"\u0411","Because":"\u2235","Bernoullis":"\u212c","Beta":"\u0392","Bfr":"\ud835\udd05","Bopf":"\ud835\udd39","Breve":"\u02d8","Bscr":"\u212c","Bumpeq":"\u224e","CHcy":"\u0427","COPY":"\u00a9","Cacute":"\u0106","Cap":"\u22d2","CapitalDifferentialD":"\u2145","Cayleys":"\u212d","Ccaron":"\u010c","Ccedil":"\u00c7","Ccirc":"\u0108","Cconint":"\u2230","Cdot":"\u010a","Cedilla":"\u00b8","CenterDot":"\u00b7","Cfr":"\u212d","Chi":"\u03a7","CircleDot":"\u2299","CircleMinus":"\u2296","CirclePlus":"\u2295","CircleTimes":"\u2297","ClockwiseContourIntegral":"\u2232","CloseCurlyDoubleQuote":"\u201d","CloseCurlyQuote":"\u2019","Colon":"\u2237","Colone":"\u2a74","Congruent":"\u2261","Conint":"\u222f","ContourIntegral":"\u222e","Copf":"\u2102","Coproduct":"\u2210","CounterClockwiseContourIntegral":"\u2233","Cross":"\u2a2f","Cscr":"\ud835\udc9e","Cup":"\u22d3","CupCap":"\u224d","DD":"\u2145","DDotrahd":"\u2911","DJcy":"\u0402","DScy":"\u0405","DZcy":"\u040f","Dagger":"\u2021","Darr":"\u21a1","Dashv":"\u2ae4","Dcaron":"\u010e","Dcy":"\u0414","Del":"\u2207","Delta":"\u0394","Dfr":"\ud835\udd07","DiacriticalAcute":"\u00b4","DiacriticalDot":"\u02d9","DiacriticalDoubleAcute":"\u02dd","DiacriticalGrave":"`","DiacriticalTilde":"\u02dc","Diamond":"\u22c4","DifferentialD":"\u2146","Dopf":"\ud835\udd3b","Dot":"\u00a8","DotDot":"\u20dc","DotEqual":"\u2250","DoubleContourIntegral":"\u222f","DoubleDot":"\u00a8","DoubleDownArrow":"\u21d3","DoubleLeftArrow":"\u21d0","DoubleLeftRightArrow":"\u21d4","DoubleLeftTee":"\u2ae4","DoubleLongLeftArrow":"\u27f8","DoubleLongLeftRightArrow":"\u27fa","DoubleLongRightArrow":"\u27f9","DoubleRightArrow":"\u21d2","DoubleRightTee":"\u22a8","DoubleUpArrow":"\u21d1","DoubleUpDownArrow":"\u21d5","DoubleVerticalBar":"\u2225","DownArrow":"\u2193","DownArrowBar":"\u2913","DownArrowUpArrow":"\u21f5","DownBreve":"\u0311","DownLeftRightVector":"\u2950","DownLeftTeeVector":"\u295e","DownLeftVector":"\u21bd","DownLeftVectorBar":"\u2956","DownRightTeeVector":"\u295f","DownRightVector":"\u21c1","DownRightVectorBar":"\u2957","DownTee":"\u22a4","DownTeeArrow":"\u21a7","Downarrow":"\u21d3","Dscr":"\ud835\udc9f","Dstrok":"\u0110","ENG":"\u014a","ETH":"\u00d0","Eacute":"\u00c9","Ecaron":"\u011a","Ecirc":"\u00ca","Ecy":"\u042d","Edot":"\u0116","Efr":"\ud835\udd08","Egrave":"\u00c8","Element":"\u2208","Emacr":"\u0112","EmptySmallSquare":"\u25fb","EmptyVerySmallSquare":"\u25ab","Eogon":"\u0118","Eopf":"\ud835\udd3c","Epsilon":"\u0395","Equal":"\u2a75","EqualTilde":"\u2242","Equilibrium":"\u21cc","Escr":"\u2130","Esim":"\u2a73","Eta":"\u0397","Euml":"\u00cb","Exists":"\u2203","ExponentialE":"\u2147","Fcy":"\u0424","Ffr":"\ud835\udd09","FilledSmallSquare":"\u25fc","FilledVerySmallSquare":"\u25aa","Fopf":"\ud835\udd3d","ForAll":"\u2200","Fouriertrf":"\u2131","Fscr":"\u2131","GJcy":"\u0403","GT":">","Gamma":"\u0393","Gammad":"\u03dc","Gbreve":"\u011e","Gcedil":"\u0122","Gcirc":"\u011c","Gcy":"\u0413","Gdot":"\u0120","Gfr":"\ud835\udd0a","Gg":"\u22d9","Gopf":"\ud835\udd3e","GreaterEqual":"\u2265","GreaterEqualLess":"\u22db","GreaterFullEqual":"\u2267","GreaterGreater":"\u2aa2","GreaterLess":"\u2277","GreaterSlantEqual":"\u2a7e","GreaterTilde":"\u2273","Gscr":"\ud835\udca2","Gt":"\u226b","HARDcy":"\u042a","Hacek":"\u02c7","Hat":"^","Hcirc":"\u0124","Hfr":"\u210c","HilbertSpace":"\u210b","Hopf":"\u210d","HorizontalLine":"\u2500","Hscr":"\u210b","Hstrok":"\u0126","HumpDownHump":"\u224e","HumpEqual":"\u224f","IEcy":"\u0415","IJlig":"\u0132","IOcy":"\u0401","Iacute":"\u00cd","Icirc":"\u00ce","Icy":"\u0418","Idot":"\u0130","Ifr":"\u2111","Igrave":"\u00cc","Im":"\u2111","Imacr":"\u012a","ImaginaryI":"\u2148","Implies":"\u21d2","Int":"\u222c","Integral":"\u222b","Intersection":"\u22c2","InvisibleComma":"\u2063","InvisibleTimes":"\u2062","Iogon":"\u012e","Iopf":"\ud835\udd40","Iota":"\u0399","Iscr":"\u2110","Itilde":"\u0128","Iukcy":"\u0406","Iuml":"\u00cf","Jcirc":"\u0134","Jcy":"\u0419","Jfr":"\ud835\udd0d","Jopf":"\ud835\udd41","Jscr":"\ud835\udca5","Jsercy":"\u0408","Jukcy":"\u0404","KHcy":"\u0425","KJcy":"\u040c","Kappa":"\u039a","Kcedil":"\u0136","Kcy":"\u041a","Kfr":"\ud835\udd0e","Kopf":"\ud835\udd42","Kscr":"\ud835\udca6","LJcy":"\u0409","LT":"<","Lacute":"\u0139","Lambda":"\u039b","Lang":"\u27ea","Laplacetrf":"\u2112","Larr":"\u219e","Lcaron":"\u013d","Lcedil":"\u013b","Lcy":"\u041b","LeftAngleBracket":"\u27e8","LeftArrow":"\u2190","LeftArrowBar":"\u21e4","LeftArrowRightArrow":"\u21c6","LeftCeiling":"\u2308","LeftDoubleBracket":"\u27e6","LeftDownTeeVector":"\u2961","LeftDownVector":"\u21c3","LeftDownVectorBar":"\u2959","LeftFloor":"\u230a","LeftRightArrow":"\u2194","LeftRightVector":"\u294e","LeftTee":"\u22a3","LeftTeeArrow":"\u21a4","LeftTeeVector":"\u295a","LeftTriangle":"\u22b2","LeftTriangleBar":"\u29cf","LeftTriangleEqual":"\u22b4","LeftUpDownVector":"\u2951","LeftUpTeeVector":"\u2960","LeftUpVector":"\u21bf","LeftUpVectorBar":"\u2958","LeftVector":"\u21bc","LeftVectorBar":"\u2952","Leftarrow":"\u21d0","Leftrightarrow":"\u21d4","LessEqualGreater":"\u22da","LessFullEqual":"\u2266","LessGreater":"\u2276","LessLess":"\u2aa1","LessSlantEqual":"\u2a7d","LessTilde":"\u2272","Lfr":"\ud835\udd0f","Ll":"\u22d8","Lleftarrow":"\u21da","Lmidot":"\u013f","LongLeftArrow":"\u27f5","LongLeftRightArrow":"\u27f7","LongRightArrow":"\u27f6","Longleftarrow":"\u27f8","Longleftrightarrow":"\u27fa","Longrightarrow":"\u27f9","Lopf":"\ud835\udd43","LowerLeftArrow":"\u2199","LowerRightArrow":"\u2198","Lscr":"\u2112","Lsh":"\u21b0","Lstrok":"\u0141","Lt":"\u226a","Map":"\u2905","Mcy":"\u041c","MediumSpace":"\u205f","Mellintrf":"\u2133","Mfr":"\ud835\udd10","MinusPlus":"\u2213","Mopf":"\ud835\udd44","Mscr":"\u2133","Mu":"\u039c","NJcy":"\u040a","Nacute":"\u0143","Ncaron":"\u0147","Ncedil":"\u0145","Ncy":"\u041d","NegativeMediumSpace":"\u200b","NegativeThickSpace":"\u200b","NegativeThinSpace":"\u200b","NegativeVeryThinSpace":"\u200b","NestedGreaterGreater":"\u226b","NestedLessLess":"\u226a","NewLine":"\n","Nfr":"\ud835\udd11","NoBreak":"\u2060","NonBreakingSpace":"\u00a0","Nopf":"\u2115","Not":"\u2aec","NotCongruent":"\u2262","NotCupCap":"\u226d","NotDoubleVerticalBar":"\u2226","NotElement":"\u2209","NotEqual":"\u2260","NotEqualTilde":"\u2242\u0338","NotExists":"\u2204","NotGreater":"\u226f","NotGreaterEqual":"\u2271","NotGreaterFullEqual":"\u2267\u0338","NotGreaterGreater":"\u226b\u0338","NotGreaterLess":"\u2279","NotGreaterSlantEqual":"\u2a7e\u0338","NotGreaterTilde":"\u2275","NotHumpDownHump":"\u224e\u0338","NotHumpEqual":"\u224f\u0338","NotLeftTriangle":"\u22ea","NotLeftTriangleBar":"\u29cf\u0338","NotLeftTriangleEqual":"\u22ec","NotLess":"\u226e","NotLessEqual":"\u2270","NotLessGreater":"\u2278","NotLessLess":"\u226a\u0338","NotLessSlantEqual":"\u2a7d\u0338","NotLessTilde":"\u2274","NotNestedGreaterGreater":"\u2aa2\u0338","NotNestedLessLess":"\u2aa1\u0338","NotPrecedes":"\u2280","NotPrecedesEqual":"\u2aaf\u0338","NotPrecedesSlantEqual":"\u22e0","NotReverseElement":"\u220c","NotRightTriangle":"\u22eb","NotRightTriangleBar":"\u29d0\u0338","NotRightTriangleEqual":"\u22ed","NotSquareSubset":"\u228f\u0338","NotSquareSubsetEqual":"\u22e2","NotSquareSuperset":"\u2290\u0338","NotSquareSupersetEqual":"\u22e3","NotSubset":"\u2282\u20d2","NotSubsetEqual":"\u2288","NotSucceeds":"\u2281","NotSucceedsEqual":"\u2ab0\u0338","NotSucceedsSlantEqual":"\u22e1","NotSucceedsTilde":"\u227f\u0338","NotSuperset":"\u2283\u20d2","NotSupersetEqual":"\u2289","NotTilde":"\u2241","NotTildeEqual":"\u2244","NotTildeFullEqual":"\u2247","NotTildeTilde":"\u2249","NotVerticalBar":"\u2224","Nscr":"\ud835\udca9","Ntilde":"\u00d1","Nu":"\u039d","OElig":"\u0152","Oacute":"\u00d3","Ocirc":"\u00d4","Ocy":"\u041e","Odblac":"\u0150","Ofr":"\ud835\udd12","Ograve":"\u00d2","Omacr":"\u014c","Omega":"\u03a9","Omicron":"\u039f","Oopf":"\ud835\udd46","OpenCurlyDoubleQuote":"\u201c","OpenCurlyQuote":"\u2018","Or":"\u2a54","Oscr":"\ud835\udcaa","Oslash":"\u00d8","Otilde":"\u00d5","Otimes":"\u2a37","Ouml":"\u00d6","OverBar":"\u203e","OverBrace":"\u23de","OverBracket":"\u23b4","OverParenthesis":"\u23dc","PartialD":"\u2202","Pcy":"\u041f","Pfr":"\ud835\udd13","Phi":"\u03a6","Pi":"\u03a0","PlusMinus":"\u00b1","Poincareplane":"\u210c","Popf":"\u2119","Pr":"\u2abb","Precedes":"\u227a","PrecedesEqual":"\u2aaf","PrecedesSlantEqual":"\u227c","PrecedesTilde":"\u227e","Prime":"\u2033","Product":"\u220f","Proportion":"\u2237","Proportional":"\u221d","Pscr":"\ud835\udcab","Psi":"\u03a8","QUOT":"\"","Qfr":"\ud835\udd14","Qopf":"\u211a","Qscr":"\ud835\udcac","RBarr":"\u2910","REG":"\u00ae","Racute":"\u0154","Rang":"\u27eb","Rarr":"\u21a0","Rarrtl":"\u2916","Rcaron":"\u0158","Rcedil":"\u0156","Rcy":"\u0420","Re":"\u211c","ReverseElement":"\u220b","ReverseEquilibrium":"\u21cb","ReverseUpEquilibrium":"\u296f","Rfr":"\u211c","Rho":"\u03a1","RightAngleBracket":"\u27e9","RightArrow":"\u2192","RightArrowBar":"\u21e5","RightArrowLeftArrow":"\u21c4","RightCeiling":"\u2309","RightDoubleBracket":"\u27e7","RightDownTeeVector":"\u295d","RightDownVector":"\u21c2","RightDownVectorBar":"\u2955","RightFloor":"\u230b","RightTee":"\u22a2","RightTeeArrow":"\u21a6","RightTeeVector":"\u295b","RightTriangle":"\u22b3","RightTriangleBar":"\u29d0","RightTriangleEqual":"\u22b5","RightUpDownVector":"\u294f","RightUpTeeVector":"\u295c","RightUpVector":"\u21be","RightUpVectorBar":"\u2954","RightVector":"\u21c0","RightVectorBar":"\u2953","Rightarrow":"\u21d2","Ropf":"\u211d","RoundImplies":"\u2970","Rrightarrow":"\u21db","Rscr":"\u211b","Rsh":"\u21b1","RuleDelayed":"\u29f4","SHCHcy":"\u0429","SHcy":"\u0428","SOFTcy":"\u042c","Sacute":"\u015a","Sc":"\u2abc","Scaron":"\u0160","Scedil":"\u015e","Scirc":"\u015c","Scy":"\u0421","Sfr":"\ud835\udd16","ShortDownArrow":"\u2193","ShortLeftArrow":"\u2190","ShortRightArrow":"\u2192","ShortUpArrow":"\u2191","Sigma":"\u03a3","SmallCircle":"\u2218","Sopf":"\ud835\udd4a","Sqrt":"\u221a","Square":"\u25a1","SquareIntersection":"\u2293","SquareSubset":"\u228f","SquareSubsetEqual":"\u2291","SquareSuperset":"\u2290","SquareSupersetEqual":"\u2292","SquareUnion":"\u2294","Sscr":"\ud835\udcae","Star":"\u22c6","Sub":"\u22d0","Subset":"\u22d0","SubsetEqual":"\u2286","Succeeds":"\u227b","SucceedsEqual":"\u2ab0","SucceedsSlantEqual":"\u227d","SucceedsTilde":"\u227f","SuchThat":"\u220b","Sum":"\u2211","Sup":"\u22d1","Superset":"\u2283","SupersetEqual":"\u2287","Supset":"\u22d1","THORN":"\u00de","TRADE":"\u2122","TSHcy":"\u040b","TScy":"\u0426","Tab":"\t","Tau":"\u03a4","Tcaron":"\u0164","Tcedil":"\u0162","Tcy":"\u0422","Tfr":"\ud835\udd17","Therefore":"\u2234","Theta":"\u0398","ThickSpace":"\u205f\u200a","ThinSpace":"\u2009","Tilde":"\u223c","TildeEqual":"\u2243","TildeFullEqual":"\u2245","TildeTilde":"\u2248","Topf":"\ud835\udd4b","TripleDot":"\u20db","Tscr":"\ud835\udcaf","Tstrok":"\u0166","Uacute":"\u00da","Uarr":"\u219f","Uarrocir":"\u2949","Ubrcy":"\u040e","Ubreve":"\u016c","Ucirc":"\u00db","Ucy":"\u0423","Udblac":"\u0170","Ufr":"\ud835\udd18","Ugrave":"\u00d9","Umacr":"\u016a","UnderBar":"_","UnderBrace":"\u23df","UnderBracket":"\u23b5","UnderParenthesis":"\u23dd","Union":"\u22c3","UnionPlus":"\u228e","Uogon":"\u0172","Uopf":"\ud835\udd4c","UpArrow":"\u2191","UpArrowBar":"\u2912","UpArrowDownArrow":"\u21c5","UpDownArrow":"\u2195","UpEquilibrium":"\u296e","UpTee":"\u22a5","UpTeeArrow":"\u21a5","Uparrow":"\u21d1","Updownarrow":"\u21d5","UpperLeftArrow":"\u2196","UpperRightArrow":"\u2197","Upsi":"\u03d2","Upsilon":"\u03a5","Uring":"\u016e","Uscr":"\ud835\udcb0","Utilde":"\u0168","Uuml":"\u00dc","VDash":"\u22ab","Vbar":"\u2aeb","Vcy":"\u0412","Vdash":"\u22a9","Vdashl":"\u2ae6","Vee":"\u22c1","Verbar":"\u2016","Vert":"\u2016","VerticalBar":"\u2223","VerticalLine":"|","VerticalSeparator":"\u2758","VerticalTilde":"\u2240","VeryThinSpace":"\u200a","Vfr":"\ud835\udd19","Vopf":"\ud835\udd4d","Vscr":"\ud835\udcb1","Vvdash":"\u22aa","Wcirc":"\u0174","Wedge":"\u22c0","Wfr":"\ud835\udd1a","Wopf":"\ud835\udd4e","Wscr":"\ud835\udcb2","Xfr":"\ud835\udd1b","Xi":"\u039e","Xopf":"\ud835\udd4f","Xscr":"\ud835\udcb3","YAcy":"\u042f","YIcy":"\u0407","YUcy":"\u042e","Yacute":"\u00dd","Ycirc":"\u0176","Ycy":"\u042b","Yfr":"\ud835\udd1c","Yopf":"\ud835\udd50","Yscr":"\ud835\udcb4","Yuml":"\u0178","ZHcy":"\u0416","Zacute":"\u0179","Zcaron":"\u017d","Zcy":"\u0417","Zdot":"\u017b","ZeroWidthSpace":"\u200b","Zeta":"\u0396","Zfr":"\u2128","Zopf":"\u2124","Zscr":"\ud835\udcb5","aacute":"\u00e1","abreve":"\u0103","ac":"\u223e","acE":"\u223e\u0333","acd":"\u223f","acirc":"\u00e2","acute":"\u00b4","acy":"\u0430","aelig":"\u00e6","af":"\u2061","afr":"\ud835\udd1e","agrave":"\u00e0","alefsym":"\u2135","aleph":"\u2135","alpha":"\u03b1","amacr":"\u0101","amalg":"\u2a3f","amp":"&","and":"\u2227","andand":"\u2a55","andd":"\u2a5c","andslope":"\u2a58","andv":"\u2a5a","ang":"\u2220","ange":"\u29a4","angle":"\u2220","angmsd":"\u2221","angmsdaa":"\u29a8","angmsdab":"\u29a9","angmsdac":"\u29aa","angmsdad":"\u29ab","angmsdae":"\u29ac","angmsdaf":"\u29ad","angmsdag":"\u29ae","angmsdah":"\u29af","angrt":"\u221f","angrtvb":"\u22be","angrtvbd":"\u299d","angsph":"\u2222","angst":"\u00c5","angzarr":"\u237c","aogon":"\u0105","aopf":"\ud835\udd52","ap":"\u2248","apE":"\u2a70","apacir":"\u2a6f","ape":"\u224a","apid":"\u224b","apos":"'","approx":"\u2248","approxeq":"\u224a","aring":"\u00e5","ascr":"\ud835\udcb6","ast":"*","asymp":"\u2248","asympeq":"\u224d","atilde":"\u00e3","auml":"\u00e4","awconint":"\u2233","awint":"\u2a11","bNot":"\u2aed","backcong":"\u224c","backepsilon":"\u03f6","backprime":"\u2035","backsim":"\u223d","backsimeq":"\u22cd","barvee":"\u22bd","barwed":"\u2305","barwedge":"\u2305","bbrk":"\u23b5","bbrktbrk":"\u23b6","bcong":"\u224c","bcy":"\u0431","bdquo":"\u201e","becaus":"\u2235","because":"\u2235","bemptyv":"\u29b0","bepsi":"\u03f6","bernou":"\u212c","beta":"\u03b2","beth":"\u2136","between":"\u226c","bfr":"\ud835\udd1f","bigcap":"\u22c2","bigcirc":"\u25ef","bigcup":"\u22c3","bigodot":"\u2a00","bigoplus":"\u2a01","bigotimes":"\u2a02","bigsqcup":"\u2a06","bigstar":"\u2605","bigtriangledown":"\u25bd","bigtriangleup":"\u25b3","biguplus":"\u2a04","bigvee":"\u22c1","bigwedge":"\u22c0","bkarow":"\u290d","blacklozenge":"\u29eb","blacksquare":"\u25aa","blacktriangle":"\u25b4","blacktriangledown":"\u25be","blacktriangleleft":"\u25c2","blacktriangleright":"\u25b8","blank":"\u2423","blk12":"\u2592","blk14":"\u2591","blk34":"\u2593","block":"\u2588","bne":"=\u20e5","bnequiv":"\u2261\u20e5","bnot":"\u2310","bopf":"\ud835\udd53","bot":"\u22a5","bottom":"\u22a5","bowtie":"\u22c8","boxDL":"\u2557","boxDR":"\u2554","boxDl":"\u2556","boxDr":"\u2553","boxH":"\u2550","boxHD":"\u2566","boxHU":"\u2569","boxHd":"\u2564","boxHu":"\u2567","boxUL":"\u255d","boxUR":"\u255a","boxUl":"\u255c","boxUr":"\u2559","boxV":"\u2551","boxVH":"\u256c","boxVL":"\u2563","boxVR":"\u2560","boxVh":"\u256b","boxVl":"\u2562","boxVr":"\u255f","boxbox":"\u29c9","boxdL":"\u2555","boxdR":"\u2552","boxdl":"\u2510","boxdr":"\u250c","boxh":"\u2500","boxhD":"\u2565","boxhU":"\u2568","boxhd":"\u252c","boxhu":"\u2534","boxminus":"\u229f","boxplus":"\u229e","boxtimes":"\u22a0","boxuL":"\u255b","boxuR":"\u2558","boxul":"\u2518","boxur":"\u2514","boxv":"\u2502","boxvH":"\u256a","boxvL":"\u2561","boxvR":"\u255e","boxvh":"\u253c","boxvl":"\u2524","boxvr":"\u251c","bprime":"\u2035","breve":"\u02d8","brvbar":"\u00a6","bscr":"\ud835\udcb7","bsemi":"\u204f","bsim":"\u223d","bsime":"\u22cd","bsol":"\\","bsolb":"\u29c5","bsolhsub":"\u27c8","bull":"\u2022","bullet":"\u2022","bump":"\u224e","bumpE":"\u2aae","bumpe":"\u224f","bumpeq":"\u224f","cacute":"\u0107","cap":"\u2229","capand":"\u2a44","capbrcup":"\u2a49","capcap":"\u2a4b","capcup":"\u2a47","capdot":"\u2a40","caps":"\u2229\ufe00","caret":"\u2041","caron":"\u02c7","ccaps":"\u2a4d","ccaron":"\u010d","ccedil":"\u00e7","ccirc":"\u0109","ccups":"\u2a4c","ccupssm":"\u2a50","cdot":"\u010b","cedil":"\u00b8","cemptyv":"\u29b2","cent":"\u00a2","centerdot":"\u00b7","cfr":"\ud835\udd20","chcy":"\u0447","check":"\u2713","checkmark":"\u2713","chi":"\u03c7","cir":"\u25cb","cirE":"\u29c3","circ":"\u02c6","circeq":"\u2257","circlearrowleft":"\u21ba","circlearrowright":"\u21bb","circledR":"\u00ae","circledS":"\u24c8","circledast":"\u229b","circledcirc":"\u229a","circleddash":"\u229d","cire":"\u2257","cirfnint":"\u2a10","cirmid":"\u2aef","cirscir":"\u29c2","clubs":"\u2663","clubsuit":"\u2663","colon":":","colone":"\u2254","coloneq":"\u2254","comma":",","commat":"@","comp":"\u2201","compfn":"\u2218","complement":"\u2201","complexes":"\u2102","cong":"\u2245","congdot":"\u2a6d","conint":"\u222e","copf":"\ud835\udd54","coprod":"\u2210","copy":"\u00a9","copysr":"\u2117","crarr":"\u21b5","cross":"\u2717","cscr":"\ud835\udcb8","csub":"\u2acf","csube":"\u2ad1","csup":"\u2ad0","csupe":"\u2ad2","ctdot":"\u22ef","cudarrl":"\u2938","cudarrr":"\u2935","cuepr":"\u22de","cuesc":"\u22df","cularr":"\u21b6","cularrp":"\u293d","cup":"\u222a","cupbrcap":"\u2a48","cupcap":"\u2a46","cupcup":"\u2a4a","cupdot":"\u228d","cupor":"\u2a45","cups":"\u222a\ufe00","curarr":"\u21b7","curarrm":"\u293c","curlyeqprec":"\u22de","curlyeqsucc":"\u22df","curlyvee":"\u22ce","curlywedge":"\u22cf","curren":"\u00a4","curvearrowleft":"\u21b6","curvearrowright":"\u21b7","cuvee":"\u22ce","cuwed":"\u22cf","cwconint":"\u2232","cwint":"\u2231","cylcty":"\u232d","dArr":"\u21d3","dHar":"\u2965","dagger":"\u2020","daleth":"\u2138","darr":"\u2193","dash":"\u2010","dashv":"\u22a3","dbkarow":"\u290f","dblac":"\u02dd","dcaron":"\u010f","dcy":"\u0434","dd":"\u2146","ddagger":"\u2021","ddarr":"\u21ca","ddotseq":"\u2a77","deg":"\u00b0","delta":"\u03b4","demptyv":"\u29b1","dfisht":"\u297f","dfr":"\ud835\udd21","dharl":"\u21c3","dharr":"\u21c2","diam":"\u22c4","diamond":"\u22c4","diamondsuit":"\u2666","diams":"\u2666","die":"\u00a8","digamma":"\u03dd","disin":"\u22f2","div":"\u00f7","divide":"\u00f7","divideontimes":"\u22c7","divonx":"\u22c7","djcy":"\u0452","dlcorn":"\u231e","dlcrop":"\u230d","dollar":"$","dopf":"\ud835\udd55","dot":"\u02d9","doteq":"\u2250","doteqdot":"\u2251","dotminus":"\u2238","dotplus":"\u2214","dotsquare":"\u22a1","doublebarwedge":"\u2306","downarrow":"\u2193","downdownarrows":"\u21ca","downharpoonleft":"\u21c3","downharpoonright":"\u21c2","drbkarow":"\u2910","drcorn":"\u231f","drcrop":"\u230c","dscr":"\ud835\udcb9","dscy":"\u0455","dsol":"\u29f6","dstrok":"\u0111","dtdot":"\u22f1","dtri":"\u25bf","dtrif":"\u25be","duarr":"\u21f5","duhar":"\u296f","dwangle":"\u29a6","dzcy":"\u045f","dzigrarr":"\u27ff","eDDot":"\u2a77","eDot":"\u2251","eacute":"\u00e9","easter":"\u2a6e","ecaron":"\u011b","ecir":"\u2256","ecirc":"\u00ea","ecolon":"\u2255","ecy":"\u044d","edot":"\u0117","ee":"\u2147","efDot":"\u2252","efr":"\ud835\udd22","eg":"\u2a9a","egrave":"\u00e8","egs":"\u2a96","egsdot":"\u2a98","el":"\u2a99","elinters":"\u23e7","ell":"\u2113","els":"\u2a95","elsdot":"\u2a97","emacr":"\u0113","empty":"\u2205","emptyset":"\u2205","emptyv":"\u2205","emsp":"\u2003","emsp13":"\u2004","emsp14":"\u2005","eng":"\u014b","ensp":"\u2002","eogon":"\u0119","eopf":"\ud835\udd56","epar":"\u22d5","eparsl":"\u29e3","eplus":"\u2a71","epsi":"\u03b5","epsilon":"\u03b5","epsiv":"\u03f5","eqcirc":"\u2256","eqcolon":"\u2255","eqsim":"\u2242","eqslantgtr":"\u2a96","eqslantless":"\u2a95","equals":"=","equest":"\u225f","equiv":"\u2261","equivDD":"\u2a78","eqvparsl":"\u29e5","erDot":"\u2253","erarr":"\u2971","escr":"\u212f","esdot":"\u2250","esim":"\u2242","eta":"\u03b7","eth":"\u00f0","euml":"\u00eb","euro":"\u20ac","excl":"!","exist":"\u2203","expectation":"\u2130","exponentiale":"\u2147","fallingdotseq":"\u2252","fcy":"\u0444","female":"\u2640","ffilig":"\ufb03","fflig":"\ufb00","ffllig":"\ufb04","ffr":"\ud835\udd23","filig":"\ufb01","fjlig":"fj","flat":"\u266d","fllig":"\ufb02","fltns":"\u25b1","fnof":"\u0192","fopf":"\ud835\udd57","forall":"\u2200","fork":"\u22d4","forkv":"\u2ad9","fpartint":"\u2a0d","frac12":"\u00bd","frac13":"\u2153","frac14":"\u00bc","frac15":"\u2155","frac16":"\u2159","frac18":"\u215b","frac23":"\u2154","frac25":"\u2156","frac34":"\u00be","frac35":"\u2157","frac38":"\u215c","frac45":"\u2158","frac56":"\u215a","frac58":"\u215d","frac78":"\u215e","frasl":"\u2044","frown":"\u2322","fscr":"\ud835\udcbb","gE":"\u2267","gEl":"\u2a8c","gacute":"\u01f5","gamma":"\u03b3","gammad":"\u03dd","gap":"\u2a86","gbreve":"\u011f","gcirc":"\u011d","gcy":"\u0433","gdot":"\u0121","ge":"\u2265","gel":"\u22db","geq":"\u2265","geqq":"\u2267","geqslant":"\u2a7e","ges":"\u2a7e","gescc":"\u2aa9","gesdot":"\u2a80","gesdoto":"\u2a82","gesdotol":"\u2a84","gesl":"\u22db\ufe00","gesles":"\u2a94","gfr":"\ud835\udd24","gg":"\u226b","ggg":"\u22d9","gimel":"\u2137","gjcy":"\u0453","gl":"\u2277","glE":"\u2a92","gla":"\u2aa5","glj":"\u2aa4","gnE":"\u2269","gnap":"\u2a8a","gnapprox":"\u2a8a","gne":"\u2a88","gneq":"\u2a88","gneqq":"\u2269","gnsim":"\u22e7","gopf":"\ud835\udd58","grave":"`","gscr":"\u210a","gsim":"\u2273","gsime":"\u2a8e","gsiml":"\u2a90","gt":">","gtcc":"\u2aa7","gtcir":"\u2a7a","gtdot":"\u22d7","gtlPar":"\u2995","gtquest":"\u2a7c","gtrapprox":"\u2a86","gtrarr":"\u2978","gtrdot":"\u22d7","gtreqless":"\u22db","gtreqqless":"\u2a8c","gtrless":"\u2277","gtrsim":"\u2273","gvertneqq":"\u2269\ufe00","gvnE":"\u2269\ufe00","hArr":"\u21d4","hairsp":"\u200a","half":"\u00bd","hamilt":"\u210b","hardcy":"\u044a","harr":"\u2194","harrcir":"\u2948","harrw":"\u21ad","hbar":"\u210f","hcirc":"\u0125","hearts":"\u2665","heartsuit":"\u2665","hellip":"\u2026","hercon":"\u22b9","hfr":"\ud835\udd25","hksearow":"\u2925","hkswarow":"\u2926","hoarr":"\u21ff","homtht":"\u223b","hookleftarrow":"\u21a9","hookrightarrow":"\u21aa","hopf":"\ud835\udd59","horbar":"\u2015","hscr":"\ud835\udcbd","hslash":"\u210f","hstrok":"\u0127","hybull":"\u2043","hyphen":"\u2010","iacute":"\u00ed","ic":"\u2063","icirc":"\u00ee","icy":"\u0438","iecy":"\u0435","iexcl":"\u00a1","iff":"\u21d4","ifr":"\ud835\udd26","igrave":"\u00ec","ii":"\u2148","iiiint":"\u2a0c","iiint":"\u222d","iinfin":"\u29dc","iiota":"\u2129","ijlig":"\u0133","imacr":"\u012b","image":"\u2111","imagline":"\u2110","imagpart":"\u2111","imath":"\u0131","imof":"\u22b7","imped":"\u01b5","in":"\u2208","incare":"\u2105","infin":"\u221e","infintie":"\u29dd","inodot":"\u0131","int":"\u222b","intcal":"\u22ba","integers":"\u2124","intercal":"\u22ba","intlarhk":"\u2a17","intprod":"\u2a3c","iocy":"\u0451","iogon":"\u012f","iopf":"\ud835\udd5a","iota":"\u03b9","iprod":"\u2a3c","iquest":"\u00bf","iscr":"\ud835\udcbe","isin":"\u2208","isinE":"\u22f9","isindot":"\u22f5","isins":"\u22f4","isinsv":"\u22f3","isinv":"\u2208","it":"\u2062","itilde":"\u0129","iukcy":"\u0456","iuml":"\u00ef","jcirc":"\u0135","jcy":"\u0439","jfr":"\ud835\udd27","jmath":"\u0237","jopf":"\ud835\udd5b","jscr":"\ud835\udcbf","jsercy":"\u0458","jukcy":"\u0454","kappa":"\u03ba","kappav":"\u03f0","kcedil":"\u0137","kcy":"\u043a","kfr":"\ud835\udd28","kgreen":"\u0138","khcy":"\u0445","kjcy":"\u045c","kopf":"\ud835\udd5c","kscr":"\ud835\udcc0","lAarr":"\u21da","lArr":"\u21d0","lAtail":"\u291b","lBarr":"\u290e","lE":"\u2266","lEg":"\u2a8b","lHar":"\u2962","lacute":"\u013a","laemptyv":"\u29b4","lagran":"\u2112","lambda":"\u03bb","lang":"\u27e8","langd":"\u2991","langle":"\u27e8","lap":"\u2a85","laquo":"\u00ab","larr":"\u2190","larrb":"\u21e4","larrbfs":"\u291f","larrfs":"\u291d","larrhk":"\u21a9","larrlp":"\u21ab","larrpl":"\u2939","larrsim":"\u2973","larrtl":"\u21a2","lat":"\u2aab","latail":"\u2919","late":"\u2aad","lates":"\u2aad\ufe00","lbarr":"\u290c","lbbrk":"\u2772","lbrace":"{","lbrack":"[","lbrke":"\u298b","lbrksld":"\u298f","lbrkslu":"\u298d","lcaron":"\u013e","lcedil":"\u013c","lceil":"\u2308","lcub":"{","lcy":"\u043b","ldca":"\u2936","ldquo":"\u201c","ldquor":"\u201e","ldrdhar":"\u2967","ldrushar":"\u294b","ldsh":"\u21b2","le":"\u2264","leftarrow":"\u2190","leftarrowtail":"\u21a2","leftharpoondown":"\u21bd","leftharpoonup":"\u21bc","leftleftarrows":"\u21c7","leftrightarrow":"\u2194","leftrightarrows":"\u21c6","leftrightharpoons":"\u21cb","leftrightsquigarrow":"\u21ad","leftthreetimes":"\u22cb","leg":"\u22da","leq":"\u2264","leqq":"\u2266","leqslant":"\u2a7d","les":"\u2a7d","lescc":"\u2aa8","lesdot":"\u2a7f","lesdoto":"\u2a81","lesdotor":"\u2a83","lesg":"\u22da\ufe00","lesges":"\u2a93","lessapprox":"\u2a85","lessdot":"\u22d6","lesseqgtr":"\u22da","lesseqqgtr":"\u2a8b","lessgtr":"\u2276","lesssim":"\u2272","lfisht":"\u297c","lfloor":"\u230a","lfr":"\ud835\udd29","lg":"\u2276","lgE":"\u2a91","lhard":"\u21bd","lharu":"\u21bc","lharul":"\u296a","lhblk":"\u2584","ljcy":"\u0459","ll":"\u226a","llarr":"\u21c7","llcorner":"\u231e","llhard":"\u296b","lltri":"\u25fa","lmidot":"\u0140","lmoust":"\u23b0","lmoustache":"\u23b0","lnE":"\u2268","lnap":"\u2a89","lnapprox":"\u2a89","lne":"\u2a87","lneq":"\u2a87","lneqq":"\u2268","lnsim":"\u22e6","loang":"\u27ec","loarr":"\u21fd","lobrk":"\u27e6","longleftarrow":"\u27f5","longleftrightarrow":"\u27f7","longmapsto":"\u27fc","longrightarrow":"\u27f6","looparrowleft":"\u21ab","looparrowright":"\u21ac","lopar":"\u2985","lopf":"\ud835\udd5d","loplus":"\u2a2d","lotimes":"\u2a34","lowast":"\u2217","lowbar":"_","loz":"\u25ca","lozenge":"\u25ca","lozf":"\u29eb","lpar":"(","lparlt":"\u2993","lrarr":"\u21c6","lrcorner":"\u231f","lrhar":"\u21cb","lrhard":"\u296d","lrm":"\u200e","lrtri":"\u22bf","lsaquo":"\u2039","lscr":"\ud835\udcc1","lsh":"\u21b0","lsim":"\u2272","lsime":"\u2a8d","lsimg":"\u2a8f","lsqb":"[","lsquo":"\u2018","lsquor":"\u201a","lstrok":"\u0142","lt":"<","ltcc":"\u2aa6","ltcir":"\u2a79","ltdot":"\u22d6","lthree":"\u22cb","ltimes":"\u22c9","ltlarr":"\u2976","ltquest":"\u2a7b","ltrPar":"\u2996","ltri":"\u25c3","ltrie":"\u22b4","ltrif":"\u25c2","lurdshar":"\u294a","luruhar":"\u2966","lvertneqq":"\u2268\ufe00","lvnE":"\u2268\ufe00","mDDot":"\u223a","macr":"\u00af","male":"\u2642","malt":"\u2720","maltese":"\u2720","map":"\u21a6","mapsto":"\u21a6","mapstodown":"\u21a7","mapstoleft":"\u21a4","mapstoup":"\u21a5","marker":"\u25ae","mcomma":"\u2a29","mcy":"\u043c","mdash":"\u2014","measuredangle":"\u2221","mfr":"\ud835\udd2a","mho":"\u2127","micro":"\u00b5","mid":"\u2223","midast":"*","midcir":"\u2af0","middot":"\u00b7","minus":"\u2212","minusb":"\u229f","minusd":"\u2238","minusdu":"\u2a2a","mlcp":"\u2adb","mldr":"\u2026","mnplus":"\u2213","models":"\u22a7","mopf":"\ud835\udd5e","mp":"\u2213","mscr":"\ud835\udcc2","mstpos":"\u223e","mu":"\u03bc","multimap":"\u22b8","mumap":"\u22b8","nGg":"\u22d9\u0338","nGt":"\u226b\u20d2","nGtv":"\u226b\u0338","nLeftarrow":"\u21cd","nLeftrightarrow":"\u21ce","nLl":"\u22d8\u0338","nLt":"\u226a\u20d2","nLtv":"\u226a\u0338","nRightarrow":"\u21cf","nVDash":"\u22af","nVdash":"\u22ae","nabla":"\u2207","nacute":"\u0144","nang":"\u2220\u20d2","nap":"\u2249","napE":"\u2a70\u0338","napid":"\u224b\u0338","napos":"\u0149","napprox":"\u2249","natur":"\u266e","natural":"\u266e","naturals":"\u2115","nbsp":"\u00a0","nbump":"\u224e\u0338","nbumpe":"\u224f\u0338","ncap":"\u2a43","ncaron":"\u0148","ncedil":"\u0146","ncong":"\u2247","ncongdot":"\u2a6d\u0338","ncup":"\u2a42","ncy":"\u043d","ndash":"\u2013","ne":"\u2260","neArr":"\u21d7","nearhk":"\u2924","nearr":"\u2197","nearrow":"\u2197","nedot":"\u2250\u0338","nequiv":"\u2262","nesear":"\u2928","nesim":"\u2242\u0338","nexist":"\u2204","nexists":"\u2204","nfr":"\ud835\udd2b","ngE":"\u2267\u0338","nge":"\u2271","ngeq":"\u2271","ngeqq":"\u2267\u0338","ngeqslant":"\u2a7e\u0338","nges":"\u2a7e\u0338","ngsim":"\u2275","ngt":"\u226f","ngtr":"\u226f","nhArr":"\u21ce","nharr":"\u21ae","nhpar":"\u2af2","ni":"\u220b","nis":"\u22fc","nisd":"\u22fa","niv":"\u220b","njcy":"\u045a","nlArr":"\u21cd","nlE":"\u2266\u0338","nlarr":"\u219a","nldr":"\u2025","nle":"\u2270","nleftarrow":"\u219a","nleftrightarrow":"\u21ae","nleq":"\u2270","nleqq":"\u2266\u0338","nleqslant":"\u2a7d\u0338","nles":"\u2a7d\u0338","nless":"\u226e","nlsim":"\u2274","nlt":"\u226e","nltri":"\u22ea","nltrie":"\u22ec","nmid":"\u2224","nopf":"\ud835\udd5f","not":"\u00ac","notin":"\u2209","notinE":"\u22f9\u0338","notindot":"\u22f5\u0338","notinva":"\u2209","notinvb":"\u22f7","notinvc":"\u22f6","notni":"\u220c","notniva":"\u220c","notnivb":"\u22fe","notnivc":"\u22fd","npar":"\u2226","nparallel":"\u2226","nparsl":"\u2afd\u20e5","npart":"\u2202\u0338","npolint":"\u2a14","npr":"\u2280","nprcue":"\u22e0","npre":"\u2aaf\u0338","nprec":"\u2280","npreceq":"\u2aaf\u0338","nrArr":"\u21cf","nrarr":"\u219b","nrarrc":"\u2933\u0338","nrarrw":"\u219d\u0338","nrightarrow":"\u219b","nrtri":"\u22eb","nrtrie":"\u22ed","nsc":"\u2281","nsccue":"\u22e1","nsce":"\u2ab0\u0338","nscr":"\ud835\udcc3","nshortmid":"\u2224","nshortparallel":"\u2226","nsim":"\u2241","nsime":"\u2244","nsimeq":"\u2244","nsmid":"\u2224","nspar":"\u2226","nsqsube":"\u22e2","nsqsupe":"\u22e3","nsub":"\u2284","nsubE":"\u2ac5\u0338","nsube":"\u2288","nsubset":"\u2282\u20d2","nsubseteq":"\u2288","nsubseteqq":"\u2ac5\u0338","nsucc":"\u2281","nsucceq":"\u2ab0\u0338","nsup":"\u2285","nsupE":"\u2ac6\u0338","nsupe":"\u2289","nsupset":"\u2283\u20d2","nsupseteq":"\u2289","nsupseteqq":"\u2ac6\u0338","ntgl":"\u2279","ntilde":"\u00f1","ntlg":"\u2278","ntriangleleft":"\u22ea","ntrianglelefteq":"\u22ec","ntriangleright":"\u22eb","ntrianglerighteq":"\u22ed","nu":"\u03bd","num":"#","numero":"\u2116","numsp":"\u2007","nvDash":"\u22ad","nvHarr":"\u2904","nvap":"\u224d\u20d2","nvdash":"\u22ac","nvge":"\u2265\u20d2","nvgt":">\u20d2","nvinfin":"\u29de","nvlArr":"\u2902","nvle":"\u2264\u20d2","nvlt":"<\u20d2","nvltrie":"\u22b4\u20d2","nvrArr":"\u2903","nvrtrie":"\u22b5\u20d2","nvsim":"\u223c\u20d2","nwArr":"\u21d6","nwarhk":"\u2923","nwarr":"\u2196","nwarrow":"\u2196","nwnear":"\u2927","oS":"\u24c8","oacute":"\u00f3","oast":"\u229b","ocir":"\u229a","ocirc":"\u00f4","ocy":"\u043e","odash":"\u229d","odblac":"\u0151","odiv":"\u2a38","odot":"\u2299","odsold":"\u29bc","oelig":"\u0153","ofcir":"\u29bf","ofr":"\ud835\udd2c","ogon":"\u02db","ograve":"\u00f2","ogt":"\u29c1","ohbar":"\u29b5","ohm":"\u03a9","oint":"\u222e","olarr":"\u21ba","olcir":"\u29be","olcross":"\u29bb","oline":"\u203e","olt":"\u29c0","omacr":"\u014d","omega":"\u03c9","omicron":"\u03bf","omid":"\u29b6","ominus":"\u2296","oopf":"\ud835\udd60","opar":"\u29b7","operp":"\u29b9","oplus":"\u2295","or":"\u2228","orarr":"\u21bb","ord":"\u2a5d","order":"\u2134","orderof":"\u2134","ordf":"\u00aa","ordm":"\u00ba","origof":"\u22b6","oror":"\u2a56","orslope":"\u2a57","orv":"\u2a5b","oscr":"\u2134","oslash":"\u00f8","osol":"\u2298","otilde":"\u00f5","otimes":"\u2297","otimesas":"\u2a36","ouml":"\u00f6","ovbar":"\u233d","par":"\u2225","para":"\u00b6","parallel":"\u2225","parsim":"\u2af3","parsl":"\u2afd","part":"\u2202","pcy":"\u043f","percnt":"%","period":".","permil":"\u2030","perp":"\u22a5","pertenk":"\u2031","pfr":"\ud835\udd2d","phi":"\u03c6","phiv":"\u03d5","phmmat":"\u2133","phone":"\u260e","pi":"\u03c0","pitchfork":"\u22d4","piv":"\u03d6","planck":"\u210f","planckh":"\u210e","plankv":"\u210f","plus":"+","plusacir":"\u2a23","plusb":"\u229e","pluscir":"\u2a22","plusdo":"\u2214","plusdu":"\u2a25","pluse":"\u2a72","plusmn":"\u00b1","plussim":"\u2a26","plustwo":"\u2a27","pm":"\u00b1","pointint":"\u2a15","popf":"\ud835\udd61","pound":"\u00a3","pr":"\u227a","prE":"\u2ab3","prap":"\u2ab7","prcue":"\u227c","pre":"\u2aaf","prec":"\u227a","precapprox":"\u2ab7","preccurlyeq":"\u227c","preceq":"\u2aaf","precnapprox":"\u2ab9","precneqq":"\u2ab5","precnsim":"\u22e8","precsim":"\u227e","prime":"\u2032","primes":"\u2119","prnE":"\u2ab5","prnap":"\u2ab9","prnsim":"\u22e8","prod":"\u220f","profalar":"\u232e","profline":"\u2312","profsurf":"\u2313","prop":"\u221d","propto":"\u221d","prsim":"\u227e","prurel":"\u22b0","pscr":"\ud835\udcc5","psi":"\u03c8","puncsp":"\u2008","qfr":"\ud835\udd2e","qint":"\u2a0c","qopf":"\ud835\udd62","qprime":"\u2057","qscr":"\ud835\udcc6","quaternions":"\u210d","quatint":"\u2a16","quest":"?","questeq":"\u225f","quot":"\"","rAarr":"\u21db","rArr":"\u21d2","rAtail":"\u291c","rBarr":"\u290f","rHar":"\u2964","race":"\u223d\u0331","racute":"\u0155","radic":"\u221a","raemptyv":"\u29b3","rang":"\u27e9","rangd":"\u2992","range":"\u29a5","rangle":"\u27e9","raquo":"\u00bb","rarr":"\u2192","rarrap":"\u2975","rarrb":"\u21e5","rarrbfs":"\u2920","rarrc":"\u2933","rarrfs":"\u291e","rarrhk":"\u21aa","rarrlp":"\u21ac","rarrpl":"\u2945","rarrsim":"\u2974","rarrtl":"\u21a3","rarrw":"\u219d","ratail":"\u291a","ratio":"\u2236","rationals":"\u211a","rbarr":"\u290d","rbbrk":"\u2773","rbrace":"}","rbrack":"]","rbrke":"\u298c","rbrksld":"\u298e","rbrkslu":"\u2990","rcaron":"\u0159","rcedil":"\u0157","rceil":"\u2309","rcub":"}","rcy":"\u0440","rdca":"\u2937","rdldhar":"\u2969","rdquo":"\u201d","rdquor":"\u201d","rdsh":"\u21b3","real":"\u211c","realine":"\u211b","realpart":"\u211c","reals":"\u211d","rect":"\u25ad","reg":"\u00ae","rfisht":"\u297d","rfloor":"\u230b","rfr":"\ud835\udd2f","rhard":"\u21c1","rharu":"\u21c0","rharul":"\u296c","rho":"\u03c1","rhov":"\u03f1","rightarrow":"\u2192","rightarrowtail":"\u21a3","rightharpoondown":"\u21c1","rightharpoonup":"\u21c0","rightleftarrows":"\u21c4","rightleftharpoons":"\u21cc","rightrightarrows":"\u21c9","rightsquigarrow":"\u219d","rightthreetimes":"\u22cc","ring":"\u02da","risingdotseq":"\u2253","rlarr":"\u21c4","rlhar":"\u21cc","rlm":"\u200f","rmoust":"\u23b1","rmoustache":"\u23b1","rnmid":"\u2aee","roang":"\u27ed","roarr":"\u21fe","robrk":"\u27e7","ropar":"\u2986","ropf":"\ud835\udd63","roplus":"\u2a2e","rotimes":"\u2a35","rpar":")","rpargt":"\u2994","rppolint":"\u2a12","rrarr":"\u21c9","rsaquo":"\u203a","rscr":"\ud835\udcc7","rsh":"\u21b1","rsqb":"]","rsquo":"\u2019","rsquor":"\u2019","rthree":"\u22cc","rtimes":"\u22ca","rtri":"\u25b9","rtrie":"\u22b5","rtrif":"\u25b8","rtriltri":"\u29ce","ruluhar":"\u2968","rx":"\u211e","sacute":"\u015b","sbquo":"\u201a","sc":"\u227b","scE":"\u2ab4","scap":"\u2ab8","scaron":"\u0161","sccue":"\u227d","sce":"\u2ab0","scedil":"\u015f","scirc":"\u015d","scnE":"\u2ab6","scnap":"\u2aba","scnsim":"\u22e9","scpolint":"\u2a13","scsim":"\u227f","scy":"\u0441","sdot":"\u22c5","sdotb":"\u22a1","sdote":"\u2a66","seArr":"\u21d8","searhk":"\u2925","searr":"\u2198","searrow":"\u2198","sect":"\u00a7","semi":";","seswar":"\u2929","setminus":"\u2216","setmn":"\u2216","sext":"\u2736","sfr":"\ud835\udd30","sfrown":"\u2322","sharp":"\u266f","shchcy":"\u0449","shcy":"\u0448","shortmid":"\u2223","shortparallel":"\u2225","shy":"\u00ad","sigma":"\u03c3","sigmaf":"\u03c2","sigmav":"\u03c2","sim":"\u223c","simdot":"\u2a6a","sime":"\u2243","simeq":"\u2243","simg":"\u2a9e","simgE":"\u2aa0","siml":"\u2a9d","simlE":"\u2a9f","simne":"\u2246","simplus":"\u2a24","simrarr":"\u2972","slarr":"\u2190","smallsetminus":"\u2216","smashp":"\u2a33","smeparsl":"\u29e4","smid":"\u2223","smile":"\u2323","smt":"\u2aaa","smte":"\u2aac","smtes":"\u2aac\ufe00","softcy":"\u044c","sol":"/","solb":"\u29c4","solbar":"\u233f","sopf":"\ud835\udd64","spades":"\u2660","spadesuit":"\u2660","spar":"\u2225","sqcap":"\u2293","sqcaps":"\u2293\ufe00","sqcup":"\u2294","sqcups":"\u2294\ufe00","sqsub":"\u228f","sqsube":"\u2291","sqsubset":"\u228f","sqsubseteq":"\u2291","sqsup":"\u2290","sqsupe":"\u2292","sqsupset":"\u2290","sqsupseteq":"\u2292","squ":"\u25a1","square":"\u25a1","squarf":"\u25aa","squf":"\u25aa","srarr":"\u2192","sscr":"\ud835\udcc8","ssetmn":"\u2216","ssmile":"\u2323","sstarf":"\u22c6","star":"\u2606","starf":"\u2605","straightepsilon":"\u03f5","straightphi":"\u03d5","strns":"\u00af","sub":"\u2282","subE":"\u2ac5","subdot":"\u2abd","sube":"\u2286","subedot":"\u2ac3","submult":"\u2ac1","subnE":"\u2acb","subne":"\u228a","subplus":"\u2abf","subrarr":"\u2979","subset":"\u2282","subseteq":"\u2286","subseteqq":"\u2ac5","subsetneq":"\u228a","subsetneqq":"\u2acb","subsim":"\u2ac7","subsub":"\u2ad5","subsup":"\u2ad3","succ":"\u227b","succapprox":"\u2ab8","succcurlyeq":"\u227d","succeq":"\u2ab0","succnapprox":"\u2aba","succneqq":"\u2ab6","succnsim":"\u22e9","succsim":"\u227f","sum":"\u2211","sung":"\u266a","sup":"\u2283","sup1":"\u00b9","sup2":"\u00b2","sup3":"\u00b3","supE":"\u2ac6","supdot":"\u2abe","supdsub":"\u2ad8","supe":"\u2287","supedot":"\u2ac4","suphsol":"\u27c9","suphsub":"\u2ad7","suplarr":"\u297b","supmult":"\u2ac2","supnE":"\u2acc","supne":"\u228b","supplus":"\u2ac0","supset":"\u2283","supseteq":"\u2287","supseteqq":"\u2ac6","supsetneq":"\u228b","supsetneqq":"\u2acc","supsim":"\u2ac8","supsub":"\u2ad4","supsup":"\u2ad6","swArr":"\u21d9","swarhk":"\u2926","swarr":"\u2199","swarrow":"\u2199","swnwar":"\u292a","szlig":"\u00df","target":"\u2316","tau":"\u03c4","tbrk":"\u23b4","tcaron":"\u0165","tcedil":"\u0163","tcy":"\u0442","tdot":"\u20db","telrec":"\u2315","tfr":"\ud835\udd31","there4":"\u2234","therefore":"\u2234","theta":"\u03b8","thetasym":"\u03d1","thetav":"\u03d1","thickapprox":"\u2248","thicksim":"\u223c","thinsp":"\u2009","thkap":"\u2248","thksim":"\u223c","thorn":"\u00fe","tilde":"\u02dc","times":"\u00d7","timesb":"\u22a0","timesbar":"\u2a31","timesd":"\u2a30","tint":"\u222d","toea":"\u2928","top":"\u22a4","topbot":"\u2336","topcir":"\u2af1","topf":"\ud835\udd65","topfork":"\u2ada","tosa":"\u2929","tprime":"\u2034","trade":"\u2122","triangle":"\u25b5","triangledown":"\u25bf","triangleleft":"\u25c3","trianglelefteq":"\u22b4","triangleq":"\u225c","triangleright":"\u25b9","trianglerighteq":"\u22b5","tridot":"\u25ec","trie":"\u225c","triminus":"\u2a3a","triplus":"\u2a39","trisb":"\u29cd","tritime":"\u2a3b","trpezium":"\u23e2","tscr":"\ud835\udcc9","tscy":"\u0446","tshcy":"\u045b","tstrok":"\u0167","twixt":"\u226c","twoheadleftarrow":"\u219e","twoheadrightarrow":"\u21a0","uArr":"\u21d1","uHar":"\u2963","uacute":"\u00fa","uarr":"\u2191","ubrcy":"\u045e","ubreve":"\u016d","ucirc":"\u00fb","ucy":"\u0443","udarr":"\u21c5","udblac":"\u0171","udhar":"\u296e","ufisht":"\u297e","ufr":"\ud835\udd32","ugrave":"\u00f9","uharl":"\u21bf","uharr":"\u21be","uhblk":"\u2580","ulcorn":"\u231c","ulcorner":"\u231c","ulcrop":"\u230f","ultri":"\u25f8","umacr":"\u016b","uml":"\u00a8","uogon":"\u0173","uopf":"\ud835\udd66","uparrow":"\u2191","updownarrow":"\u2195","upharpoonleft":"\u21bf","upharpoonright":"\u21be","uplus":"\u228e","upsi":"\u03c5","upsih":"\u03d2","upsilon":"\u03c5","upuparrows":"\u21c8","urcorn":"\u231d","urcorner":"\u231d","urcrop":"\u230e","uring":"\u016f","urtri":"\u25f9","uscr":"\ud835\udcca","utdot":"\u22f0","utilde":"\u0169","utri":"\u25b5","utrif":"\u25b4","uuarr":"\u21c8","uuml":"\u00fc","uwangle":"\u29a7","vArr":"\u21d5","vBar":"\u2ae8","vBarv":"\u2ae9","vDash":"\u22a8","vangrt":"\u299c","varepsilon":"\u03f5","varkappa":"\u03f0","varnothing":"\u2205","varphi":"\u03d5","varpi":"\u03d6","varpropto":"\u221d","varr":"\u2195","varrho":"\u03f1","varsigma":"\u03c2","varsubsetneq":"\u228a\ufe00","varsubsetneqq":"\u2acb\ufe00","varsupsetneq":"\u228b\ufe00","varsupsetneqq":"\u2acc\ufe00","vartheta":"\u03d1","vartriangleleft":"\u22b2","vartriangleright":"\u22b3","vcy":"\u0432","vdash":"\u22a2","vee":"\u2228","veebar":"\u22bb","veeeq":"\u225a","vellip":"\u22ee","verbar":"|","vert":"|","vfr":"\ud835\udd33","vltri":"\u22b2","vnsub":"\u2282\u20d2","vnsup":"\u2283\u20d2","vopf":"\ud835\udd67","vprop":"\u221d","vrtri":"\u22b3","vscr":"\ud835\udccb","vsubnE":"\u2acb\ufe00","vsubne":"\u228a\ufe00","vsupnE":"\u2acc\ufe00","vsupne":"\u228b\ufe00","vzigzag":"\u299a","wcirc":"\u0175","wedbar":"\u2a5f","wedge":"\u2227","wedgeq":"\u2259","weierp":"\u2118","wfr":"\ud835\udd34","wopf":"\ud835\udd68","wp":"\u2118","wr":"\u2240","wreath":"\u2240","wscr":"\ud835\udccc","xcap":"\u22c2","xcirc":"\u25ef","xcup":"\u22c3","xdtri":"\u25bd","xfr":"\ud835\udd35","xhArr":"\u27fa","xharr":"\u27f7","xi":"\u03be","xlArr":"\u27f8","xlarr":"\u27f5","xmap":"\u27fc","xnis":"\u22fb","xodot":"\u2a00","xopf":"\ud835\udd69","xoplus":"\u2a01","xotime":"\u2a02","xrArr":"\u27f9","xrarr":"\u27f6","xscr":"\ud835\udccd","xsqcup":"\u2a06","xuplus":"\u2a04","xutri":"\u25b3","xvee":"\u22c1","xwedge":"\u22c0","yacute":"\u00fd","yacy":"\u044f","ycirc":"\u0177","ycy":"\u044b","yen":"\u00a5","yfr":"\ud835\udd36","yicy":"\u0457","yopf":"\ud835\udd6a","yscr":"\ud835\udcce","yucy":"\u044e","yuml":"\u00ff","zacute":"\u017a","zcaron":"\u017e","zcy":"\u0437","zdot":"\u017c","zeetrf":"\u2128","zeta":"\u03b6","zfr":"\ud835\udd37","zhcy":"\u0436","zigrarr":"\u21dd","zopf":"\ud835\udd6b","zscr":"\ud835\udccf","zwj":"\u200d","zwnj":"\u200c"};
function numericCharacterReference(reference){
 const match=reference.match(/^&#(?:x([0-9a-f]+)|([0-9]+));$/i);
 if(!match)return null;
 const code=parseInt(match[1]||match[2],match[1]?16:10);
 if(!Number.isSafeInteger(code)||code<0x20||code>0x10ffff||(code>=0x7f&&code<=0x9f)||(code>=0xd800&&code<=0xdfff))return null;
 return String.fromCodePoint(code);
}
function decodeCharacterReference(reference){
 if(reference.startsWith('&#'))return numericCharacterReference(reference);
 const name=reference.slice(1,-1);
 return Object.hasOwn(namedCharacterReferences,name)?namedCharacterReferences[name]:null;
}
function convertEntityPreference(text,preferLiterals){
 const edits=[];
 for(const token of FolioSyntax.tokenize(text,true)){
  // Syntax, link targets and literal code retain their original spelling.
  if(!FolioSyntax.isEntityTextToken(token))continue;
  const pattern=preferLiterals?/&(?:#(?:x[0-9a-f]+|[0-9]+)|[a-z][a-z0-9]+);/gi:/[^\x00-\x7f]/gu;
  for(const match of token.text.matchAll(pattern)){
   const decoded=preferLiterals?decodeCharacterReference(match[0]):null;
   const replacement=preferLiterals?(decoded===null?match[0]:escapePlainMarkdown(decoded)):'&#x'+match[0].codePointAt(0).toString(16).toUpperCase()+';';
   if(replacement!==match[0])edits.push({start:token.start+match.index,end:token.start+match.index+match[0].length,text:replacement});
  }
 }
 const apply=(value,edit)=>value.slice(0,edit.start)+edit.text+value.slice(edit.end);
 edits.sort((a,b)=>b.start-a.start);
 const expected=markdownToBB(text),candidate=edits.reduce(apply,text);
 if(markdownToBB(candidate)===expected)return candidate;
 // Keep references that protect syntax or otherwise affect parsing unchanged.
 let result=text;
 for(const edit of edits){const next=apply(result,edit);if(markdownToBB(next)===expected)result=next}
 return result;
}
function literalBBCode(text){
 // A literal closing noparse tag must be split so it cannot end its wrapper.
 return '[noparse]'+text.replace(/\[\/noparse\]/gi,tag=>'[[/noparse]'+tag.slice(1)+'[noparse]')+'[/noparse]';
}
function inlineMarkdown(text,protectedParts=[],issues=[]){
 const warn=message=>issues.push(message);
 const protect=value=>{const id=protectedParts.length;protectedParts.push(value);return '\uE000'+id+'\uE001'};
 // Shield literal inline code before interpreting any BBCode or custom macros.
 text=text.replace(/`([^`\n]+)`/g,(_,literal)=>protect(literalBBCode(literal)));
 // Explicitly escaped bracket expressions stay literal even for known tags.
 text=text.replace(/(\\+)(\[[^\[\]\n]*\])/g,(_,slashes,literal)=>slashes.length%2?slashes.slice(0,-1)+protect(literalBBCode(literal)):slashes+literal);
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
  else if(name==='font'&&body!==undefined&&Object.hasOwn(fontStyles,arg.toLowerCase()))compiled=applyFont(inlineMarkdown(body,[],issues),arg.toLowerCase());
  else if(name==='color'&&body!==undefined){const color=resolvedColor(arg);const content=inlineMarkdown(body,protectedParts,issues);compiled=color?'[color='+color+']'+content+'[/color]':content;}
  else if(['b','i','s','big','small','u','underline','sup','sub','noparse','heading','center','left','right','justify','indent','quote','collapse'].includes(name)&&body!==undefined){let tag=name==='underline'?'u':name;compiled='['+tag+(tag==='collapse'&&arg?'='+arg:'')+']'+(name==='noparse'?body:inlineMarkdown(body,protectedParts,issues))+'[/'+tag+']'}
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
 // Decode once, after parsing syntax, so encoded delimiters remain literal.
 text=text.replace(/&(?:#(?:x[0-9a-f]+|[0-9]+)|[a-z][a-z0-9]+);/gi,reference=>{
  const char=decodeCharacterReference(reference);
  return char===null?reference:protect(/[\[\]]/.test(char)?literalBBCode(char):char);
 });
 // Remaining bracket expressions are prose, not supported BBCode or links.
 text=text.replace(/\[[^\[\]\n]*\]/g,literal=>protect(literalBBCode(literal)));
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
 let inFence=false;
 for(let index=0;index<lines.length;index++){
  let line=lines[index];
  if(index===lines.length-1&&line===''&&trailingHeading)continue;
  if(line!=='')trailingHeading=false;
  const soft=!inFence&&index<lines.length-1&&((line.match(/\\+$/)||[''])[0].length%2===1);
  if(soft)line=line.slice(0,-1).replace(/[ \t]*$/,' ');
  try{
  const trimmed=line.trim();
  // A fenced code block is literal text. F-List supports noparse, not Markdown fences.
  if(/^```/.test(trimmed)){if(inFence)out.close('[/noparse]');else out.open('[noparse]');inFence=!inFence;continue}
  if(inFence){out.push(line);continue}
  if(trimmed===':::'){
   if(stack.length){const closing=stack.pop();if(closing)out.close('[/'+closing+']');continue}
   issues.push('Unmatched block macro closing marker: :::; exported as literal text');out.push(line);continue;
  }
  const block=line.match(/^\s*:::([a-z]+)(?:\s+(.+))?\s*$/i);
  if(block){const tag=block[1].toLowerCase();let arg=(block[2]||'').trim();
   if(['left','right','center','justify'].includes(tag)&&arg==='!')arg='';
   if(tag==='font'&&Object.hasOwn(fontStyles,arg.toLowerCase())){
    const body=[];let depth=1,fenced=false;
    while(++index<lines.length){
     const next=lines[index],marker=next.trim();
     if(/^```/.test(marker))fenced=!fenced;
     if(!fenced){if(/^:::[a-z]/i.test(marker))depth++;else if(marker===':::'&&--depth===0)break}
     body.push(next);
    }
    if(depth)issues.push('Unclosed block macro: :::font; closing marker added on export');
    out.open(applyFont(markdownToBB(body.join('\n'),issues),arg.toLowerCase()));out.close('');continue;
   }
   if(macroBlockNames.has(tag)){
    if(tag==='color'&&!resolvedColor(arg)){stack.push('');continue;}
    if((tag==='collapse'&&arg&&!/[\[\]]/.test(arg))||(tag==='color'&&resolvedColor(arg))||(!['collapse','color','font'].includes(tag)&&!arg)){
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
 return text.replace(/&(?:#(?:x[0-9a-f]+|[0-9]+)|[a-z][a-z0-9]+);/gi,reference=>decodeCharacterReference(reference)===null?reference:'&#x26;'+reference.slice(1)).replace(/([\\*_{}`~+])/g,'\\$1')
  .replace(/^(\s*)(#{1,6}\s|>\s|[-*+]\s|(?:-{3,}|\*{3,}|_{3,})\s*$)/gm,(_,indent,lead)=>indent+'\\'+lead);
}
function bbcodeToMarkdown(input,escapePlain=true){
 const normalized=normalizeColorTags(input),tree=parseBBCode(normalized);
 let preserveLayout=false,editableLayout=false;
 const blockTags=new Set(['center','left','right','justify','indent','quote','collapse']);
 function markNestedAlignments(node,inside=false){
  const aligned=['center','left','right','justify'].includes(node.tag);
  node.suppressAlignment=aligned&&inside;
  for(const child of node.children||[])markNestedAlignments(child,inside||aligned);
 }
 markNestedAlignments(tree);
 const raw=node=>node.text!==undefined?node.text:node.tag==='hr'?'[hr]':node.open+node.children.map(raw).join('')+(node.unclosed?'':'[/'+node.tag+']');
 const children=node=>node.children.map(convert).join('');
 const hasBlocks=node=>node.children.some(child=>child.tag&&(blockTags.has(child.tag)||child.tag==='heading'||hasBlocks(child)));
 const boundaries=value=>'\uE006'+value+'\uE007';
 function block(tag,arg,body){if(editableLayout)return boundaries(':::'+tag+(arg?' '+arg:'')+'\uE007'+body+'\uE006:::');return boundaries(':::'+tag+(arg?' '+arg:'')+'\n'+body+'\n:::')}
 function convert(node){
  if(node.text!==undefined)return decompileFonts(node.text,escapePlain);
  if(!node.tag)return children(node);
  if(node.unclosed)return raw(node);
  if(node.tag==='noparse'){
   const literal=node.children.map(raw).join(''),candidate=escapePlainMarkdown(literal);
   if(markdownToBB(candidate)===raw(node))return candidate;
  }
  const tag=node.tag,content=children(node),plain=node.children.map(raw).join('');
  const inline=!/[\r\n]/.test(content)&&!hasBlocks(node);
  // Markdown block syntax needs its own lines. Keep BBCode wrappers when
  // those syntax boundaries would change significant whitespace on export.
  if(preserveLayout&&tag!=='noparse'){
   const body=content.replace(/\n/g,'{br}');
   if(tag==='hr')return '{hr}';
   if(['b','i','u','s','sup','sub','big','small','heading'].includes(tag))return '{'+tag+'|'+body+'}';
   if(tag==='color')return '{color:'+node.param+'|'+body+'}';
   if(blockTags.has(tag))return '{'+tag+(tag==='collapse'?':'+node.param:node.suppressAlignment?':!':'')+'|'+body+'}';
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
   return block(tag,tag==='collapse'?node.param:node.suppressAlignment?'!':'',content);
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
function nestedAlignmentWarnings(text,mixed){
 if(!mixed)return [];
 const searchable=warningSource(text,mixed),alignments=new Set(['left','right','center','justify']),blocks=[],inline=[],issues=[];
 const open=(name,start,end,stack,suppressed=false)=>{
  const parent=[...blocks,...inline].reverse().find(item=>alignments.has(item.name));
  if(alignments.has(name)&&parent&&!suppressed)issues.push({message:'Nested text alignment: '+name+' inside '+parent.name+'; the innermost alignment takes precedence. In Markdown+, add ! to the inner block (:::'+name+' !) to suppress this warning',start,end,line:text.slice(0,start).split('\n').length});
  stack.push({name});
 };
 for(let index=0;index<searchable.length;index++){
  const literal=inline.some(item=>item.literal);
  if(!literal&&(index===0||searchable[index-1]==='\n')){
   const marker=searchable.slice(index).match(/^[ \t]*(?:>[ \t]*)*:::(?:([a-z]+)(?:[ \t]+([^\n]*))?)?[ \t]*(?=\n|$)/i);
   if(marker){
    if(marker[1]){const name=marker[1].toLowerCase(),arg=marker[2]?.trim(),suppressed=alignments.has(name)&&arg==='!';open(alignments.has(name)&&arg&&!suppressed?undefined:name,index,index+marker[0].length,blocks,suppressed)}
    else blocks.pop();
    index+=marker[0].length-1;continue;
   }
  }
  if(searchable[index]==='\\'){index++;continue}
  if(searchable[index]==='}'){inline.pop();continue}
  if(searchable[index]!=='{')continue;
  const header=searchable.slice(index).match(/^\{([a-z]+)(?::([^|{}\n]*))?\|/i),name=header?.[1].toLowerCase();
  if(literal||name==='noparse')inline.push({name,literal:true});
  else open(name,index,index+(header?.[0].length||1),inline,alignments.has(name)&&header?.[2]?.trim()==='!');
 }
 return issues;
}
function nestedFontWarnings(text){
 const searchable=warningSource(text,true),stack=[],blocks=[],issues=[];
 const message='Nested font macros are not supported; use one font macro per text span';
 for(let index=0;index<searchable.length;index++){
  if(index===0||searchable[index-1]==='\n'){
   const marker=searchable.slice(index).match(/^[ \t]*:::(?:([a-z]+)(?:[ \t]+[^\n]*)?)?[ \t]*(?=\n|$)/i);
   if(marker){
    const name=marker[1]?.toLowerCase();
    if(!name)blocks.pop();
    else{if(name==='font'&&blocks.includes('font'))issues.push({message,start:index,end:index+marker[0].length,line:text.slice(0,index).split('\n').length});blocks.push(name)}
    index+=marker[0].length-1;continue;
   }
  }
  if(searchable[index]==='\\'){index++;continue}
  if(searchable[index]==='}'){stack.pop();continue}
  if(searchable[index]!=='{')continue;
  const header=searchable.slice(index).match(/^\{([a-z]+)(?::[^|{}\n]*)?\|/i);
  const name=header?.[1].toLowerCase(),literal=stack.some(item=>item.literal)||name==='noparse';
  if(name==='font'&&!literal&&(blocks.includes('font')||stack.some(item=>item.name==='font'&&!item.literal)))issues.push({message,start:index,end:index+header[0].length,line:text.slice(0,index).split('\n').length});
  stack.push({name,literal});
 }
 return issues;
}
function macroWarnings(text){
 const issues=[];markdownToBB(text,issues);
 return [...new Set([...issues.filter(message=>!message.includes('block macro')),...blockMacroWarnings(text).map(issue=>issue.message),...nestedFontWarnings(text).map(issue=>issue.message),...nestedAlignmentWarnings(text,true).map(issue=>issue.message)])];
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
  else if(name==='font'&&!Object.hasOwn(fontStyles,arg.toLowerCase()))error='Invalid block macro: '+marker+'; choose a supported font';
  else if(!['collapse','color','font'].includes(name)&&arg&&!(['left','right','center','justify'].includes(name)&&arg==='!'))error='Invalid block macro: '+marker+'; '+name+' does not accept an argument';
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
 if(!mixed)text=text.replace(/(\[noparse\])([\s\S]*?)(\[\/noparse\]|$)/gi,(_,open,body,close)=>open+blank(body)+close);
 if(mixed)text=text.replace(/^\s*```[^\n]*\n[\s\S]*?(?:^\s*```[^\n]*(?:\n|$)|(?![\s\S]))/gm,blank).replace(/`[^`\n]+`/g,blank).replace(/\\[{}]/g,blank);
 return text;
}
function locatedWarnings(text,mixed,compiled){
 const searchable=warningSource(text,mixed),records=[];
 const add=(message,start,end)=>{const line=text.slice(0,start).split('\n').length;if(!records.some(item=>item.message===message&&item.start===start))records.push({message,start,end,line})};
 const messages=[...countWarnings(compiled),...colorWarnings(text,mixed),...(mixed?macroWarnings(text).filter(message=>!message.includes('block macro')&&!message.startsWith('Nested font macros')):[])].filter(message=>!message.startsWith('Nested text alignment:'));
 records.push(...nestedAlignmentWarnings(text,mixed));
 if(mixed)records.push(...blockMacroWarnings(text),...nestedFontWarnings(text));
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
document.addEventListener('folio-images-changed',()=>refresh());
function refresh(){diagnosticHover?.hide();const bb=getCompiled(),problems=locatedWarnings(source.value,data.mixed,bb);FolioSyntax.highlight($('sourceHighlight'),source.value,data.mixed,problems,{preferLiterals:data.preferLiterals!==false});updateLineNumbers();syncHighlightScroll();$('previewTitle').textContent=$('profileName').value.trim()||'Untitled character';const preview=$('preview');try{FolioPreview.update(preview,preview.closest('.frame'),bb,renderBB,templateSession?templateSession.historyId:'character:'+data.active,globalThis.FolioLocalImages?.revision)}catch(e){preview.textContent='Preview error: '+e.message}const text=source.value;$('stats').textContent=(text.trim()?text.trim().split(/\s+/).length:0)+' words · '+text.length.toLocaleString()+' characters';updateWarnings(problems)}
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
 layer.style.paddingBottom=getComputedStyle(source).paddingBottom;
 source.parentElement.style.setProperty('--gutter-width',Math.max(36,String(anchors.length).length*7+15)+'px');
 layer.style.width=(source.clientWidth+2)+'px';
 const fragment=document.createDocumentFragment();
 for(const anchor of anchors){
  const number=document.createElement('span');number.className='source-line-number';
  number.textContent=anchor.dataset.line;number.dataset.line=anchor.dataset.line;
  number.style.top=anchor.offsetTop+'px';fragment.appendChild(number);
 }
 numbers.replaceChildren(fragment);numbers.style.top='0px';
 // Content changes and rewrapping can clamp the textarea's scroll position.
 // Synchronize both layers before measuring the gutter's baseline.
 syncHighlightScroll();
 // Align glyph bottoms, then lift the smaller digits for optical alignment.
 if(anchors.length&&numbers.firstChild){
  const range=document.createRange();range.selectNodeContents(numbers.firstChild);
  const delta=range.getBoundingClientRect().bottom-anchors[0].getBoundingClientRect().bottom;
  numbers.style.top=(-delta-1)+'px';
 }
 updateActiveSyntax();
}
function syncHighlightScroll(){
 const layer=$('sourceHighlight');
 layer.style.width=(source.clientWidth+2)+'px';
 // The textarea and pre can differ by a final line box after wrapping or
 // browser layout rounding. Give the overlay enough scroll range at EOF.
 const missing=source.scrollTop-(layer.scrollHeight-layer.clientHeight);
 if(missing>0)layer.style.paddingBottom=(parseFloat(getComputedStyle(layer).paddingBottom)+missing+1)+'px';
 layer.scrollTop=source.scrollTop;layer.scrollLeft=source.scrollLeft;
 FolioSyntax.paintActive(layer);
 $('sourceLineNumbers').style.transform='translateY('+(-layer.scrollTop)+'px)';
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
document.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>{switch(btn.dataset.action){case 'divider':addLine(data.mixed?'---':'[hr]');break;case 'details':addLine(data.mixed?'**Field:** Details':'[b]Field:[/b] Details');break}}));

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
const fontPalette=$('fontPalette');
function wrapFont(name){
 if(!Object.hasOwn(fontStyles,name))return;
 const start=source.selectionStart,end=source.selectionEnd,chosen=source.value.slice(start,end)||'your text';
 const multiline=chosen.includes('\n'),prefix=multiline?':::font '+name+'\n':'{font:'+name+'|',suffix=multiline?'\n:::':'}',text=data.mixed?prefix+chosen+suffix:applyFont(chosen,name);
 replaceRange(text,start,end,data.mixed?start+prefix.length:start,data.mixed?start+prefix.length+chosen.length:start+text.length);
}
for(const [name,style] of Object.entries(fontStyles)){
 const button=document.createElement('button');button.type='button';button.className='palette-option';
 button.textContent=applyFont(style.label,name);button.setAttribute('aria-label','Apply '+style.label+' font');
 button.addEventListener('click',()=>{wrapFont(name);fontPalette.hidden=true;$('fontBtn').setAttribute('aria-expanded','false')});fontPalette.append(button);
}
$('fontBtn').addEventListener('click',()=>{fontPalette.hidden=!fontPalette.hidden;$('fontBtn').setAttribute('aria-expanded',String(!fontPalette.hidden))});
$('preferLiterals').addEventListener('change',event=>{
 rememberSelection();
 const scrollTop=source.scrollTop,scrollLeft=source.scrollLeft;
 data.preferLiterals=event.target.checked;
 if(data.mixed){
  const converted=convertEntityPreference(source.value,data.preferLiterals);
  if(converted!==source.value)replaceRange(converted,0,source.value.length,Math.min(source.selectionStart,converted.length),Math.min(source.selectionEnd,converted.length));
 }
 commitEdit('action');refresh();persist();
 const value=source.value,start=source.selectionStart,end=source.selectionEnd;
 const restoreScroll=()=>{source.scrollTop=scrollTop;source.scrollLeft=scrollLeft;syncHighlightScroll()};
 restoreScroll();
 // Browsers may reveal the caret after the focused textarea is rewritten.
 requestAnimationFrame(()=>{if(source.value===value&&source.selectionStart===start&&source.selectionEnd===end)restoreScroll()});
});
function switchMode(toMixed){
 if(data.mixed===toMixed)return;
 rememberSelection();
 const oldLength=source.value.length;
 const oldStart=source.selectionStart,oldEnd=source.selectionEnd;
 const oldScroll=source.scrollTop;
 const converted=toMixed?convertEntityPreference(bbcodeToMarkdown(source.value,true),data.preferLiterals!==false):normalizeColorTags(markdownToBB(source.value));
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
 $('previewPage').style.setProperty('--horizon-rem',(data.previewFontSize==='site'?'16':data.previewFontSize)+'px');
 $('preview').style.fontSize=data.previewFontSize==='site'?'':data.previewFontSize+'px';
 $('previewFontSize').value=data.previewFontSize==='site'?'':data.previewFontSize;
 $('previewFontSize').removeAttribute('aria-invalid');
}
$('previewFontSize').addEventListener('input',e=>{
 const size=parsePreviewFontSize(e.target.value);
 if(!size){e.target.setAttribute('aria-invalid','true');return}
 e.target.removeAttribute('aria-invalid');data.previewFontSize=size;
 $('preview').style.fontSize=size==='site'?'':size+'px';$('previewPage').style.setProperty('--horizon-rem',(size==='site'?'16':size)+'px');persist();
});
$('previewFontSize').addEventListener('change',setPreviewFontSize);
// Inline images use a picker; other insertion tools edit the source directly.
const symbolPalette=$('symbolPalette');
for(const [symbol,name] of [
 ['—','Em dash'],['–','En dash'],['…','Ellipsis'],['•','Bullet'],['·','Middle dot'],
 ['★','Black star'],['☆','White star'],['✦','Four pointed star'],['✧','White four pointed star'],
 ['◆','Black diamond'],['◇','White diamond'],['♥','Heart'],['♡','White heart'],
 ['♠','Spade'],['♣','Club'],['♦','Diamond suit'],['♪','Music note'],['♫','Music notes'],
 ['→','Right arrow'],['←','Left arrow'],['↑','Up arrow'],['↓','Down arrow'],['↔','Left right arrow'],
 ['✓','Check mark'],['✗','Cross mark'],['∞','Infinity'],['±','Plus minus'],['°','Degree'],
 ['©','Copyright'],['®','Registered'],['™','Trademark'],['😀','Grinning face']
]){
 const button=document.createElement('button');button.type='button';button.className='palette-option';
 button.textContent=symbol;button.title=name;button.setAttribute('aria-label','Insert '+name.toLowerCase());
 button.addEventListener('click',()=>{insertUnicodeSymbol(symbol);symbolPalette.hidden=true;$('symbolBtn').setAttribute('aria-expanded','false')});
 symbolPalette.append(button);
}
$('symbolBtn').addEventListener('click',()=>{symbolPalette.hidden=!symbolPalette.hidden;$('symbolBtn').setAttribute('aria-expanded',String(!symbolPalette.hidden))});
symbolPalette.addEventListener('keydown',event=>{
 if(event.key==='Escape'){symbolPalette.hidden=true;$('symbolBtn').setAttribute('aria-expanded','false');$('symbolBtn').focus()}
});
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
function insertUnicodeSymbol(symbol){
 const text=data.mixed&&data.preferLiterals===false
  ?Array.from(symbol,char=>'&#x'+char.codePointAt(0).toString(16).toUpperCase()+';').join('')
  :symbol;
 replaceRange(text);
}
function insertTag(type,imageId='12345',alias=''){
 let spec=(data.mixed?markdownInsertionSpecs:insertionSpecs)[type];if(!spec)return;
 if(type==='inlineimg')spec={...spec,prefix:spec.prefix.replace('12345',imageId),select:imageId,fallback:alias.replace(/[&\[\]{}|\r\n]/g,char=>'&#'+char.charCodeAt(0)+';')};
 const s=source.selectionStart,e=source.selectionEnd,chosen=source.value.slice(s,e);
 if(data.mixed&&type==='inlineimg'&&(chosen||spec.fallback))spec={...spec,prefix:spec.prefix+'|'};
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

document.querySelectorAll('[data-insert]').forEach(btn=>btn.addEventListener('click',async()=>{
 if(btn.dataset.insert!=='inlineimg'){insertTag(btn.dataset.insert);return}
 const start=source.selectionStart,end=source.selectionEnd;
 const id=await FolioLocalImages.pick();
 if(!id)return;
 source.setSelectionRange(start,end);insertTag('inlineimg',id,FolioLocalImages.get(id)?.alias||'');
}));
// A searchable reference that stays inside the editor rather than blocking it.
const guideExamples=[
 ['Basics','Bold and italics','Mix emphasis in a sentence','**Bold**, *italic*, and ***both***.'],
 ['Basics','Underline and strikethrough','Underline uses a Folio extension','++Underlined++ and ~~crossed out~~.'],
 ['Basics','Heading and divider','Break your bio into readable sections','# About me\nA curious traveller.\n\n---\n## Story hooks'],
 ['Basics','Heading levels','One # adds heading + big; two or more # add a regular heading','# Large heading\n## Standard heading\n### Smaller heading'],
 ['Basics','Big text','Use the inline macro for F-List big text','{big|Large text}'],
 ['Basics','Unicode symbols','HTML5 named, hexadecimal and decimal references become Unicode on export. Decompilation prefers readable text and font macros; code stays literal.','&mdash; &diams; &starf; &#x25C6; &#9670;'],
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
 ['Macros','Small caps font','Unicode letters; uppercase stays uppercase. x has no small-cap equivalent. Decompilation detects styled text, but cannot recover an invisible font choice.','{font:smallcaps|ABCDabcd}'],
 ['Macros','Fancy fonts','Unicode text fonts export without font tags. Use bold, doublestruck, italic, bolditalic, sans, sansbold, fraktur, monospace or fullwidth. Only visibly styled characters are recovered on conversion from BBCode.','{font:bold|Bold 123} {font:doublestruck|Lucas} {font:monospace|Mono 123} {font:fullwidth|Wide 123}'],
 ['Macros','Multiline font','Use a font block for multiple lines. Inline font macros stay on one line.',':::font bold\nfirst line\nsecond line\n:::'],
 ['Macros','More Unicode fonts','Italic, bold italic, sans serif, sans serif bold and Fraktur. Decompilation recovers styled characters and bridges unchanged characters between matching font runs.','{font:italic|Elegant} {font:bolditalic|Emphasis} {font:sans|Modern 123} {font:sansbold|Strong 123} {font:fraktur|Gothic}'],
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
$('exportScreenshot').addEventListener('click',async()=>{
 const button=$('exportScreenshot'),label=button.textContent,filename=slug()+'.png';
 button.disabled=true;button.textContent='Exporting screenshot…';button.setAttribute('aria-busy','true');
 try{refresh();const png=await FolioScreenshot.capture($('previewPage'));download(png,filename,'image/png');toast('Screenshot exported')}
 catch(error){console.error('Screenshot export failed',error);toast('Screenshot export failed. Please try again.')}
 finally{button.disabled=false;button.textContent=label;button.removeAttribute('aria-busy')}
});
$('copyScreenshot').addEventListener('click',async()=>{
 const button=$('copyScreenshot'),label=button.textContent;
 if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined'||(ClipboardItem.supports&&!ClipboardItem.supports('image/png'))){toast('Image clipboard is unavailable in this browser. Use Export screenshot (.png).');return}
 button.disabled=true;button.textContent='Copying screenshot…';button.setAttribute('aria-busy','true');
 try{
  refresh();
  const png=FolioScreenshot.capture($('previewPage'));
  // Start the clipboard write during the click gesture while rendering finishes.
  png.catch(()=>{});
  await navigator.clipboard.write([new ClipboardItem({'image/png':png})]);
  toast('Screenshot copied. Paste it into another app!');
 }catch(error){console.error('Screenshot copy failed',error);toast('Could not copy screenshot. Allow clipboard access or use Export screenshot (.png).')}
 finally{button.disabled=false;button.textContent=label;button.removeAttribute('aria-busy')}
});
for(const [id,format,type] of [['exportHtml','html','text/html;charset=utf-8']]){
 $(id).addEventListener('click',async()=>{
  const button=$(id),label=button.textContent,filename=slug()+'.'+format,title=$('profileName').value.trim()||'Untitled character';
  button.disabled=true;button.textContent='Exporting…';button.setAttribute('aria-busy','true');
  try{refresh();const result=await FolioScreenshot[format]($('previewPage'),title);download(result,filename,type);toast(format.toUpperCase()+' exported')}
  catch(error){console.error(format+' export failed',error);toast(format.toUpperCase()+' export failed. Please try again.')}
  finally{button.disabled=false;button.textContent=label;button.removeAttribute('aria-busy')}
 });
}
const slug=()=> (active().name||'character').trim().replace(/[^a-z0-9_-]+/gi,'_').replace(/^_+|_+$/g,'').slice(0,60)||'character';
$('downloadCode').addEventListener('click',()=>{download(getCompiled(),slug()+'.bbcode');toast('BBCode exported')});
$('downloadMarkdown').addEventListener('click',()=>{download(data.mixed?source.value:convertEntityPreference(bbcodeToMarkdown(source.value,true),data.preferLiterals!==false),slug()+'.md','text/markdown;charset=utf-8');toast('Markdown source exported')});
$('backupBtn').addEventListener('click',()=>{download(JSON.stringify({format:'folio-profile',version:1,name:active().name,content:active().content,mixed:data.mixed},null,2),slug()+'.folio.json','application/json');toast('Editable backup exported')});
// Full-app backups contain the complete persisted state, separate from profile backups.
function validateAppBackup(record){
 if(!record||record.format!=='folio-app'||record.version!==1)throw Error('Unsupported app backup');
 const value=record.data;
 if(value&&'preferLiterals' in value&&typeof value.preferLiterals!=='boolean')throw Error('Invalid character preference');
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
$('purgeData').addEventListener('click',()=>requestConfirmation('Permanently delete ALL locally saved characters, templates, settings and image attachments, including unsaved edits? Export all data first to keep a backup.',()=>{
 try{localStorage.removeItem(STORAGE)}catch(error){toast('Could not delete local data');return}
 const draft={id:makeId(),name:'New Character',content:''};
 replaceAppData({customTemplates:[],drafts:[draft],active:draft.id,theme:'flist-blue',editorTheme:'folio',previewFontSize:'site',splitRatio:.524,previewNoteDismissed:false,preferLiterals:true,mixed:true});
 clearTimeout(saveTimer);
 try{localStorage.removeItem(STORAGE);$('saveStatus').textContent='Local data purged'}catch(error){toast('Could not delete local data');return}
 globalThis.FolioLocalImages?.clear().catch(()=>toast('Profile data purged, but image attachments could not be removed.'));
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
$('manageTemplates').addEventListener('click',()=>openTemplateManager());
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
