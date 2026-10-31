const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync('src/app.js', 'utf8');
const context = vm.createContext({});
vm.runInContext(app.slice(app.indexOf('function validateCustomTemplates('), app.indexOf('let data=')), context);
const validate = value => JSON.parse(JSON.stringify(context.validateCustomTemplates(value)));
assert.deepEqual(validate(undefined), []);
assert.deepEqual(validate({}), []);
assert.deepEqual(validate([
  null, {}, {id:'bad',name:' ',content:''},
  {id:'one',name:'  Reusable profile  ',content:'# Name\n\n:::i\nLine one\nLine two\n:::'},
  {id:'one',name:'Duplicate',content:'bad'},
  {id:'large',name:'Too large',content:'x'.repeat(1500001)}
]), [{id:'one',name:'Reusable profile',content:'# Name\n\n:::i\nLine one\nLine two\n:::'}]);
assert.equal(validate([{id:'long',name:'x'.repeat(120),content:''}])[0].name.length, 100);
assert.equal(validate(Array.from({length:110}, (_,i) => ({id:String(i),name:'Template '+i,content:''}))).length, 100);
console.log('Custom template storage validation checks passed');
