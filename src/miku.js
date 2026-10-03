// Fixed local frames only. Upstream pet.json also describes unshipped tracks;
// it is provenance metadata, never an executable or a dynamic asset manifest.
(function(scope,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else scope.MikuPet=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  const FRAME_MS=200,CANVAS_SIZE=1024,CACHE_LIMIT=16;
  const sequence=(track,prefix,first,count)=>Object.freeze(Array.from({length:count},(_,i)=>`thumb/${track}/miku-pet-${prefix}${first+i}.webp`));
  const track=(name,prefix,first,count,loop)=>Object.freeze({frames:sequence(name,prefix,first,count),loop,frameMs:FRAME_MS,fallback:loop?null:'idle'});
  const frameManifest=Object.freeze({
    idle:track('idle','stop',1,4,true),
    happy:track('happy','happy',1,3,false),
    blink1:track('blink1','closeeyes',1,2,false),
    blink2:track('blink2','closeeye',1,2,false),
    sleep:track('sleep','sleep',4,4,true),
    angry:track('angry','angry',1,3,false),
    scratch:track('scratch','stand',1,6,false),
    drag:track('drag','move',1,7,true),
    standup:track('standup','yun',1,9,false),
  });
  const assetFiles=Object.freeze(Object.values(frameManifest).flatMap(value=>value.frames));
  const poseTracks=Object.freeze({idle:'idle',blink:'blink1',wave:'scratch',kick:'happy',happy:'happy',hop:'happy',stretch:'standup',look:'blink2',sway:'blink2',sleep:'sleep',angry:'angry',lifted:'drag'});
  const validTrack=name=>typeof name==='string'&&Object.hasOwn(frameManifest,name);
  const elapsedMs=value=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,value):0;

  function selectPose(name='',reducedMotion=false){
    const valid=typeof name==='string'&&Object.hasOwn(poseTracks,name);
    return {pose:valid?name:'still',track:valid?poseTracks[name]:'idle',staticFrame:Boolean(reducedMotion)||!valid};
  }
  function frameIndex(name,elapsed=0,staticFrame=false){
    const definition=frameManifest[validTrack(name)?name:'idle'];
    if(staticFrame)return 0;
    const position=Math.floor(elapsedMs(elapsed)/FRAME_MS);
    return definition.loop?position%definition.frames.length:Math.min(position,definition.frames.length-1);
  }
  function frameSelection(name,elapsed=0,staticFrame=false){
    const selected=validTrack(name)?name:'idle',definition=frameManifest[selected],time=elapsedMs(elapsed);
    const finished=!staticFrame&&!definition.loop&&time>=definition.frames.length*FRAME_MS;
    // Keep the final angry face while an unacknowledged reminder is angry.
    // This is a playback policy; the upstream manifest and pixels stay intact.
    if(finished&&selected==='angry')return {track:'angry',frame:definition.frames.length-1,finished:true};
    return finished
      ?{track:'idle',frame:frameIndex('idle',time-definition.frames.length*FRAME_MS),finished:true}
      :{track:selected,frame:frameIndex(selected,time,staticFrame),finished:false};
  }
  function getFramePath(name,index){
    if(!validTrack(name)||!Number.isInteger(index)||index<0||index>=frameManifest[name].frames.length)return null;
    return frameManifest[name].frames[index];
  }
  function canvasPoint(rect,x,y){
    if(!rect||![rect.left,rect.top,rect.width,rect.height,x,y].every(Number.isFinite)||rect.width<=0||rect.height<=0)return null;
    const size=Math.min(rect.width,rect.height),left=rect.left+(rect.width-size)/2,top=rect.top+(rect.height-size)/2;
    if(x<left||y<top||x>=left+size||y>=top+size)return null;
    return {x:Math.min(CANVAS_SIZE-1,Math.floor((x-left)/size*CANVAS_SIZE)),y:Math.min(CANVAS_SIZE-1,Math.floor((y-top)/size*CANVAS_SIZE))};
  }

  function create(container){
    if(!container||!container.ownerDocument)throw new Error('缺少初音的显示容器');
    const doc=container.ownerDocument,view=doc.defaultView;
    const canvas=doc.createElement('canvas');
    canvas.width=CANVAS_SIZE;canvas.height=CANVAS_SIZE;canvas.className='miku-canvas';
    canvas.setAttribute('role','img');canvas.setAttribute('aria-label','初音未来 Q 版桌宠');
    Object.assign(canvas.style,{position:'absolute',inset:'0',margin:'auto',width:'100%',height:'100%',objectFit:'contain',pointerEvents:'none'});
    container.appendChild(canvas);
    const context=canvas.getContext('2d',{willReadFrequently:true});
    if(!context){canvas.remove();throw new Error('初音画布无法显示');}
    const cache=new Map(),failed=new Set();
    let selected=selectPose(),currentKey='',visible=!container.hidden,destroyed=false,raf=null,generation=0,paintSequence=0;
    let startedAt=0,requestedKey='',pixels=null,forceIdle=false,assetUnavailable=false;
    const clock=()=>view.performance.now();
    const isVisible=()=>visible&&!destroyed&&!container.hidden&&!doc.hidden&&canvas.isConnected;
    function stopFrame(){if(raf!==null){view.cancelAnimationFrame(raf);raf=null;}}
    function invalidate(){generation++;paintSequence++;requestedKey='';stopFrame();}
    function loadFrame(path){
      if(!assetFiles.includes(path))return Promise.resolve(null);
      if(failed.has(path))return Promise.resolve(null);
      if(cache.has(path)){
        const found=cache.get(path);cache.delete(path);cache.set(path,found);return found;
      }
      const image=new view.Image();image.decoding='async';
      const pending=new Promise(resolve=>{
        image.onerror=()=>{image.onload=null;failed.add(path);resolve(null);};
        image.onload=()=>{
          image.onload=null;image.onerror=null;
          if(image.naturalWidth!==CANVAS_SIZE||image.naturalHeight!==CANVAS_SIZE){failed.add(path);resolve(null);return;}
          const ready=typeof image.decode==='function'?image.decode():Promise.resolve();
          Promise.resolve(ready).then(()=>resolve(image),()=>{failed.add(path);resolve(null);});
        };
      });
      cache.set(path,pending);
      while(cache.size>CACHE_LIMIT)cache.delete(cache.keys().next().value);
      canvas.dataset.cacheSize=String(cache.size);
      image.src=`../assets/miku/${path}`;
      return pending;
    }
    function requestPaint(frame,now){
      const key=`${frame.track}:${frame.frame}`;
      if(requestedKey===key)return;
      requestedKey=key;
      const ownGeneration=generation,ownSequence=++paintSequence;
      loadFrame(getFramePath(frame.track,frame.frame)).then(image=>{
        if(!isVisible()||generation!==ownGeneration||paintSequence!==ownSequence)return;
        if(!image){
          if(frame.track!=='idle'){
            forceIdle=true;requestedKey='';startedAt=clock();requestPaint({track:'idle',frame:0},startedAt);return;
          }
          assetUnavailable=true;stopFrame();context.clearRect(0,0,CANVAS_SIZE,CANVAS_SIZE);pixels=null;
          canvas.dataset.error='asset-unavailable';return;
        }
        context.clearRect(0,0,CANVAS_SIZE,CANVAS_SIZE);
        context.drawImage(image,0,0,CANVAS_SIZE,CANVAS_SIZE);
        try{pixels=context.getImageData(0,0,CANVAS_SIZE,CANVAS_SIZE).data;}catch{pixels=null;}
        canvas.dataset.track=frame.track;canvas.dataset.frame=String(frame.frame);canvas.dataset.source=getFramePath(frame.track,frame.frame);
        delete canvas.dataset.error;
      });
    }
    function tick(now){
      raf=null;
      if(!isVisible()||assetUnavailable)return;
      const frame=frameSelection(forceIdle?'idle':selected.track,now-startedAt,selected.staticFrame);
      requestPaint(frame,now);
      if(!selected.staticFrame&&!(frame.track==='angry'&&frame.finished))raf=view.requestAnimationFrame(tick);
    }
    function restart(){
      invalidate();startedAt=clock();forceIdle=false;assetUnavailable=false;
      if(!isVisible())return;
      requestPaint(frameSelection(selected.track,0,selected.staticFrame),startedAt);
      if(!selected.staticFrame)raf=view.requestAnimationFrame(tick);
    }
    function setPose(name='',reducedMotion=false){
      if(destroyed)return;
      const next=selectPose(name,reducedMotion),key=`${next.pose}:${next.staticFrame}`;
      if(key===currentKey)return;
      currentKey=key;selected=next;canvas.dataset.pose=next.pose;canvas.dataset.static=String(next.staticFrame);restart();
    }
    function setVisible(value){
      if(destroyed)return;
      const next=Boolean(value);
      if(next===visible)return;
      visible=next;
      if(visible)restart();else invalidate();
    }
    function hitTest(x,y){
      if(!isVisible()||!pixels)return false;
      const point=canvasPoint(canvas.getBoundingClientRect(),x,y);
      return point!==null&&pixels[(point.y*CANVAS_SIZE+point.x)*4+3]>=20;
    }
    function visibilityChanged(){if(doc.hidden)invalidate();else if(visible)restart();}
    doc.addEventListener('visibilitychange',visibilityChanged);
    setPose();
    return {canvas,setPose,setVisible,hitTest,destroy(){
      if(destroyed)return;
      destroyed=true;invalidate();cache.clear();failed.clear();pixels=null;canvas.dataset.cacheSize='0';
      doc.removeEventListener('visibilitychange',visibilityChanged);canvas.remove();
    }};
  }

  return Object.freeze({create,frameManifest,assetFiles,selectPose,frameIndex,frameSelection,getFramePath,canvasPoint,FRAME_MS,CANVAS_SIZE,CACHE_LIMIT});
});
