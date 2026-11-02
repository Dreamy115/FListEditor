const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('src/app.js','utf8');
let commits=0,syncs=0,remembered=0;
const source={
 setRangeText(text,start,end){this.value=this.value.slice(0,start)+text+this.value.slice(end)},
 setSelectionRange(start,end,direction){this.selectionStart=start;this.selectionEnd=end;this.selectionDirection=direction}
};
const context=vm.createContext({source,rememberSelection:()=>remembered++,syncFromEditor:()=>syncs++,commitEdit:()=>commits++});
vm.runInContext(app.slice(app.indexOf('function moveSourceLines('),app.indexOf("document.addEventListener('keydown'")),context);
function check(text,start,end,direction,expected,newStart,newEnd){
 Object.assign(source,{value:text,selectionStart:start,selectionEnd:end,selectionDirection:'backward'});
 const before=commits;
 context.moveSourceLines(direction);
 assert.equal(source.value,expected);
 assert.equal(source.selectionStart,newStart);assert.equal(source.selectionEnd,newEnd);
 assert.equal(source.selectionDirection,'backward');
 assert.equal(commits-before,expected===text?0:1);
}
check('aaa\nbb\ncccc',5,6,-1,'bb\naaa\ncccc',1,2);
check('aaa\nbb\ncccc',5,6,1,'aaa\ncccc\nbb',10,11);
check('a\nb\nc\nd',2,5,1,'a\nd\nb\nc',4,7);
check('a\nb\nc',2,4,-1,'b\na\nc',0,2);
check('a\nb\nc',0,2,1,'b\na\nc',2,4);
check('a\nb',2,2,-1,'b\na',0,0);
check('\na',0,0,1,'a\n',2,2);
check('a\n',2,2,-1,'\na',0,0);
check('a\nb',0,1,-1,'a\nb',0,1);
check('a\nb',2,3,1,'a\nb',2,3);
check('',0,0,-1,'',0,0);
assert.equal(commits,syncs);assert.equal(commits,remembered);
console.log('Source line movement checks passed');
