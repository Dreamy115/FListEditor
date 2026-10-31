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
  result.passed=true;
 } catch(error) {result.passed=false;result.error=error.stack||String(error);}
 const output=document.createElement('pre');output.id='diagnostics-result';output.textContent=JSON.stringify(result);document.body.appendChild(output);
})();
