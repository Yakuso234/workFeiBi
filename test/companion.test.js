const test=require('node:test');
const assert=require('node:assert/strict');
const {Companion}=require('../src/companion');
test('三种互动返回不同反馈并计数',()=>{
  const pet=new Companion();
  assert.equal(pet.interact('pat',false,0).motion,'wave');
  assert.equal(pet.interact('feed',false,2500).motion,'kick');
  assert.equal(pet.interact('stretch',false,5000).motion,'stretch');
  assert.equal(pet.snapshot().count,3);
});
test('提醒优先，互动节流，未知指令不计数',()=>{
  const pet=new Companion();
  assert.equal(pet.interact('pat',true,0),null);
  assert.equal(pet.interact('unknown',false,0),null);
  assert.equal(pet.interact('__proto__',false,0),null);
  assert.ok(pet.interact('feed',false,0));
  assert.equal(pet.interact('pat',false,2499),null);
  assert.equal(pet.snapshot().count,1);
  assert.ok(pet.interact('pat',false,2500));
});
