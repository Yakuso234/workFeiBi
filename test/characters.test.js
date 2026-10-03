const test=require('node:test');
const assert=require('node:assert/strict');
const characters=require('../src/characters');

test('character catalog includes original owl without replacing existing characters',()=>{
  assert.deepEqual(characters.ids,['phoebe','nuonuo','owl','miku']);
  assert.equal(characters.name('owl'),'发条鸮');
  for(const character of characters.list){assert.equal(characters.valid(character.id),true);assert.equal(characters.name(character.id),character.name);}
  assert.equal(characters.name('unknown'),'菲比啾比');
  assert.equal(characters.get('miku').supportsBack,false);
  assert.equal(characters.get('unknown').nickname,'啾比');
});
test('character ids reject arbitrary values and the shared catalog is immutable',()=>{
  for(const id of [undefined,null,0,'','__proto__','constructor','OWL',{},['owl']])assert.equal(characters.valid(id),false);
  assert.equal(Object.isFrozen(characters),true);
  assert.equal(Object.isFrozen(characters.ids),true);
  assert.equal(Object.isFrozen(characters.list),true);
  assert.ok(characters.list.every(Object.isFrozen));
});
