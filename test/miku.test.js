const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const miku=require('../src/miku');

test('初音只暴露实际接入的9轨40帧，白名单和嵌套清单不可修改',()=>{
  assert.deepEqual(Object.keys(miku.frameManifest),['idle','happy','blink1','blink2','sleep','angry','scratch','drag','standup']);
  assert.deepEqual(Object.values(miku.frameManifest).map(track=>track.frames.length),[4,3,2,2,4,3,6,7,9]);
  assert.equal(miku.assetFiles.length,40);
  assert.equal(new Set(miku.assetFiles).size,40);
  assert.ok(Object.isFrozen(miku)&&Object.isFrozen(miku.frameManifest)&&Object.isFrozen(miku.assetFiles));
  for(const track of Object.values(miku.frameManifest))assert.ok(Object.isFrozen(track)&&Object.isFrozen(track.frames));
  assert.equal(miku.getFramePath('sleep',0),'thumb/sleep/miku-pet-sleep4.webp');
  assert.equal(miku.getFramePath('standup',8),'thumb/standup/miku-pet-yun9.webp');
  assert.equal(miku.CACHE_LIMIT,16);
});

test('白名单40帧都是本地真实WebP文件，不包含上游未下载的玩法轨道',()=>{
  for(const asset of miku.assetFiles){
    assert.match(asset,/^thumb\/(?:idle|happy|blink1|blink2|sleep|angry|scratch|drag|standup)\/miku-pet-[a-z]+\d+\.webp$/);
    const bytes=fs.readFileSync(path.join(__dirname,'../assets/miku',asset));
    assert.equal(bytes.subarray(0,4).toString(),'RIFF');
    assert.equal(bytes.subarray(8,12).toString(),'WEBP');
  }
  for(const name of ['eat','work','shop','flirty','shy','success','sleep-intro','back','../../x','__proto__']){
    assert.equal(miku.getFramePath(name,0),null);
  }
  for(const index of [-1,4,Infinity,NaN,0.5,'0',null])assert.equal(miku.getFramePath('idle',index),null);
});

test('动作对应原始帧轨，缺失背面和未知名称使用静态idle',()=>{
  const expected={idle:'idle',blink:'blink1',wave:'scratch',kick:'happy',happy:'happy',hop:'happy',stretch:'standup',look:'blink2',sway:'blink2',sleep:'sleep',angry:'angry',lifted:'drag'};
  for(const [pose,track]of Object.entries(expected)){
    assert.deepEqual(miku.selectPose(pose),{pose,track,staticFrame:false});
    assert.deepEqual(miku.selectPose(pose,true),{pose,track,staticFrame:true});
  }
  for(const pose of ['',null,undefined,'turn','still','constructor','__proto__','https://example.com/x.webp',{},['sleep']]){
    assert.deepEqual(miku.selectPose(pose),{pose:'still',track:'idle',staticFrame:true});
  }
});

test('帧索引采用200ms边界，循环与一次动作的末帧处理不同',()=>{
  assert.equal(miku.FRAME_MS,200);
  assert.equal(miku.frameIndex('idle',0),0);
  assert.equal(miku.frameIndex('idle',199),0);
  assert.equal(miku.frameIndex('idle',200),1);
  assert.equal(miku.frameIndex('idle',799),3);
  assert.equal(miku.frameIndex('idle',800),0);
  assert.equal(miku.frameIndex('drag',1399),6);
  assert.equal(miku.frameIndex('drag',1400),0);
  assert.equal(miku.frameIndex('sleep',800),0);
  assert.equal(miku.frameIndex('angry',599),2);
  assert.equal(miku.frameIndex('angry',600),2);
  assert.equal(miku.frameIndex('scratch',900),4);
  for(const value of [-100,NaN,Infinity,'200'])assert.equal(miku.frameIndex('idle',value),0);
});

test('一次动作按实际轨道长度完成，再从idle第一帧继续',()=>{
  assert.deepEqual(miku.frameSelection('happy',599),{track:'happy',frame:2,finished:false});
  assert.deepEqual(miku.frameSelection('happy',600),{track:'idle',frame:0,finished:true});
  assert.deepEqual(miku.frameSelection('happy',800),{track:'idle',frame:1,finished:true});
  assert.deepEqual(miku.frameSelection('happy',1400),{track:'idle',frame:0,finished:true});
  assert.deepEqual(miku.frameSelection('blink1',399),{track:'blink1',frame:1,finished:false});
  assert.deepEqual(miku.frameSelection('blink1',400),{track:'idle',frame:0,finished:true});
  assert.deepEqual(miku.frameSelection('standup',1799),{track:'standup',frame:8,finished:false});
  assert.deepEqual(miku.frameSelection('standup',1800),{track:'idle',frame:0,finished:true});
  assert.deepEqual(miku.frameSelection('unknown',200),{track:'idle',frame:1,finished:false});
  assert.deepEqual(miku.frameSelection('angry',599),{track:'angry',frame:2,finished:false});
  assert.deepEqual(miku.frameSelection('angry',600),{track:'angry',frame:2,finished:true});
  assert.deepEqual(miku.frameSelection('angry',10000),{track:'angry',frame:2,finished:true});
});

test('减少动态或idle关闭后可停在第一帧，不偷偷进入fallback循环',()=>{
  for(const track of Object.keys(miku.frameManifest)){
    for(const time of [0,200,5000,1000000]){
      assert.equal(miku.frameIndex(track,time,true),0);
      assert.deepEqual(miku.frameSelection(track,time,true),{track,frame:0,finished:false});
    }
  }
});

test('alpha命中坐标遵循居中的方形contain区域，透明侧边不变成命中区域',()=>{
  assert.equal(miku.CANVAS_SIZE,1024);
  const tall={left:10,top:20,width:300,height:500};
  assert.equal(miku.canvasPoint(tall,160,50),null);
  assert.equal(miku.canvasPoint(tall,160,450),null);
  assert.deepEqual(miku.canvasPoint(tall,10,120),{x:0,y:0});
  assert.deepEqual(miku.canvasPoint(tall,160,270),{x:512,y:512});
  assert.equal(miku.canvasPoint(tall,310,270),null);
  const wide={left:10,top:20,width:800,height:200};
  assert.equal(miku.canvasPoint(wide,150,120),null);
  assert.deepEqual(miku.canvasPoint(wide,310,20),{x:0,y:0});
  assert.deepEqual(miku.canvasPoint(wide,410,120),{x:512,y:512});
  assert.deepEqual(miku.canvasPoint(wide,509.99,219.99),{x:1023,y:1023});
  for(const rect of [null,{left:0,top:0,width:0,height:20},{left:0,top:0,width:20,height:-1},{left:NaN,top:0,width:20,height:20}]){
    assert.equal(miku.canvasPoint(rect,0,0),null);
  }
  assert.equal(miku.canvasPoint(wide,Infinity,120),null);
});

// A small controlled browser boundary: loads finish only when requested by the
// test, so late decodes and hidden-window cancellation are deterministic.
function browserFixture(hidden=false){
  const pending=[],frames=new Map(),listeners=new Map();let now=0,nextFrame=0;
  const pixels=new Uint8ClampedArray(1024*1024*4);let drawn='';
  class Image {
    constructor(){this.naturalWidth=1024;this.naturalHeight=1024;}
    set src(value){this.url=value;pending.push(this);}
    decode(){return Promise.resolve();}
  }
  const context={
    clearRect(){pixels.fill(0);},
    drawImage(image){drawn=image.url;pixels[(512*1024+512)*4+3]=255;},
    getImageData(){return {data:pixels};},
  };
  const canvas={dataset:{},style:{},isConnected:false,setAttribute(){},getContext(){return context;},
    getBoundingClientRect(){return {left:0,top:0,width:300,height:500};},remove(){this.isConnected=false;}};
  const doc={hidden:false,createElement(){return canvas;},addEventListener(name,fn){listeners.set(name,fn);},removeEventListener(name){listeners.delete(name);}};
  doc.defaultView={Image,performance:{now:()=>now},requestAnimationFrame(fn){frames.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame(id){frames.delete(id);}};
  const container={hidden,ownerDocument:doc,appendChild(){canvas.isConnected=true;}};
  return {canvas,container,doc,pending,frames,listeners,get drawn(){return drawn;},
    advance(value){now=value;const ready=[...frames.values()];frames.clear();for(const fn of ready)fn(now);},
    async finish(image=pending.at(-1)){if(image?.onload)image.onload();await new Promise(resolve=>setImmediate(resolve));},
  };
}

test('重复paint和可见状态不重置帧时钟，静止姿势取消RAF',async()=>{
  const fixture=browserFixture(),player=miku.create(fixture.container);
  assert.equal(fixture.pending.length,1);
  assert.equal(fixture.frames.size,0);
  await fixture.finish();
  assert.equal(player.canvas.dataset.track,'idle');
  assert.equal(player.canvas.dataset.frame,'0');
  assert.equal(player.hitTest(150,250),true);
  assert.equal(player.hitTest(150,50),false);
  assert.equal(player.hitTest(0,100),false);
  player.setPose('idle');await fixture.finish();
  fixture.advance(199);assert.equal(fixture.pending.length,1);
  fixture.advance(200);assert.match(fixture.pending.at(-1).url,/stop2\.webp$/);
  fixture.advance(250);player.setPose('idle');player.setVisible(true);
  fixture.advance(400);assert.match(fixture.pending.at(-1).url,/stop3\.webp$/);
  await fixture.finish();assert.equal(player.canvas.dataset.frame,'2');
  player.setPose('sleep',true);
  assert.equal(fixture.frames.size,0);await fixture.finish();
  assert.equal(player.canvas.dataset.track,'sleep');
  const before=fixture.pending.length;fixture.advance(9000);
  assert.equal(fixture.pending.length,before);
  assert.equal(player.canvas.dataset.frame,'0');
  player.destroy();assert.equal(fixture.frames.size,0);
});

test('延迟解码不能覆盖新姿势，隐藏或销毁后不再绘制和调度',async()=>{
  const fixture=browserFixture(true),player=miku.create(fixture.container);
  player.setPose('sleep');assert.equal(fixture.pending.length,0);assert.equal(fixture.frames.size,0);
  fixture.container.hidden=false;player.setVisible(true);
  const oldSleep=fixture.pending.at(-1);
  player.setPose('angry');const current=fixture.pending.at(-1);
  await fixture.finish(oldSleep);assert.equal(fixture.drawn,'');
  await fixture.finish(current);assert.match(fixture.drawn,/angry1\.webp$/);
  player.setPose('wave');const lateWave=fixture.pending.at(-1);
  player.setVisible(false);await fixture.finish(lateWave);
  assert.match(fixture.drawn,/angry1\.webp$/);assert.equal(fixture.frames.size,0);assert.equal(player.hitTest(150,250),false);
  player.setVisible(true);await fixture.finish();assert.match(fixture.drawn,/stand1\.webp$/);
  player.setPose('');const lateIdle=fixture.pending.at(-1);
  player.destroy();await fixture.finish(lateIdle);
  assert.equal(player.canvas.isConnected,false);assert.equal(player.canvas.dataset.cacheSize,'0');
  assert.equal(fixture.frames.size,0);assert.equal(fixture.listeners.size,0);
  assert.match(fixture.drawn,/stand1\.webp$/);
});

test('持续生气播放一次后保留原始气鼓鼓末帧，直到提醒确认或换动作',async()=>{
  const fixture=browserFixture(),player=miku.create(fixture.container);await fixture.finish();
  player.setPose('angry');await fixture.finish();
  fixture.advance(200);await fixture.finish();fixture.advance(400);await fixture.finish();
  assert.equal(player.canvas.dataset.track,'angry');assert.equal(player.canvas.dataset.frame,'2');
  fixture.advance(600);await fixture.finish();
  assert.equal(fixture.frames.size,0);
  player.setPose('angry');fixture.advance(10000);
  assert.equal(player.canvas.dataset.track,'angry');assert.equal(player.canvas.dataset.frame,'2');
  assert.equal(fixture.frames.size,0);
  player.setPose('');await fixture.finish();
  assert.equal(player.canvas.dataset.track,'idle');assert.equal(player.canvas.dataset.frame,'0');
  player.destroy();
});

test('不同轨道解码缓存有16项上限，文档隐藏也停止RAF',async()=>{
  const fixture=browserFixture(),player=miku.create(fixture.container);await fixture.finish();
  let start=0;
  for(const pose of ['idle','happy','blink','look','sleep','angry','wave','lifted','stretch']){
    fixture.advance(start);player.setPose(pose);await fixture.finish();
    const track=miku.selectPose(pose).track;
    for(let frame=1;frame<miku.frameManifest[track].frames.length;frame++){
      fixture.advance(start+frame*200);await fixture.finish();
      assert.ok(Number(player.canvas.dataset.cacheSize)<=16);
    }
    start+=2000;
  }
  assert.equal(player.canvas.dataset.cacheSize,'16');
  assert.ok(fixture.frames.size>0);
  fixture.doc.hidden=true;fixture.listeners.get('visibilitychange')();
  assert.equal(fixture.frames.size,0);
  const before=fixture.pending.length;fixture.advance(start+5000);assert.equal(fixture.pending.length,before);
  fixture.doc.hidden=false;fixture.listeners.get('visibilitychange')();assert.ok(fixture.frames.size>0);
  player.destroy();
});

test('丢失动作帧回落idle，idle缺失时停止重试而不刷日志',async()=>{
  const fixture=browserFixture(true),player=miku.create(fixture.container);
  player.setPose('sleep');fixture.container.hidden=false;player.setVisible(true);
  fixture.pending.at(-1).onerror();await new Promise(resolve=>setImmediate(resolve));
  assert.match(fixture.pending.at(-1).url,/idle\/miku-pet-stop1\.webp$/);
  fixture.pending.at(-1).onerror();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(player.canvas.dataset.error,'asset-unavailable');assert.equal(fixture.frames.size,0);
  const before=fixture.pending.length;fixture.advance(100000);
  assert.equal(fixture.pending.length,before);assert.equal(player.hitTest(150,250),false);
  player.destroy();
});
