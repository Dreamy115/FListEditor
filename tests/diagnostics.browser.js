(async () => {
 const result = {}, $ = id => document.getElementById(id);
 const check = (ok, message) => { if (!ok) throw Error(message); };
 const pause = () => new Promise(resolve => setTimeout(resolve, 300));
 try {
  const source=$('source');
  if (!$('mixedMode').classList.contains('active')) $('mixedMode').click();
  source.value=':::centre\ntext\n:::';source.dispatchEvent(new Event('input'));
  source.setSelectionRange(4,4);
  const span=$('sourceHighlight').querySelector('.syntax-warning'), rect=span.getBoundingClientRect();
  source.dispatchEvent(new PointerEvent('pointermove',{clientX:rect.left+5,clientY:(rect.top+rect.bottom)/2}));
  await pause();
  const popup=$('sourceDiagnostic');
  check(!popup.hidden,'Hover over the textarea opens warning card');
  check(popup.textContent.includes('Unknown block macro'),'Warning message appears');
  check(popup.textContent.includes(':::center'),'Correction example appears');
  check(source.selectionStart===4,'Hover preserves editor selection');
  check(popup.getBoundingClientRect().right<=innerWidth,'Card stays within viewport');
  popup.dispatchEvent(new PointerEvent('pointerenter'));
  popup.querySelector('button').click();
  check(source.value===':::center\ntext\n:::','Quick fix changes only offending opener');
  check(!$('sourceHighlight').querySelector('.syntax-warning'),'Squiggle clears after fix');
  $('undoEdit').click();
  check(source.value===':::centre\ntext\n:::','Quick fix participates in undo');
  source.focus();source.setSelectionRange(4,4);
  source.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',altKey:true,bubbles:true,cancelable:true}));
  check(!popup.hidden&&popup.contains(document.activeElement),'Keyboard shortcut opens and focuses card');
  popup.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
  check(popup.hidden&&document.activeElement===source,'Escape dismisses and restores editor focus');
  source.dispatchEvent(new KeyboardEvent('keydown',{key:'.',ctrlKey:true,bubbles:true,cancelable:true}));
  check(!popup.hidden,'Ctrl+. opens warning card');
  source.dispatchEvent(new Event('scroll'));
  check(popup.hidden,'Scrolling dismisses stale hover');
  // Undo and redo must keep the viewport even when restoring a remote caret.
  const longText=Array.from({length:180},(_,i)=>'Line '+i+' text').join('\n');
  const edit=value=>{source.value=value;source.dispatchEvent(new Event('input'))};
  for(const template of [false,true]){
   if(template){$('openTemplateManager').click();$('newTemplate').click()}
   edit(longText);source.focus();source.setSelectionRange(source.value.length,source.value.length);
   source.dispatchEvent(new KeyboardEvent('keydown',{key:'b',ctrlKey:true,bubbles:true,cancelable:true}));
   const formatted=source.value;
   source.setSelectionRange(110,150,'backward');
   source.scrollTop=230;
   const expected=source.scrollTop;
   source.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true,cancelable:true}));
   await new Promise(resolve=>setTimeout(resolve,80));
   check(source.value===longText,'Undo restores content');
   check(source.selectionStart===110&&source.selectionEnd===150&&source.selectionDirection==='backward','Undo preserves selection and direction');
   check(Math.abs(source.scrollTop-expected)<2,'Undo preserves scroll in '+(template?'template':'character'));
   check($('sourceHighlight').scrollTop===source.scrollTop,'Undo synchronizes syntax layer');
   source.setSelectionRange(200,200);
   source.scrollTop=340;const redoScroll=source.scrollTop;
   source.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,shiftKey:true,bubbles:true,cancelable:true}));
   await new Promise(resolve=>setTimeout(resolve,80));
   check(source.value===formatted,'Redo restores content');
   check(source.selectionStart===200&&source.selectionEnd===200,'Redo preserves current caret');
   check(Math.abs(source.scrollTop-redoScroll)<2,'Redo preserves scroll');
   source.setSelectionRange(30,70,'backward');
   $('undoEdit').click();
   await new Promise(resolve=>setTimeout(resolve,80));
   check(Math.abs(source.scrollTop-redoScroll)<2,'Toolbar undo preserves scroll');
   check(source.selectionStart===30&&source.selectionEnd===70&&source.selectionDirection==='backward','Toolbar undo preserves selection');
   source.setSelectionRange(80,80);
   source.dispatchEvent(new InputEvent('beforeinput',{inputType:'historyRedo',bubbles:true,cancelable:true}));
   await new Promise(resolve=>setTimeout(resolve,80));
   check(Math.abs(source.scrollTop-redoScroll)<2,'Native history event preserves scroll');
   check(source.selectionStart===80&&source.selectionEnd===80,'Native history event preserves caret');
   source.setSelectionRange(source.value.length,source.value.length);
   $('undoEdit').click();
   await new Promise(resolve=>setTimeout(resolve,80));
   check(source.selectionStart===longText.length&&source.selectionEnd===longText.length,'Caret clamps to end when undo shortens the document');
  }
  result.passed=true;
 } catch(error) {result.passed=false;result.error=error.stack||String(error);}
 const output=document.createElement('pre');output.id='diagnostics-result';output.textContent=JSON.stringify(result);document.body.appendChild(output);
})();
