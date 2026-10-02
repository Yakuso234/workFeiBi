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
test('陪伴数据重启保留，本次计数和冷却不沿用',()=>{
  const pet=new Companion();pet.interact('pat',false,0);pet.completeRound();
  const restored=new Companion(JSON.parse(JSON.stringify(pet.serialize())));
  assert.deepEqual(restored.serialize(),pet.serialize());
  assert.equal(restored.snapshot().count,0);
  assert.ok(restored.interact('feed',false,0));
  assert.equal(restored.snapshot().totalInteractions,2);
  assert.ok(restored.snapshot().unlocked.includes('第一轮专注'));
});
test('损坏或旧配置安全迁移，数值限制范围且没有离线惩罚',()=>{
  assert.deepEqual(new Companion(null).serialize(),new Companion().serialize());
  const pet=new Companion({bond:1000,mood:-20,energy:NaN,totalInteractions:Infinity,completedRounds:1.5});
  assert.deepEqual(pet.serialize(),{totalInteractions:0,completedRounds:1,bond:100,mood:0,energy:80});
  const restored=new Companion(pet.serialize());assert.equal(restored.energy,80);
  for(let n=0;n<200;n++)pet.completeRound();
  assert.equal(pet.bond,100);assert.equal(pet.mood,100);assert.equal(pet.energy,0);
});
test('摸头和打盹反馈不同，拒绝的互动不增加成长',()=>{
  const pet=new Companion();const before=pet.serialize();
  pet.interact('pat',true,0);assert.deepEqual(pet.serialize(),before);
  const pat=pet.interact('pat',false,0),earned=pet.serialize();
  assert.equal(pet.interact('sleep',false,2000),null);assert.deepEqual(pet.serialize(),earned);
  const sleep=pet.interact('sleep',false,3000);
  assert.notEqual(pat.motion,sleep.motion);assert.notEqual(pat.sound,sleep.sound);
  assert.ok(sleep.duration>pat.duration);assert.equal(pet.energy,92);
});
