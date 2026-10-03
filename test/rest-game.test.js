const test=require('node:test');
const assert=require('node:assert/strict');
const {RestGame,DURATION_MS,MAX_SCORE,HIT_COOLDOWN_MS}=require('../src/rest-game');
const create=()=>new RestGame({}, {random:()=>0.5});

test('接星星只读快照，不重复开始，也不通过读取结算',()=>{
  const game=create();
  assert.equal(game.snapshot(0).target,null);
  assert.equal(game.start(1000),true);
  const first=game.snapshot(1000);
  assert.equal(first.durationMs,45000);
  assert.equal(first.remainingMs,45000);
  assert.deepEqual({x:first.target.x,y:first.target.y},{x:50,y:50});
  assert.equal(game.start(11000),false);
  assert.equal(game.snapshot(11000).remainingMs,35000);
  const before=game.serialize();
  assert.equal(game.snapshot(46000).remainingMs,0);
  assert.equal(game.snapshot(90000).active,true);
  assert.deepEqual(game.serialize(),before);
  assert.equal(game.update(45999),null);
  assert.equal(game.update(46000).reason,'timeout');
  assert.equal(game.snapshot(46000).active,false);
  assert.equal(game.snapshot(46000).target,null);
});

test('目标只得分一次，点击节流边界250ms，旧局与其它实例目标无效',()=>{
  const game=create();game.start(0);
  const original=game.snapshot(0).target.id;
  assert.equal(game.hit(original,-1),false);
  assert.equal(game.hit('unknown',0),false);
  assert.equal(game.hit(original,0),true);
  assert.equal(game.hit(original,250),false);
  const second=game.snapshot(0).target.id;
  assert.notEqual(second,original);
  assert.equal(game.hit(second,249),false);
  assert.equal(game.hit(second,250),true);
  assert.equal(game.snapshot(250).score,2);
  game.cancel('character-change',300);
  assert.equal(game.start(400),true);
  assert.equal(game.hit(second,400),false);
  assert.equal(game.snapshot(400).score,0);
  const other=create();other.start(400);
  assert.notEqual(other.snapshot(400).target.id,game.snapshot(400).target.id);
  assert.equal(game.hit(other.snapshot(400).target.id,400),false);
});

test('恰好截止时禁止得分，完成事件只一次，记录只保存汇总',()=>{
  const game=create();game.start(0);
  assert.equal(game.hit(game.snapshot(0).target.id,0),true);
  assert.equal(game.hit(game.snapshot(45000).target.id,45000),false);
  const event=game.update(45000);
  assert.deepEqual(event,{type:'game-complete',reason:'timeout',score:1,newBest:true,best:1,played:1,totalStars:1,lastScore:1});
  for(let n=0;n<5;n++)assert.equal(game.update(45000+n),null);
  assert.deepEqual(game.serialize(),{best:1,played:1,totalStars:1,lastScore:1});
  assert.deepEqual(game.snapshot(45001).result,{kind:'complete',reason:'timeout',score:1,newBest:true});
  const restored=new RestGame(JSON.parse(JSON.stringify(game.serialize())));
  assert.deepEqual(restored.serialize(),game.serialize());
  assert.equal(restored.snapshot(45001).active,false);
  assert.equal(restored.snapshot(45001).result,null);
  assert.equal(restored.snapshot(45001).lastScore,1);
});

test('零分完成仍记一局，取消不影响局数、历史最佳或总星星',()=>{
  const game=create();game.start(0);
  assert.equal(game.update(DURATION_MS).score,0);
  assert.deepEqual(game.serialize(),{best:0,played:1,totalStars:0,lastScore:0});
  game.start(50000);game.hit(game.snapshot(50000).target.id,50000);
  const before=game.serialize();
  assert.equal(game.cancel('timer-ready',50500),true);
  assert.equal(game.cancel('second-cancel',50501),false);
  assert.deepEqual(game.serialize(),before);
  assert.deepEqual(game.snapshot(50501).result,{kind:'canceled',reason:'timer-ready',score:1});
  assert.equal(game.update(100000),null);
  assert.equal(game.hit('anything',100000),false);
  assert.equal(game.start(101000),true);
  assert.equal(game.snapshot(101000).result,null);
});

test('最多60星，封顶后不生成目标且只结算一次',()=>{
  const game=create();game.start(0);
  for(let n=0;n<MAX_SCORE;n++){
    const state=game.snapshot(n*HIT_COOLDOWN_MS);
    assert.ok(state.target);
    assert.equal(game.hit(state.target.id,n*HIT_COOLDOWN_MS),true);
  }
  assert.equal(game.snapshot(15000).score,60);
  assert.equal(game.snapshot(15000).target,null);
  assert.equal(game.hit('anything',15000),false);
  const event=game.update(15000);
  assert.equal(event.reason,'score-limit');
  assert.deepEqual(game.serialize(),{best:60,played:1,totalStars:60,lastScore:60});
  assert.equal(game.update(15001),null);
  game.start(20000);game.hit(game.snapshot(20000).target.id,20000);
  assert.equal(game.update(65000).newBest,false);
  assert.deepEqual(game.serialize(),{best:60,played:2,totalStars:61,lastScore:1});
});

test('损坏记录、字符串、继承值被拒绝，数值与随机目标均有边界',()=>{
  const defaults={best:0,played:0,totalStars:0,lastScore:0};
  for(const value of [null,undefined,[],new Date(),{best:'60',played:NaN,totalStars:Infinity,lastScore:false},Object.create({best:50})]){
    assert.deepEqual(new RestGame(value).serialize(),defaults);
  }
  const saved=new RestGame({best:600,played:1000001,totalStars:100000000,lastScore:-8});
  assert.deepEqual(saved.serialize(),{best:60,played:1000000,totalStars:60000000,lastScore:0});
  const fractional=new RestGame({best:5.9,played:7.2,totalStars:28.9,lastScore:2.1});
  assert.deepEqual(fractional.serialize(),{best:5,played:7,totalStars:28,lastScore:2});
  const values=[-10,10,NaN,Infinity,'0.2',undefined];let i=0;
  const game=new RestGame({}, {random:()=>values[i++%values.length]});game.start(0);
  assert.deepEqual({x:game.snapshot(0).target.x,y:game.snapshot(0).target.y},{x:12,y:85});
  for(let n=0;n<20;n++){
    const target=game.snapshot(n*250).target;
    assert.ok(Number.isFinite(target.x)&&target.x>=12&&target.x<=88);
    assert.ok(Number.isFinite(target.y)&&target.y>=15&&target.y<=85);
    game.hit(target.id,n*250);
  }
});

test('快照与序列化结果不能反向修改状态，取消原因不会无限增长',()=>{
  const game=create();game.start(0);
  const state=game.snapshot(0),id=state.target.id;
  state.target.id='tampered';state.target.x=-900;state.best=60;
  const saved=game.serialize();saved.best=60;
  assert.equal(game.snapshot(0).target.id,id);
  assert.equal(game.snapshot(0).target.x,50);
  assert.equal(game.serialize().best,0);
  game.hit(id,0);game.cancel('x'.repeat(1000),1);
  const result=game.snapshot(1).result;
  assert.equal(result.reason.length,80);
  result.score=999;
  assert.equal(game.snapshot(1).result.score,1);
  game.start(2);game.cancel(null,3);
  assert.equal(game.snapshot(3).result.reason,'canceled');
});

test('无效时间参数不改变记录，倒退时快照剩余不超45秒',()=>{
  const game=create(),before=game.serialize();
  for(const time of [NaN,Infinity,-Infinity,'1',null,Number.MAX_VALUE]){
    assert.throws(()=>game.start(time),TypeError);
    assert.throws(()=>game.snapshot(time),TypeError);
    assert.throws(()=>game.update(time),TypeError);
    assert.throws(()=>game.hit('target',time),TypeError);
    assert.throws(()=>game.cancel('canceled',time),TypeError);
  }
  assert.deepEqual(game.serialize(),before);
  game.start(10000);
  assert.equal(game.snapshot(0).remainingMs,45000);
});
