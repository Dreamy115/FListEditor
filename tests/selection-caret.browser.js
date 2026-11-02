(async()=>{
 const source=document.getElementById('source'),caret=document.querySelector('.source-selection-caret');
 const check=(ok,message)=>{if(!ok)throw Error(message)};
 const pause=()=>new Promise(resolve=>setTimeout(resolve,30));
 const result={};
 try{
  source.value='first\nsecond\nthird';source.dispatchEvent(new Event('input'));source.focus();
  source.setSelectionRange(0,8,'forward');await pause();
  check(!caret.hidden,'Selection caret visible');
  const forward=caret.firstElementChild.getBoundingClientRect();
  source.setSelectionRange(0,8,'backward');await pause();
  const backward=caret.firstElementChild.getBoundingClientRect();
  check(!caret.hidden&&backward.top<forward.top,'Caret follows active selection end');
  source.setSelectionRange(0,8,'forward');
  source.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',altKey:true,bubbles:true,cancelable:true}));await pause();
  check(!caret.hidden,'Caret remains after moving selected lines');
  check(caret.firstElementChild.getBoundingClientRect().height>0,'Caret has visible height');
  for(const key of ['ArrowUp','ArrowDown']){
   const before=source.value,selected=before.slice(source.selectionStart,source.selectionEnd);
   source.dispatchEvent(new KeyboardEvent('keydown',{key,altKey:true,shiftKey:true,bubbles:true,cancelable:true}));await pause();
   check(source.value.length>before.length,'Shift+Alt duplicates source lines');
   check(source.value.slice(source.selectionStart,source.selectionEnd)===selected,'Copied text stays selected');
   check(!caret.hidden,'Copied selection retains visible caret');
  }
  source.setSelectionRange(2,2);await pause();check(caret.hidden,'Collapsed selection uses native caret');
  source.setSelectionRange(0,3);await pause();source.blur();await pause();check(caret.hidden,'Blur hides selection caret');
  result.passed=true;
 }catch(error){result.error=error.stack}
 const out=document.createElement('pre');out.id='selection-caret-result';out.textContent=JSON.stringify(result);document.body.append(out);
})();
