(async () => {
 const result={},source=document.getElementById('source'),layer=document.getElementById('sourceHighlight'),numbers=document.getElementById('sourceLineNumbers');
 const check=(ok,message)=>{if(!ok)throw Error(message)};
 const verify=()=>{
  check(Math.abs(source.scrollTop-layer.scrollTop)<1,'Editor and highlighting scroll together');
  const anchors=layer.querySelectorAll('.source-line-anchor');
  check(anchors.length===source.value.split('\n').length,'One number per logical line');
  const gutter=document.getElementById('sourceGutter').getBoundingClientRect();
  for(const index of new Set([0,...Array.from({length:Math.min(6,anchors.length)},(_,i)=>anchors.length-1-i)])){
   const number=numbers.children[index],range=document.createRange();range.selectNodeContents(number);
   check(Math.abs(range.getBoundingClientRect().bottom-anchors[index].getBoundingClientRect().bottom+2)<1,'Number baseline tracks source at line '+(index+1));
   const rect=number.getBoundingClientRect();
   check(rect.left>=gutter.left&&rect.right<gutter.right,'Full line number fits in gutter');
  }
 };
 try{
  source.value=Array.from({length:10000},(_,i)=>'Line '+(i+1)+' text').join('\n');source.dispatchEvent(new Event('input'));
  for(const fraction of [0,.5,1]){
   source.scrollTop=(source.scrollHeight-source.clientHeight)*fraction;source.dispatchEvent(new Event('scroll'));verify();
  }
  // Replace a scrolled long document: stale transforms must not affect calibration.
  for(const text of [Array.from({length:100},(_,i)=>'Line '+i+' '+('wrapped symbols \u25c6 \u2014 ').repeat(20)).join('\n'),'last\n'.repeat(500),'Short\nfile']){
   source.value=text;source.dispatchEvent(new Event('input'));
   source.scrollTop=source.scrollHeight;source.dispatchEvent(new Event('scroll'));verify();
  }

  const pause=()=>new Promise(resolve=>setTimeout(resolve,80));
  source.value=Array.from({length:135},(_,i)=>'Line '+i).join('\n')+'\n:::collapse A thing\nWhat place is better than a place for exploration from where we could finally make something cool and make a map or find other stuff\n:::\n:::\n---';
  source.dispatchEvent(new Event('input'));await pause();
  source.scrollTop=source.scrollHeight;source.dispatchEvent(new Event('scroll'));await pause();verify();

  // A one-line shorter overlay viewport must not desynchronize the gutter at EOF.
  layer.style.height=(source.clientHeight-24)+'px';
  source.scrollTop=source.scrollHeight;source.dispatchEvent(new Event('scroll'));verify();
  layer.style.height='';
  // Also cover the reverse mismatch where the overlay clamps before the textarea.
  layer.style.height=(source.clientHeight+24)+'px';
  source.dispatchEvent(new Event('scroll'));verify();
  layer.style.height='';
  result.passed=true;
 }catch(error){result.error=error.stack}
 const out=document.createElement('pre');out.id='editor-scroll-result';out.textContent=JSON.stringify(result);document.body.append(out);
})();
