// Procedural motion of the existing illustrations, not additional author frames.
// No pixels or assets are edited or downloaded. Only calibrated local regions
// move; the normal blink overlay is owned by pet.js.
(function(scope,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else scope.RasterPetMotion=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  const DESIGN_SIZE=512,CANVAS_SIZE=1024,GRID_SIZE=16,FRAME_MS=1000/24;
  const finite=value=>typeof value==='number'&&Number.isFinite(value);
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const rect=(left,top,right,bottom)=>Object.freeze({left,top,right,bottom});
  const region=(x,y,rx,ry)=>Object.freeze({x,y,rx,ry});
  const arms=(left,right)=>Object.freeze({left,right});
  const profile=(id,character,kind,regions,locks,headBottom,neck)=>Object.freeze({id,character,kind,regions:Object.freeze(regions),locks:Object.freeze(locks),headBottom,neck:Object.freeze(neck)});
  // Coordinates are 512-square contain coordinates, calibrated from each image.
  // The small 500px original Phoebe outfits contain intentional top padding.
  const frontPhoebe=outfit=>profile(`phoebe_${outfit}`,'phoebe','front',{
    arms:arms(region(199,445,34,37),region(341,447,35,36)),
    feet:arms(region(198,481,44,27),region(282,486,45,24)),
  },[rect(0,0,512,392)],392,{x:252,y:391});
  const profiles=Object.freeze({
    'phoebe_0.png':frontPhoebe(0),'phoebe_1.png':frontPhoebe(1),'phoebe_2.png':frontPhoebe(2),
    'phoebe_wave.png':profile('phoebe_wave','phoebe','wave',{
      arms:arms(region(157,305,53,53),region(329,362,43,45)),
      feet:arms(region(187,390,45,37),region(244,431,41,33)),
    },[rect(0,0,512,271),rect(185,271,512,310)],310,{x:248,y:300}),
    'phoebe_angry.png':profile('phoebe_angry','phoebe','angry',{
      fist:region(125,304,58,50),
      arms:arms(region(135,319,57,57),region(282,411,43,44)),
      feet:arms(region(164,418,43,36),region(375,418,42,37)),
    },[rect(0,0,512,257),rect(160,257,512,334)],334,{x:255,y:326}),
    'nuonuo_front.png':profile('nuonuo_front','nuonuo','front',{
      arms:arms(region(153,392,46,55),region(337,394,42,57)),
      feet:arms(region(207,467,38,31),region(280,467,38,31)),
    },[rect(0,0,512,305)],305,{x:254,y:302}),
    'nuonuo_wave.png':profile('nuonuo_wave','nuonuo','wave',{
      arms:arms(region(129,304,48,75),region(321,327,43,47)),
      feet:arms(region(198,444,40,41),region(273,468,35,30)),
    },[rect(0,0,512,260),rect(162,260,512,311)],311,{x:256,y:302}),
    'nuonuo_angry.png':profile('nuonuo_angry','nuonuo','angry',{
      fist:region(125,298,58,63),
      arms:arms(region(144,319,57,58),region(274,429,47,36)),
      feet:arms(region(158,445,44,31),region(371,441,38,35)),
    },[rect(0,0,512,251),rect(166,251,512,326)],326,{x:255,y:315}),
    'phoebe_sleep.png':profile('phoebe_sleep','phoebe','static',{},[],392,{x:252,y:391}),
    'phoebe_back.png':profile('phoebe_back','phoebe','static',{},[],392,{x:252,y:391}),
    'nuonuo_drowsy.png':profile('nuonuo_drowsy','nuonuo','static',{},[],305,{x:254,y:302}),
    'nuonuo_back.png':profile('nuonuo_back','nuonuo','static',{},[],305,{x:254,y:302}),
  });
  const movingPoses=Object.freeze(['idle','wave','kick','stretch','look','sway','angry','happy','hop']);
  function sourceProfile(source,character='phoebe',outfit=1){
    if(typeof source!=='string'||!['phoebe','nuonuo'].includes(character)||/^(?:https?:|data:|blob:)/i.test(source))return null;
    const match=source.replace(/\\/g,'/').match(/(?:^|\/)assets\/images\/([a-z0-9_]+\.png)$/);
    const found=match&&Object.hasOwn(profiles,match[1])?profiles[match[1]]:null;
    if(!found||found.character!==character)return null;
    // Outfit 0/2 must never borrow the generated white-hat raised-hand image.
    if(character==='phoebe'&&outfit!==1&&found.id!==`phoebe_${outfit}`)return null;
    return found;
  }
  const poseLocks=new WeakMap();
  function regionWeight(point,definition){
    if(!definition)return 0;
    const distance=((point.x-definition.x)/definition.rx)**2+((point.y-definition.y)/definition.ry)**2;
    return distance>=1?0:(1-distance)**2;
  }
  function animatedForPose(definition,pose,reducedMotion=false){
    return Boolean(definition&&definition.kind!=='static'&&!reducedMotion&&movingPoses.includes(pose)&&(pose!=='angry'||definition.regions.fist)&&(!['happy','hop'].includes(pose)||definition.kind==='front'));
  }
  function locksForPose(definition,pose){
    if(!definition)return [];
    if(pose==='look'||pose==='sway')return [];
    const feet=definition.regions.feet;
    if(!feet||!['kick','wave','stretch','happy','hop'].includes(pose))return definition.locks;
    if(!poseLocks.has(definition))poseLocks.set(definition,new Map());
    const cached=poseLocks.get(definition);if(cached.has(pose))return cached.get(pose);
    const footStart=Math.min(feet.left.y-feet.left.ry,feet.right.y-feet.right.ry);
    // Sleeve/foot supports touch in the seated illustration. An explicit
    // source-copy boundary keeps a foot kick from moving any wrist pixels,
    // and keeps a hand-only action from wobbling either shoe.
    const locks=Object.freeze([...definition.locks,['kick','happy','hop'].includes(pose)?rect(0,0,512,footStart):rect(0,footStart,512,512)]);
    cached.set(pose,locks);return locks;
  }
  function displacePoint(point,{profile:definition,pose='',elapsedMs=0,reducedMotion=false}={}){
    if(!point||!finite(point.x)||!finite(point.y))return null;
    const x=clamp(point.x,0,DESIGN_SIZE),y=clamp(point.y,0,DESIGN_SIZE),position={x,y};
    if(!animatedForPose(definition,pose,reducedMotion)||x===0||x===DESIGN_SIZE||y===0||y===DESIGN_SIZE)return position;
    const time=finite(elapsedMs)?Math.max(0,elapsedMs):0,t=time/1000;
    let dx=0,dy=0;
    if(pose==='look'||pose==='sway'){
      // One near-rigid head rotation. Eyes and mouth never get independent scale.
      const falloff=clamp((definition.headBottom+22-y)/34,0,1);
      const angle=Math.sin(t*(pose==='look'?2.4:3.1))*(pose==='look'?.015:.012)*falloff;
      const ox=x-definition.neck.x,oy=y-definition.neck.y;
      dx=ox*Math.cos(angle)-oy*Math.sin(angle)-ox;
      dy=ox*Math.sin(angle)+oy*Math.cos(angle)-oy;
    }else{
      if(locksForPose(definition,pose).some(box=>x>=box.left&&x<=box.right&&y>=box.top&&y<=box.bottom))return position;
      const regions=definition.regions,left=regionWeight(position,regions.arms?.left),right=regionWeight(position,regions.arms?.right);
      const leftFoot=regionWeight(position,regions.feet?.left),rightFoot=regionWeight(position,regions.feet?.right);
      if(pose==='wave'){
        dx=left*Math.sin(t*9)*8-right*Math.sin(t*5)*1.5;
        dy=-left*(1-Math.cos(t*9))*3;
      }else if(pose==='kick'){
        const lift=(1-Math.cos(t*6.5))/2;
        dx=leftFoot*Math.sin(t*6.5)*5;
        dy=-leftFoot*lift*12-rightFoot*(1-Math.cos(t*6.5+.6))*1.1;
      }else if(pose==='happy'){
        const fade=clamp(time/120,0,1),beat=t*6.5;
        dx=(leftFoot-rightFoot)*Math.sin(beat)*1.4*fade;
        dy=-(leftFoot*(1-Math.cos(beat))+rightFoot*(1-Math.cos(beat+Math.PI)))*3.5*fade;
      }else if(pose==='hop'){
        // One small toe-tuck pulse, not a translation of the character/head.
        const pulse=time>=1100?0:Math.sin(Math.PI*time/1100)**2;
        dx=(leftFoot-rightFoot)*pulse*1.8;
        dy=-(leftFoot+rightFoot)*pulse*7.5;
      }else if(pose==='stretch'){
        const reach=(1-Math.cos(t*3.9))/2;
        dx=(right-left)*reach*7;
        dy=-(left+right)*reach*6;
      }else if(pose==='angry'&&regions.fist){
        const punch=(1-Math.cos(t*10.5))/2,weight=regionWeight(position,regions.fist);
        dx=weight*punch*12;dy=-weight*Math.sin(t*10.5)*2.5;
      }else if(pose==='idle'){
        dx=left*Math.sin(t*2.1)*1.25-right*Math.sin(t*1.7)*1;
        dy=leftFoot*Math.sin(t*1.9)*1.2+rightFoot*Math.sin(t*1.3+.4)*.8;
      }
    }
    return {x:clamp(x+clamp(dx,-14,14),0,DESIGN_SIZE),y:clamp(y+clamp(dy,-14,14),0,DESIGN_SIZE)};
  }
  function meshFor(definition,pose,elapsedMs,reducedMotion=false){
    const vertices=[];
    for(let row=0;row<=GRID_SIZE;row++)for(let column=0;column<=GRID_SIZE;column++){
      const source={x:column*DESIGN_SIZE/GRID_SIZE,y:row*DESIGN_SIZE/GRID_SIZE};
      vertices.push({source,target:displacePoint(source,{profile:definition,pose,elapsedMs,reducedMotion})});
    }
    return vertices;
  }
  function canvasPoint(bounds,x,y){
    if(!bounds||![bounds.left,bounds.top,bounds.width,bounds.height,x,y].every(finite)||bounds.width<=0||bounds.height<=0)return null;
    const size=Math.min(bounds.width,bounds.height),left=bounds.left+(bounds.width-size)/2,top=bounds.top+(bounds.height-size)/2;
    if(x<left||y<top||x>=left+size||y>=top+size)return null;
    return {x:Math.floor((x-left)/size*CANVAS_SIZE),y:Math.floor((y-top)/size*CANVAS_SIZE)};
  }
  function create(container,{image}={}){
    if(!container?.ownerDocument||!image)throw new Error('缺少插画动作容器或原图');
    const doc=container.ownerDocument,view=doc.defaultView,canvas=doc.createElement('canvas');
    canvas.width=CANVAS_SIZE;canvas.height=CANVAS_SIZE;canvas.className='raster-motion-canvas';
    canvas.setAttribute('aria-hidden','true');
    Object.assign(canvas.style,{position:'absolute',inset:'0',margin:'auto',width:'100%',height:'100%',objectFit:'contain',pointerEvents:'none'});
    container.appendChild(canvas);
    const context=canvas.getContext('2d',{willReadFrequently:true});
    if(!context){canvas.remove();throw new Error('插画动作画布无法显示');}
    context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
    let visible=!container.hidden,destroyed=false,raf=null,generation=0,source='',decodedSource='',decodePending=null;
    let selected={pose:'',character:'phoebe',outfit:1,reducedMotion:false,startedAt:0},key='',definition=null,painted=false;
    let origin=0,elapsedBase=0,lastPaint=-Infinity,frame=0;
    const clock=()=>view.performance.now(),wallClock=()=>((view.Date||Date).now());
    const isVisible=()=>visible&&!destroyed&&!container.hidden&&!doc.hidden&&canvas.isConnected;
    const stop=()=>{if(raf!==null){view.cancelAnimationFrame(raf);raf=null;}};
    function clear(){context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,CANVAS_SIZE,CANVAS_SIZE);painted=false;canvas.dataset.ready='false';canvas.dataset.animated='false';}
    function currentSource(){return typeof image.src==='string'?image.src:'';}
    function matchingImage(){return image.complete&&image.naturalWidth>0&&image.naturalHeight>0&&(!image.currentSrc||image.currentSrc===source)&&currentSource()===source;}
    function syncSource(){
      const next=currentSource();
      if(next===source)return false;
      source=next;generation++;decodePending=null;decodedSource='';definition=sourceProfile(source,selected.character,selected.outfit);stop();clear();
      canvas.dataset.source=source;canvas.dataset.profile=definition?.id||'';canvas.dataset.error='';return true;
    }
    function drawTriangle(a,b,c){
      const sx=a.source.x,sy=a.source.y,ux=b.source.x-sx,uy=b.source.y-sy,vx=c.source.x-sx,vy=c.source.y-sy;
      const determinant=ux*vy-uy*vx;if(!determinant)return;
      const tx=a.target.x,ty=a.target.y,px=b.target.x-tx,py=b.target.y-ty,qx=c.target.x-tx,qy=c.target.y-ty;
      const aa=(px*vy-qx*uy)/determinant,cc=(qx*ux-px*vx)/determinant,bb=(py*vy-qy*uy)/determinant,dd=(qy*ux-py*vx)/determinant;
      const scale=CANVAS_SIZE/DESIGN_SIZE;
      context.save();context.setTransform(scale,0,0,scale,0,0);
      // A subpixel overlap hides antialiased triangle seams without expanding
      // the source's opaque outline by a visible desktop pixel.
      const center={x:(a.target.x+b.target.x+c.target.x)/3,y:(a.target.y+b.target.y+c.target.y)/3};
      const expanded=p=>{const length=Math.hypot(p.x-center.x,p.y-center.y)||1;return {x:p.x+(p.x-center.x)/length*.22,y:p.y+(p.y-center.y)/length*.22};};
      const pa=expanded(a.target),pb=expanded(b.target),pc=expanded(c.target);
      context.beginPath();context.moveTo(pa.x,pa.y);context.lineTo(pb.x,pb.y);context.lineTo(pc.x,pc.y);context.closePath();context.clip();
      context.setTransform(scale*aa,scale*bb,scale*cc,scale*dd,scale*(tx-aa*sx-cc*sy),scale*(ty-bb*sx-dd*sy));
      context.drawImage(image,0,0,DESIGN_SIZE,DESIGN_SIZE);context.restore();
    }
    function paint(now,force=false){
      if(!isVisible()||decodedSource!==source||!matchingImage()||!definition)return;
      const animated=animatedForPose(definition,selected.pose,selected.reducedMotion);
      if(painted&&!force&&(!animated||now-lastPaint<FRAME_MS))return;
      context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,CANVAS_SIZE,CANVAS_SIZE);context.drawImage(image,0,0,CANVAS_SIZE,CANVAS_SIZE);
      if(animated){
        const elapsed=elapsedBase+Math.max(0,now-origin),mesh=meshFor(definition,selected.pose,elapsed),cells=[];
        for(let row=0;row<GRID_SIZE;row++)for(let column=0;column<GRID_SIZE;column++){
          const index=row*(GRID_SIZE+1)+column,points=[mesh[index],mesh[index+1],mesh[index+GRID_SIZE+1],mesh[index+GRID_SIZE+2]];
          if(points.some(point=>Math.hypot(point.source.x-point.target.x,point.source.y-point.target.y)>.0001))cells.push({row,column,points});
        }
        // Clear just the moving cells before drawing their deformed source
        // triangles. This avoids both a stationary ghost limb and full-image
        // mesh seams. The original image is still used for every draw call.
        const cell=CANVAS_SIZE/GRID_SIZE;
        for(const item of cells)context.clearRect(item.column*cell,item.row*cell,cell,cell);
        for(const {points:p}of cells){drawTriangle(p[0],p[1],p[3]);drawTriangle(p[0],p[3],p[2]);}
        if(selected.pose!=='look'&&selected.pose!=='sway'){
          // Restore calibrated head/face zones byte-for-byte from the source,
          // including triangle cells straddling the neck or raised fist.
          context.setTransform(1,0,0,1,0,0);
          for(const lock of locksForPose(definition,selected.pose)){
            const scale=CANVAS_SIZE/DESIGN_SIZE,width=lock.right-lock.left,height=lock.bottom-lock.top;
            context.clearRect(lock.left*scale,lock.top*scale,width*scale,height*scale);
            context.drawImage(image,lock.left/DESIGN_SIZE*image.naturalWidth,lock.top/DESIGN_SIZE*image.naturalHeight,width/DESIGN_SIZE*image.naturalWidth,height/DESIGN_SIZE*image.naturalHeight,lock.left*scale,lock.top*scale,width*scale,height*scale);
          }
        }
      }
      painted=true;lastPaint=now;frame++;canvas.dataset.ready='true';canvas.dataset.animated=String(animated);canvas.dataset.frame=String(frame);canvas.dataset.lastPaintMs=String(now);canvas.dataset.error='';
    }
    function schedule(){if(raf===null&&isVisible()&&decodedSource===source&&animatedForPose(definition,selected.pose,selected.reducedMotion))raf=view.requestAnimationFrame(tick);}
    function tick(now){raf=null;if(destroyed)return;syncSource();if(decodedSource!==source){refresh();return;}paint(now);schedule();}
    function refresh(){
      if(destroyed)return;
      syncSource();definition=sourceProfile(source,selected.character,selected.outfit);
      canvas.dataset.profile=definition?.id||'';
      if(!isVisible()||!definition||!matchingImage()){stop();clear();return;}
      if(decodedSource===source){paint(clock());schedule();return;}
      if(decodePending)return;
      const token=generation,requested=source;
      const decoded=typeof image.decode==='function'?image.decode():Promise.resolve();
      const pending=Promise.resolve(decoded);decodePending=pending;
      pending.then(()=>{
        if(destroyed||token!==generation||requested!==source||!matchingImage())return;
        decodePending=null;decodedSource=requested;paint(clock(),true);schedule();
      },()=>{
        if(destroyed||token!==generation||requested!==source)return;
        decodePending=null;decodedSource='';stop();clear();canvas.dataset.error='decode-failed';
      });
    }
    function setPose(options={}){
      if(destroyed)return;
      const next={pose:typeof options.pose==='string'?options.pose:'',character:options.character==='nuonuo'?'nuonuo':options.character==='phoebe'?'phoebe':'',outfit:Number.isInteger(options.outfit)?options.outfit:1,reducedMotion:Boolean(options.reducedMotion),startedAt:finite(options.startedAt)&&options.startedAt>0?options.startedAt:0};
      const nextKey=JSON.stringify(next),sourceChanged=syncSource();
      if(nextKey===key&&!sourceChanged)return;
      const poseChanged=nextKey!==key;selected=next;key=nextKey;definition=sourceProfile(source,next.character,next.outfit);
      canvas.dataset.pose=next.pose;canvas.dataset.character=next.character;canvas.dataset.profile=definition?.id||'';
      if(poseChanged){origin=clock();elapsedBase=next.startedAt?clamp(wallClock()-next.startedAt,0,3600000):0;stop();painted=false;frame=0;}
      if(!definition){stop();clear();return;}
      if(decodedSource===source&&matchingImage()){paint(clock(),true);schedule();}else refresh();
    }
    function setVisible(next){
      if(destroyed||visible===Boolean(next))return;
      visible=Boolean(next);
      if(!visible){stop();clear();}else refresh();
    }
    function hitTest(x,y){
      if(!isVisible()||!painted||canvas.dataset.ready!=='true')return false;
      if(syncSource())return false;
      const point=canvasPoint(canvas.getBoundingClientRect(),x,y);if(!point)return false;
      try{return context.getImageData(point.x,point.y,1,1).data[3]>=20;}catch{return false;}
    }
    function failed(){generation++;decodePending=null;decodedSource='';stop();clear();canvas.dataset.error='image-unavailable';}
    function visibilityChanged(){if(!isVisible()){stop();clear();}else refresh();}
    const observer=typeof view.MutationObserver==='function'?new view.MutationObserver(()=>{if(syncSource())refresh();}):null;
    observer?.observe(image,{attributes:true,attributeFilter:['src']});
    image.addEventListener('load',refresh);image.addEventListener('error',failed);doc.addEventListener('visibilitychange',visibilityChanged);
    Object.assign(canvas.dataset,{ready:'false',pose:'',character:'phoebe',source:'',animated:'false',frame:'0',lastPaintMs:'0',profile:'',error:''});
    refresh();
    return Object.freeze({canvas,setPose,setVisible,hitTest,refresh,destroy(){if(destroyed)return;destroyed=true;generation++;decodePending=null;stop();clear();observer?.disconnect();image.removeEventListener('load',refresh);image.removeEventListener('error',failed);doc.removeEventListener('visibilitychange',visibilityChanged);canvas.remove();}});
  }
  return Object.freeze({create,sourceProfile,displacePoint,regionWeight,animatedForPose,locksForPose,meshFor,canvasPoint,profiles,DESIGN_SIZE,CANVAS_SIZE,GRID_SIZE,FRAME_MS});
});
