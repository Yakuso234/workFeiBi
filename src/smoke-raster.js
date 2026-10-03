const assert=require('node:assert/strict');

// These checks exercise the fitted, local mesh animation on the two existing
// portraits. They do not claim that the artwork contains authored sprite frames.
module.exports=async({pet,w,action,state,timer,waitFor,capture})=>{
  const execute=code=>w.webContents.executeJavaScript(code);
  const petExecute=code=>pet.webContents.executeJavaScript(code);
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const initialSettings={...state().settings};
  const protectedData=()=>JSON.stringify({timer:state().timer,companion:state().companion,journal:state().journal});
  const save=async patch=>{
    await execute(`window.workFeiBi.saveSettings(${JSON.stringify(patch)})`);
    await waitFor(()=>petExecute(`state.settings.character===${JSON.stringify(state().settings.character)}&&state.settings.outfit===${state().settings.outfit}`),'raster settings did not reach the pet');
  };
  const ready=async(character,pose)=>{
    await waitFor(()=>petExecute(`!rasterModel.hidden&&raster.canvas.dataset.ready==='true'&&raster.canvas.dataset.character===${JSON.stringify(character)}${pose?`&&raster.canvas.dataset.pose===${JSON.stringify(pose)}`:''}`),`${character} ${pose||'portrait'} raster did not render`);
  };
  const pixels=async(regions=[])=>petExecute(`(()=>{
    const c=raster.canvas,ctx=c.getContext('2d'),scale=c.width/512;
    const hash=(x,y,width,height)=>{
      const data=ctx.getImageData(Math.round(x*scale),Math.round(y*scale),Math.round(width*scale),Math.round(height*scale)).data;
      let result=2166136261;
      for(let i=0;i<data.length;i++)result=Math.imul(result^data[i],16777619)>>>0;
      return result;
    };
    return {hash:hash(0,0,512,512),regions:${JSON.stringify(regions)}.map(region=>hash(...region)),frame:c.dataset.frame,lastPaintMs:c.dataset.lastPaintMs,animated:c.dataset.animated,source:c.dataset.source,pose:c.dataset.pose};
  })()`);
  const preview=async(character,pose,screenshot,regions=[],rendererOnly=false)=>{
    // Happy/hop are internal visual reactions, not public preview IPC actions.
    // Exercise only their renderer pose; no main event or earned reward is faked.
    if(rendererOnly)await petExecute(`pose(${JSON.stringify(pose)},${pose==='hop'?1200:2000})`);
    else await execute(`window.workFeiBi.previewAction(${JSON.stringify(pose)})`);
    await ready(character,pose);
    assert.equal(await petExecute(`getComputedStyle(stage).transform`),'none');
    assert.equal(await petExecute(`getComputedStyle(image).transform`),'none');
    assert.equal(await petExecute(`!image.hidden&&getComputedStyle(image).visibility==='hidden'`),true);
    const samples=[];
    for(let i=0;i<3;i++){await delay(i?190:90);samples.push(await pixels(regions));}
    assert.equal(samples[0].animated,'true',`${character} ${pose} did not animate`);
    assert.ok(new Set(samples.map(sample=>sample.hash)).size>1,`${character} ${pose} pixels stayed still`);
    for(let i=0;i<regions.length;i++)assert.equal(new Set(samples.map(sample=>sample.regions[i])).size,1,`${character} ${pose} moved a protected region`);
    if(screenshot)await capture(pet,screenshot);
  };
  const staticPose=async(character,pose,sourcePattern,screenshot)=>{
    await execute(`window.workFeiBi.previewAction(${JSON.stringify(pose)})`);
    await ready(character,pose);
    await delay(100);const first=await pixels();
    assert.match(first.source,sourcePattern);assert.equal(first.animated,'false');
    await delay(360);const second=await pixels();
    assert.equal(first.hash,second.hash);assert.equal(first.frame,second.frame);assert.equal(first.lastPaintMs,second.lastPaintMs);
    if(screenshot)await capture(pet,screenshot);
  };
  const resetStudy=()=>{action('reset');if(state().timer.phase==='rest')action('skip');assert.equal(state().timer.running,false);};
  const alphaHit=async()=>{
    const points=await petExecute(`(()=>{
      const c=raster.canvas,b=c.getBoundingClientRect(),size=Math.min(b.width,b.height),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      const exclusions=[$('settingsButton'),$('timerBadge'),...(!$('bubble').classList.contains('hidden')?[$('bubble')]:[])].map(element=>element.getBoundingClientRect());
      const found={};
      for(let y=0;y<c.height&&(!found.solid||!found.clear);y+=8)for(let x=0;x<c.width&&(!found.solid||!found.clear);x+=8){
        const px=b.left+(b.width-size)/2+(x+.5)*size/c.width,py=b.top+(b.height-size)/2+(y+.5)*size/c.height;
        if(exclusions.some(rect=>px>=rect.left&&px<rect.right&&py>=rect.top&&py<rect.bottom))continue;
        const alpha=data[(y*c.width+x)*4+3];
        if(alpha>220&&!found.solid)found.solid={raster:raster.hitTest(px,py),root:hitTest(px,py)};
        if(alpha===0&&!found.clear)found.clear={raster:raster.hitTest(px,py),root:hitTest(px,py)};
      }
      return found;
    })()`);
    assert.deepEqual(points.solid,{raster:true,root:true});assert.deepEqual(points.clear,{raster:false,root:false});
  };
  try{
    resetStudy();
    await save({character:'phoebe',outfit:1,idleMotion:false,reducedMotion:false,focusQuiet:false,soundEnabled:false});
    await ready('phoebe');
    const previewProtected=protectedData();
    for(const character of ['phoebe','nuonuo']){
      await save({character});await ready(character);
      // Head and eyes stay in place while only the raised arm waves. Feet
      // animate independently of the protected head on the normal portrait.
      const head=[[190,40,150,200]];
      const frontEyes=character==='phoebe'?[[175,315,145,55]]:[[120,185,240,80]];
      const waveEyes=character==='phoebe'?[[185,220,150,70]]:[[180,190,160,95]];
      const hands=character==='phoebe'?[[189,434,20,12],[331,434,20,12]]:[[141,380,24,24],[325,382,24,24]];
      const waveFeet=character==='phoebe'?[[177,380,20,20],[234,421,20,20]]:[[188,434,20,20],[263,458,20,20]];
      const frontFeet=character==='phoebe'?[[188,471,20,20],[272,476,20,20]]:[[197,457,20,20],[270,457,20,20]];
      await preview(character,'wave',`${character}-raster-wave.png`,[...head,...waveEyes,...waveFeet]);
      await alphaHit();
      await preview(character,'kick',`${character}-raster-kick.png`,[...head,...frontEyes,...hands]);
      await preview(character,'stretch',`${character}-raster-stretch.png`,[...head,...frontEyes,...frontFeet]);
      await preview(character,'look',`${character}-raster-look.png`);
      await preview(character,'happy',null,[...head,...frontEyes,...hands],true);
      await preview(character,'hop',null,[...head,...frontEyes,...hands],true);
      await staticPose(character,'sleep',character==='phoebe'?/phoebe_sleep/:/nuonuo_drowsy/,`${character}-raster-sleep.png`);
      await staticPose(character,'turn',new RegExp(`${character}_back`));
      await save({reducedMotion:true});
      await execute(`window.workFeiBi.previewAction('wave')`);await ready(character,'wave');
      await delay(120);const reduced=await pixels();
      await delay(380);const reducedLater=await pixels();
      assert.equal(reduced.animated,'false');assert.equal(reduced.hash,reducedLater.hash);assert.equal(reduced.frame,reducedLater.frame);assert.equal(reduced.lastPaintMs,reducedLater.lastPaintMs);
      await save({reducedMotion:false});
    }
    assert.equal(protectedData(),previewProtected,'previews changed progression or the paused countdown');
    // The legacy alternative hats retain their original portrait, not the
    // normal-hat wave/sleep drawing fitted for outfit 1.
    for(const outfit of [0,2]){
      await save({character:'phoebe',outfit});
      await execute(`window.workFeiBi.previewAction('wave')`);await ready('phoebe','wave');
      assert.match(await petExecute(`image.src`),new RegExp(`phoebe_${outfit}\\.png$`));
      assert.match((await pixels()).source,new RegExp(`phoebe_${outfit}\\.png$`));
      await waitFor(()=>execute(`document.getElementById('turnButton').hidden&&document.querySelector('[data-motion="turn"]').hidden`),'alternative Phoebe outfit exposed an unavailable back view');
      assert.equal(await execute(`window.workFeiBi.previewAction('turn').then(()=>false,()=>true)`),true);
      const beforeTurn=state().companion;
      action('interact:turn');
      const afterTurn=state().companion;
      for(const field of ['count','totalInteractions','bond','mood','energy','completedRounds'])assert.equal(afterTurn[field],beforeTurn[field],'unsupported back view rewarded an interaction');
    }
    await save({outfit:1});
    await execute(`window.workFeiBi.previewAction('wave')`);await ready('phoebe','wave');
    // Switching renderers stops the hidden mesh scheduler. A pending single
    // tap is also canceled, so it cannot unexpectedly pat the next character.
    await petExecute(`window.__unexpectedRasterTap=false;clickTimer=setTimeout(()=>{window.__unexpectedRasterTap=true;},250)`);
    for(const character of ['owl','miku']){
      await save({character});
      await waitFor(()=>petExecute(`rasterModel.hidden`),'hidden mesh did not follow character switch');
      await delay(120);const stopped=await pixels();await delay(380);const later=await pixels();
      assert.equal(stopped.frame,later.frame);assert.equal(stopped.lastPaintMs,later.lastPaintMs);
      assert.equal(await petExecute(`window.__unexpectedRasterTap`),false);
    }
    await save({character:'nuonuo',idleMotion:false});await ready('nuonuo');
    await execute(`window.workFeiBi.previewAction('wave')`);await ready('nuonuo','wave');
    pet.hide();
    // backgroundThrottling:false intentionally leaves document.hidden false
    // in Electron. The actual native show/hide events own this explicit flag.
    await waitFor(()=>petExecute(`!petVisible`),'native hide did not pause pet visibility');
    await delay(120);const hidden=await pixels();await delay(380);const hiddenLater=await pixels();
    assert.equal(hidden.frame,hiddenLater.frame);assert.equal(hidden.lastPaintMs,hiddenLater.lastPaintMs);
    pet.showInactive();await waitFor(()=>petExecute(`petVisible`),'native show did not restore pet visibility');
    await waitFor(async()=>Number((await pixels()).frame)>Number(hidden.frame),'mesh did not resume after showing the window');
    // Sleep is a real interaction with a visible whisper. A deadline and an
    // immediate acknowledgement must clear it before its natural expiry.
    resetStudy();await delay(2600);const beforeSleep=state().companion.count;
    action('interact:sleep');
    await waitFor(()=>state().companion.count===beforeSleep+1,'sleep interaction did not invoke companion');
    await waitFor(()=>petExecute(`motion==='sleep'&&speech.length>0&&Date.now()<speechUntil`),'sleep whisper did not render');
    const oldWhisper=await petExecute(`speech`);
    action('toggle');timer.deadline=Date.now()-1;
    await waitFor(()=>state().timer.reminding,'sleep deadline did not create reminder');
    await waitFor(()=>petExecute(`state.timer.reminding&&speech===''&&raster.canvas.dataset.pose!=='sleep'&&document.getElementById('bubbleTitle').textContent==='该休息啦'`),'sleep prevented reminder rendering');
    await petExecute(`window.workFeiBi.petClick()`);
    await waitFor(()=>!state().timer.reminding&&state().timer.phase==='rest','immediate acknowledgement did not reach main');
    assert.equal(await petExecute(`speech===''&&speechUntil===0&&document.getElementById('bubble').classList.contains('hidden')`),true);
    assert.notEqual(await petExecute(`document.getElementById('bubbleHint').textContent`),oldWhisper);
    // Hold a different interrupted action through at least one lively idle
    // scheduling interval; automatic motions may not replace the reminder.
    resetStudy();await save({character:'phoebe',outfit:1,idleMotion:true,idleFrequency:'lively'});
    await execute(`window.workFeiBi.previewAction('wave')`);await ready('phoebe','wave');
    action('toggle');timer.deadline=Date.now()-1;
    await waitFor(()=>state().timer.reminding,'wave deadline did not create reminder');
    await delay(5700);
    assert.equal(await petExecute(`state.timer.reminding&&!motionAutomatic&&speech===''&&!['wave','sleep'].includes(raster.canvas.dataset.pose)&&document.getElementById('bubbleTitle').textContent==='该休息啦'`),true);
    assert.equal(await execute(`window.workFeiBi.previewAction('sleep').then(()=>false,()=>true)`),true);
    await capture(pet,'raster-reminder-priority.png');
    await petExecute(`window.workFeiBi.petClick()`);await waitFor(()=>!state().timer.reminding,'wave reminder did not acknowledge');
    assert.equal(await petExecute(`speech===''&&speechUntil===0`),true);
  }finally{
    pet.showInactive();
    await petExecute(`clearTimeout(clickTimer);clickTimer=null;delete window.__unexpectedRasterTap`);
    await save(initialSettings);
    resetStudy();
  }
};
