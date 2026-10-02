const test=require('node:test');
const assert=require('node:assert/strict');
const {IdleBag,quiet,canSound,idlePool,idleDelay,duration,previewActions}=require('../src/behavior');

test('idle bag visits all actions and avoids repeats across refill boundaries',()=>{
  const bag=new IdleBag(()=>.7),pool=['blink','wave','look'];
  let last;
  for(let cycle=0;cycle<20;cycle++){
    const seen=[];
    for(let index=0;index<pool.length;index++){const next=bag.next(pool);assert.notEqual(next,last);seen.push(next);last=next;}
    assert.deepEqual(seen.sort(),pool.slice().sort());
  }
  assert.equal(bag.next([]),null);
  assert.equal(bag.next(['sleep']),'sleep');
  assert.equal(bag.next(['blink']),'blink');
});
test('quiet focus blocks every sound and only allows the subtle blink',()=>{
  const settings={idleMotion:true,focusQuiet:true,soundEnabled:true,volume:80,character:'nuonuo'};
  const timer={running:true,phase:'study'};
  assert.equal(quiet(settings,timer),true);
  assert.equal(canSound(settings,timer),false);
  assert.deepEqual(idlePool(settings,timer),['blink']);
  assert.equal(canSound(settings,{...timer,reminding:true}),true);
  assert.equal(canSound(settings,{...timer,phase:'rest'}),true);
  assert.equal(canSound({...settings,volume:0},{phase:'rest'}),false);
});
test('reduced motion stops automatic poses while manual poses stay available',()=>{
  assert.deepEqual(idlePool({idleMotion:true,reducedMotion:true},{phase:'rest'}),[]);
  assert.ok(previewActions.includes('sleep'));
  assert.equal(duration('sleep'),8000);
  assert.equal(duration('sleep',50000),12000);
});
test('automatic poses preserve alternate Phoebe costumes and respect intervals',()=>{
  const settings={idleMotion:true,character:'phoebe',outfit:2};
  assert.deepEqual(idlePool(settings,{phase:'rest'}),['sway','blink','look']);
  assert.ok(idlePool({...settings,outfit:1},{phase:'rest'}).includes('turn'));
  assert.equal(idleDelay('calm',()=>0),10000);
  assert.equal(idleDelay('lively',()=>0),3000);
  assert.equal(idleDelay('unknown',()=>0),5000);
});
