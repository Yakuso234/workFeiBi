const test=require('node:test');
const assert=require('node:assert/strict');
const raster=require('../src/raster-motion');
const source=(name)=>`file:///C:/work/assets/images/${name}.png`;
const front=(character='phoebe',outfit=1)=>raster.sourceProfile(source(character==='phoebe'?`phoebe_${outfit}`:'nuonuo_front'),character,outfit);
const point=(definition,pose,x,y,elapsedMs=430,reducedMotion=false)=>raster.displacePoint({x,y},{profile:definition,pose,elapsedMs,reducedMotion});

test('局部动作只适配固定本地图与对应角色/衣服，未知或网络素材不借用模型',()=>{
  assert.equal(Object.keys(raster.profiles).length,12);
  for(const definition of Object.values(raster.profiles)){
    assert.ok(Object.isFrozen(definition)&&Object.isFrozen(definition.regions)&&Object.isFrozen(definition.locks));
  }
  assert.equal(raster.sourceProfile('../assets/images/phoebe_1.png','phoebe',1).id,'phoebe_1');
  assert.equal(raster.sourceProfile(source('nuonuo_front'),'nuonuo').id,'nuonuo_front');
  assert.equal(raster.sourceProfile(source('phoebe_wave'),'phoebe',0),null);
  assert.equal(raster.sourceProfile(source('phoebe_angry'),'phoebe',2),null);
  assert.equal(raster.sourceProfile(source('phoebe_1'),'nuonuo'),null);
  for(const value of ['https://x/assets/images/phoebe_1.png','data:image/png;base64,x','blob:local',source('constructor'),'../other/phoebe_1.png','../assets/images/phoebe_1.png?random=1',null]){
    assert.equal(raster.sourceProfile(value,'phoebe',1),null);
  }
});

test('手、脚、伸展动作不同，踢脚不牵动手臂或脸部，眨眼仍由旧叠层负责',()=>{
  for(const character of ['phoebe','nuonuo']){
    const definition=front(character),arm=definition.regions.arms.left,foot=definition.regions.feet.left;
    const limb={x:arm.x,y:arm.y},shoe={x:foot.x,y:foot.y};
    assert.notDeepEqual(point(definition,'wave',limb.x,limb.y),limb);
    assert.deepEqual(point(definition,'kick',limb.x,limb.y),limb);
    assert.notDeepEqual(point(definition,'kick',shoe.x,shoe.y),shoe);
    assert.deepEqual(point(definition,'wave',shoe.x,shoe.y),shoe);
    assert.notDeepEqual(point(definition,'stretch',limb.x,limb.y),limb);
    assert.deepEqual(point(definition,'stretch',shoe.x,shoe.y),shoe);
    assert.deepEqual(point(definition,'blink',limb.x,limb.y),limb);
    assert.deepEqual(point(definition,'kick',shoe.x,shoe.y,430,true),shoe);
    for(const pose of ['idle','wave','kick','stretch','angry'])for(const time of [0,150,430,1800]){
      for(const p of [{x:220,y:210},{x:282,y:250},{x:255,y:280},{x:250,y:100}])assert.deepEqual(point(definition,pose,p.x,p.y,time),p);
    }
  }
});

test('抬手图和生气图只有对应手区域变动，脸眼/帽顶纹理严格不偏移',()=>{
  for(const character of ['phoebe','nuonuo'])for(const pose of ['wave','angry']){
    const definition=raster.sourceProfile(source(`${character}_${pose}`),character,1);
    const hand=pose==='angry'?definition.regions.fist:definition.regions.arms.left;
    const center={x:hand.x,y:hand.y};
    assert.notDeepEqual(point(definition,pose,center.x,center.y),center);
    for(const lock of definition.locks){
      const p={x:(lock.left+lock.right)/2,y:(lock.top+lock.bottom)/2};
      for(const time of [0,150,430,1800])assert.deepEqual(point(definition,pose,p.x,p.y,time),p);
    }
  }
});

test('开心和小跳仅摆动或收起双脚，头脸手臂不跟着跳且单次hop回到原位',()=>{
  for(const character of ['phoebe','nuonuo']){
    const definition=front(character),left=definition.regions.feet.left,right=definition.regions.feet.right;
    for(const pose of ['happy','hop']){
      assert.equal(raster.animatedForPose(definition,pose),true);
      for(const foot of [left,right]){
        const original={x:foot.x,y:foot.y},moved=point(definition,pose,foot.x,foot.y,400);
        assert.notDeepEqual(moved,original);
        assert.ok(moved.y<=foot.y&&foot.y-moved.y<=8);
        assert.deepEqual(point(definition,pose,foot.x,foot.y,0),original);
        assert.deepEqual(point(definition,pose,foot.x,foot.y,400,true),original);
      }
      for(const time of [0,150,400,800,1400]){
        for(const arm of [definition.regions.arms.left,definition.regions.arms.right])assert.deepEqual(point(definition,pose,arm.x,arm.y,time),{x:arm.x,y:arm.y});
        for(const face of [{x:250,y:100},{x:195,y:220},{x:288,y:220},{x:250,y:280}])assert.deepEqual(point(definition,pose,face.x,face.y,time),face);
        for(const {target}of raster.meshFor(definition,pose,time))assert.ok(target.x>=0&&target.x<=512&&target.y>=0&&target.y<=512);
      }
    }
    for(const time of [1100,1400,3800])for(const foot of [left,right])assert.deepEqual(point(definition,'hop',foot.x,foot.y,time),{x:foot.x,y:foot.y});
    for(const pose of ['happy','hop'])for(const name of ['wave','angry','back'])assert.equal(raster.animatedForPose(raster.sourceProfile(source(`${character}_${name}`),character),pose),false);
  }
});

test('look与sway让整个头近刚性微转，五官距离不被独立挤压',()=>{
  for(const character of ['phoebe','nuonuo']){
    const definition=front(character),a={x:190,y:220},b={x:288,y:220};
    for(const pose of ['look','sway']){
      const da=point(definition,pose,a.x,a.y),db=point(definition,pose,b.x,b.y);
      assert.notDeepEqual(da,a);
      assert.ok(Math.abs(Math.hypot(db.x-da.x,db.y-da.y)-98)<1e-9);
      assert.deepEqual(point(definition,pose,255,480),{x:255,y:480});
    }
    assert.notDeepEqual(point(definition,'look',a.x,a.y),point(definition,'sway',a.x,a.y));
  }
});

test('所有动作坐标、位移和网格大小有限，边缘不向画布外拉伸',()=>{
  assert.equal(raster.GRID_SIZE,16);assert.equal(raster.FRAME_MS,1000/24);
  for(const definition of Object.values(raster.profiles))for(const pose of ['idle','wave','kick','stretch','look','sway','angry','happy','hop']){
    for(const time of [0,420,2100,Infinity,NaN,-10]){
      const mesh=raster.meshFor(definition,pose,time);
      assert.equal(mesh.length,289);
      for(const {source:s,target:p}of mesh){
        assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
        assert.ok(p.x>=0&&p.x<=512&&p.y>=0&&p.y<=512);
        assert.ok(Math.abs(s.x-p.x)<=14&&Math.abs(s.y-p.y)<=14);
        if(s.x===0||s.y===0||s.x===512||s.y===512)assert.deepEqual(p,s);
      }
    }
  }
  assert.equal(raster.displacePoint({x:NaN,y:1}),null);
  assert.deepEqual(raster.displacePoint({x:-3,y:520}),{x:0,y:512});
});

test('背面、困倦、减少动态以及未知动作都静止，不伪造作者连续帧',()=>{
  for(const [name,character]of [['phoebe_sleep','phoebe'],['phoebe_back','phoebe'],['nuonuo_drowsy','nuonuo'],['nuonuo_back','nuonuo']]){
    const definition=raster.sourceProfile(source(name),character);
    for(const pose of ['idle','sleep','turn','wave','kick','look','angry']){
      assert.equal(raster.animatedForPose(definition,pose),false);
      assert.deepEqual(point(definition,pose,200,440),{x:200,y:440});
    }
  }
  for(const pose of ['',null,'still','constructor','unknown','sleep','turn','blink'])assert.equal(raster.animatedForPose(front(),pose),false);
  assert.equal(raster.animatedForPose(front(),'wave',true),false);
});

test('命中坐标遵循方形contain区域，不把透明留白当作角色',()=>{
  const bounds={left:10,top:20,width:300,height:500};
  assert.deepEqual(raster.canvasPoint(bounds,160,270),{x:512,y:512});
  assert.equal(raster.canvasPoint(bounds,160,110),null);
  assert.equal(raster.canvasPoint(bounds,310,270),null);
  assert.equal(raster.canvasPoint(bounds,160,450),null);
  assert.equal(raster.canvasPoint({...bounds,width:0},160,270),null);
  assert.equal(raster.canvasPoint(bounds,NaN,270),null);
});

function fixture({hidden=false,deferred=false}={}){
  let now=0,wall=100000,nextFrame=0,drawn='',clears=0,draws=0,sourceValue=source('phoebe_1');
  const frames=new Map(),imageListeners=new Map(),documentListeners=new Map(),pending=[];
  const image={complete:true,naturalWidth:500,naturalHeight:500,currentSrc:sourceValue,
    get src(){return sourceValue;},set src(value){sourceValue=value;this.complete=false;},
    decode(){return deferred?new Promise((resolve,reject)=>pending.push({resolve,reject,source:sourceValue})):Promise.resolve();},
    addEventListener(name,fn){imageListeners.set(name,fn);},removeEventListener(name){imageListeners.delete(name);},
  };
  const context={clearRect(){clears++;},drawImage(img){drawn=img.src;draws++;},save(){},restore(){},setTransform(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},getImageData(x,y,width,height){assert.equal(width,1);assert.equal(height,1);return {data:[0,0,0,x>300&&y>300?255:0]};}};
  const canvas={dataset:{},style:{},isConnected:false,setAttribute(){},getContext(){return context;},getBoundingClientRect(){return {left:0,top:0,width:512,height:512};},remove(){this.isConnected=false;}};
  const doc={hidden:false,createElement(){return canvas;},addEventListener(name,fn){documentListeners.set(name,fn);},removeEventListener(name){documentListeners.delete(name);}};
  doc.defaultView={performance:{now:()=>now},Date:{now:()=>wall},requestAnimationFrame(fn){frames.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame(id){frames.delete(id);}};
  const container={hidden,ownerDocument:doc,appendChild(){canvas.isConnected=true;}};
  return {canvas,image,doc,container,pending,frames,imageListeners,documentListeners,
    get drawn(){return drawn;},get draws(){return draws;},get clears(){return clears;},
    advance(value){wall+=value-now;now=value;const ready=[...frames.values()];frames.clear();for(const fn of ready)fn(now);},
    async settle(){await new Promise(resolve=>setImmediate(resolve));},
    async load(value){image.src=value;image.currentSrc=value;image.complete=true;image.naturalWidth=1254;image.naturalHeight=1254;imageListeners.get('load')?.();await this.settle();},
  };
}
const pose=(name,extra={})=>({pose:name,character:'phoebe',outfit:1,startedAt:100000,...extra});

test('同姿势重复paint不重置时间，24fps节流，减少动态不留RAF任务',async()=>{
  const f=fixture(),player=raster.create(f.container,{image:f.image});await f.settle();
  player.setPose(pose('wave'));await f.settle();
  assert.equal(player.canvas.dataset.ready,'true');assert.equal(f.frames.size,1);
  f.advance(10);assert.equal(player.canvas.dataset.frame,'1');
  const priorDraws=f.draws;
  f.advance(50);assert.equal(player.canvas.dataset.frame,'2');
  assert.ok(f.draws-priorDraws<100,'a local wave must not redraw all 512 mesh triangles');
  const before=f.draws,stamp=player.canvas.dataset.lastPaintMs;
  player.setPose(pose('wave'));player.setVisible(true);player.refresh();
  assert.equal(f.draws,before);assert.equal(player.canvas.dataset.lastPaintMs,stamp);
  f.advance(100);assert.equal(player.canvas.dataset.frame,'3');
  player.setPose(pose('wave',{startedAt:100100}));assert.equal(player.canvas.dataset.frame,'1');
  player.setPose(pose('wave',{reducedMotion:true}));assert.equal(f.frames.size,0);assert.equal(player.canvas.dataset.animated,'false');
  const reducedFrame=player.canvas.dataset.frame,staticPaint=f.draws;f.advance(1000);player.setPose(pose('wave',{reducedMotion:true}));player.refresh();
  assert.equal(player.canvas.dataset.frame,reducedFrame);assert.equal(f.draws,staticPaint);
  assert.equal(player.hitTest(256,256),true);assert.equal(player.hitTest(20,20),false);
  player.destroy();assert.equal(f.frames.size,0);assert.equal(f.imageListeners.size,0);assert.equal(f.documentListeners.size,0);
});

test('素材src变更先清屏，不用旧角色像素命中，旧decode结束不能覆盖新图',async()=>{
  const f=fixture({deferred:true}),player=raster.create(f.container,{image:f.image});
  const old=f.pending.at(-1);
  player.setPose(pose('wave'));
  f.image.src=source('nuonuo_front');
  player.setPose(pose('kick',{character:'nuonuo'}));
  assert.equal(player.canvas.dataset.ready,'false');assert.equal(player.hitTest(256,256),false);assert.equal(f.frames.size,0);
  await f.load(source('nuonuo_front'));const current=f.pending.at(-1);
  old.resolve();await f.settle();assert.equal(f.drawn,'');assert.equal(player.canvas.dataset.ready,'false');
  current.resolve();await f.settle();assert.match(f.drawn,/nuonuo_front/);assert.equal(player.canvas.dataset.ready,'true');
  assert.equal(player.canvas.dataset.character,'nuonuo');assert.equal(f.frames.size,1);
  player.destroy();
});

test('src改变但currentSrc还是旧图时不能提前decode或绘制旧像素',async()=>{
  const f=fixture(),player=raster.create(f.container,{image:f.image});await f.settle();
  player.setPose(pose('wave'));const before=f.draws;
  f.image.src=source('phoebe_2');f.image.complete=true;
  player.setPose(pose('wave',{outfit:2}));await f.settle();
  assert.equal(player.canvas.dataset.ready,'false');assert.equal(f.draws,before);assert.equal(f.frames.size,0);
  await f.load(source('phoebe_2'));
  assert.equal(player.canvas.dataset.profile,'phoebe_2');assert.equal(player.canvas.dataset.ready,'true');
  player.destroy();
});

test('隐藏、文档后台和销毁均停止动作，不接受迟到的解码结果',async()=>{
  const f=fixture({deferred:true}),player=raster.create(f.container,{image:f.image});player.setPose(pose('idle'));
  const pending=f.pending.at(-1);player.setVisible(false);pending.resolve();await f.settle();
  assert.equal(f.draws,0);assert.equal(f.frames.size,0);assert.equal(player.canvas.dataset.ready,'false');
  player.setVisible(true);await f.settle();assert.ok(f.draws>0);assert.equal(f.frames.size,1);
  f.doc.hidden=true;f.documentListeners.get('visibilitychange')();assert.equal(f.frames.size,0);assert.equal(player.hitTest(256,256),false);
  f.doc.hidden=false;f.documentListeners.get('visibilitychange')();assert.equal(f.frames.size,1);
  await f.load(source('phoebe_wave'));const late=f.pending.at(-1);player.destroy();const count=f.draws;late.resolve();await f.settle();
  assert.equal(f.draws,count);assert.equal(f.frames.size,0);assert.equal(player.canvas.isConnected,false);
});

test('静态背面和图片解码失败会清屏停机，不循环重试或取得整幅像素',async()=>{
  const f=fixture({deferred:true}),player=raster.create(f.container,{image:f.image});
  f.pending.at(-1).reject(new Error('bad image'));await f.settle();
  assert.equal(player.canvas.dataset.error,'decode-failed');assert.equal(f.frames.size,0);assert.equal(player.hitTest(256,256),false);
  await f.load(source('phoebe_back'));player.setPose(pose('turn'));f.pending.at(-1).resolve();await f.settle();
  assert.equal(player.canvas.dataset.ready,'true');assert.equal(player.canvas.dataset.animated,'false');assert.equal(f.frames.size,0);
  const count=f.draws;player.setPose(pose('turn'));player.refresh();f.advance(2000);assert.equal(f.draws,count);
  f.imageListeners.get('error')();assert.equal(player.canvas.dataset.ready,'false');assert.equal(player.canvas.dataset.error,'image-unavailable');
  player.destroy();
});
