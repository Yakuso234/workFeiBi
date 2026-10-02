const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
module.exports=async(pet,getSettings,openSettings,action,state,timer,context)=>{
 const waitFor=async(predicate,message)=>{const start=Date.now();while(!await predicate()){if(Date.now()-start>6000)throw new Error(message);await new Promise(r=>setTimeout(r,40));}};
 if(!pet.isVisible())await new Promise(resolve=>pet.once('show',resolve));
 const out=path.join(__dirname,'../qa');fs.mkdirSync(out,{recursive:true});
 const capture=async(window,name)=>{
   await window.webContents.executeJavaScript(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(r,100))))`);
   fs.writeFileSync(path.join(out,name),(await window.webContents.capturePage()).toPNG());
 };
 const captureBlink=async name=>{
   await pet.webContents.executeJavaScript(`pose('blink',2000);image.decode();window.blinkCapture=setInterval(()=>{motionStarted=Date.now()-160;paintMotion();},16)`);
   try{await capture(pet,name);}finally{await pet.webContents.executeJavaScript(`clearInterval(window.blinkCapture);pose('',0)`);}
 };
 const errors=[];pet.webContents.on('console-message',details=>{if(details.level==='error')errors.push(details.message);});
 await pet.webContents.executeJavaScript(`Promise.all([document.fonts.ready,image.decode()])`);
 assert.equal(pet.isAlwaysOnTop(),true);assert.equal(pet.isVisible(),true);
 assert.equal(await pet.webContents.executeJavaScript('image.naturalWidth'),500);
 assert.equal(await pet.webContents.executeJavaScript('hitTest(1,1)'),false);
 assert.equal(await pet.webContents.executeJavaScript(`(()=>{const b=$('timerBadge').getBoundingClientRect();return hitTest(b.x+5,b.y+5);})()`),true);
 const before=pet.getBounds();pet.setPosition(before.x-50,before.y-30);assert.equal(pet.getBounds().x,before.x-50);pet.setBounds(before);
 openSettings();const w=getSettings();if(w.webContents.isLoading())await new Promise(r=>w.webContents.once('did-finish-load',r));
 w.webContents.on('console-message',details=>{if(details.level==='error')errors.push(details.message);});
 await w.webContents.executeJavaScript(`document.fonts.ready`);
 await w.webContents.executeJavaScript(`window.workFeiBi.saveSettings({soundEnabled:false,volume:40})`);
 assert.equal(state().settings.soundEnabled,false);
 await w.webContents.executeJavaScript(`window.workFeiBi.saveSettings({outfit:0})`);
 assert.match(await pet.webContents.executeJavaScript(`image.src`),/phoebe_0/);
 await w.webContents.executeJavaScript(`window.workFeiBi.saveSettings({outfit:1})`);
 await pet.webContents.executeJavaScript(`image.decode()`);
 action('toggle');assert.equal(state().timer.running,true);action('toggle');assert.equal(state().timer.running,false);
 timer.toggle();timer.deadline=Date.now()-61000;
 await pet.webContents.executeJavaScript(`new Promise(resolve=>{if(state.timer.angry)resolve();else window.workFeiBi.onState(s=>{if(s.timer.angry)resolve();});})`);
 assert.match(await pet.webContents.executeJavaScript(`document.getElementById('bubbleTitle').textContent`),/生气/);
 const refused=await w.webContents.executeJavaScript(`window.workFeiBi.previewAction('wave').then(()=>false,()=>true)`);
 assert.equal(refused,true);
 await capture(pet,'pet-angry.png');
 await pet.webContents.executeJavaScript(`window.workFeiBi.petClick();new Promise(resolve=>window.workFeiBi.onState(s=>{if(!s.timer.reminding)resolve();}))`);
 assert.equal(state().timer.phase,'rest');assert.equal(state().timer.running,true);assert.equal(state().timer.angry,false);
 assert.equal(state().journal.today.rounds,1);
 assert.equal(state().journal.today.seconds,1500);
 assert.equal(state().companion.completedRounds,1);assert.equal(state().companion.bond,5);
 action('reset');
 await pet.webContents.executeJavaScript(`new Promise(r=>{pose('sway',2000);requestAnimationFrame(()=>r());})`);
 assert.equal(await pet.webContents.executeJavaScript(`stage.classList.contains('sway')`),true);
 await pet.webContents.executeJavaScript(`pose('',0);new Promise(requestAnimationFrame)`);
 // These are pose images, not separate limb frames. Verify native resolution.
 for(const assetName of ['phoebe_wave.png','nuonuo_wave.png']){
   const asset=await pet.webContents.executeJavaScript(`(async()=>{const img=new Image();img.src='../assets/images/${assetName}';await img.decode();return {width:img.naturalWidth,height:img.naturalHeight};})()`);
   assert.ok(asset.width>=1024&&asset.height>=1024);
 }
 await pet.webContents.executeJavaScript(`pose('wave',2000);image.decode()`);
 assert.match(await pet.webContents.executeJavaScript('image.src'),/phoebe_wave/);
 await pet.webContents.executeJavaScript(`pose('turn',2000);image.decode()`);
 assert.match(await pet.webContents.executeJavaScript('image.src'),/phoebe_back/);
 await capture(pet,'pet.png');
 await capture(w,'settings.png');
 // A preview is a separate IPC: it must not farm affection or change a session.
 await w.webContents.executeJavaScript(`window.workFeiBi.saveSettings({idleMotion:false})`);
 const progressBefore=JSON.stringify({timer:state().timer,companion:state().companion,journal:state().journal});
 for(const motion of ['blink','wave','kick','stretch','look','sleep','turn']){
   await w.webContents.executeJavaScript(`window.workFeiBi.previewAction(${JSON.stringify(motion)})`);
 }
 assert.equal(JSON.stringify({timer:state().timer,companion:state().companion,journal:state().journal}),progressBefore);
 assert.equal(await w.webContents.executeJavaScript(`window.workFeiBi.previewAction('__proto__').then(()=>false,()=>true)`),true);
 // Native overlay: first load, visible branched canvas, reduced motion, expiry.
 await w.webContents.executeJavaScript(`window.workFeiBi.previewAction('angry')`);
 await waitFor(()=>context.getImpact()?.isVisible(),'impact window did not show');
 const impact=context.getImpact();assert.equal(impact.isFocusable(),false);assert.equal(impact.isAlwaysOnTop(),true);
 impact.webContents.on('console-message',details=>{if(details.level==='error')errors.push(details.message);});
 await waitFor(()=>impact.webContents.executeJavaScript(`document.getElementById('impact').dataset.active==='true'`),'impact canvas did not draw');
 await waitFor(()=>impact.webContents.executeJavaScript(`(()=>{const c=document.getElementById('impact');return c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);})()`),'impact canvas stayed empty').catch(async error=>{console.error('IMPACT DEBUG',await impact.webContents.executeJavaScript(`({width:canvas.width,height:canvas.height,viewport:[innerWidth,innerHeight],data:{...canvas.dataset},frame,visibility:document.visibilityState})`));throw error;});
 const crack=await impact.webContents.executeJavaScript(`(()=>{const c=document.getElementById('impact');return {rays:Number(c.dataset.rays),branches:Number(c.dataset.branches),painted:c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0)};})()`);
 assert.ok(crack.rays>=10&&crack.branches>=20&&crack.painted);
 await capture(impact,'impact.png');await capture(pet,'pet-impact.png');
 await waitFor(()=>!impact.isVisible(),'impact window did not auto-hide');
 await w.webContents.executeJavaScript(`window.workFeiBi.saveSettings({reducedMotion:true});window.workFeiBi.previewAction('angry')`);
 assert.equal(impact.isVisible(),false);
 await w.webContents.executeJavaScript(`window.workFeiBi.saveSettings({reducedMotion:false,impactEnabled:false});window.workFeiBi.previewAction('angry')`);
 assert.equal(impact.isVisible(),false);
 await w.webContents.executeJavaScript(`window.workFeiBi.saveSettings({impactEnabled:true})`);
 await w.webContents.executeJavaScript(`document.querySelector('[data-tab="laboratory"]').click();new Promise(requestAnimationFrame)`);
 assert.equal(await w.webContents.executeJavaScript(`document.querySelectorAll('[data-motion]').length`),8);
 await capture(w,'laboratory.png');
 await captureBlink('phoebe-blink.png');
 // Tasks go through the same IPC and storage path used by the UI.
 await w.webContents.executeJavaScript(`window.workFeiBi.taskAction('add','读十页书 <b>不会变成 HTML</b>')`);
 const taskId=state().journal.tasks[0].id;
 await w.webContents.executeJavaScript(`window.workFeiBi.taskAction('toggle',${JSON.stringify(taskId)})`);
 assert.equal(state().journal.tasks[0].done,true);
 await w.webContents.executeJavaScript(`document.querySelector('[data-tab="journal"]').click();new Promise(requestAnimationFrame)`);
 assert.equal(await w.webContents.executeJavaScript(`document.querySelector('#taskList b')===null`),true);
 await capture(w,'journal.png');
 await w.webContents.executeJavaScript(`window.workFeiBi.taskAction('remove',${JSON.stringify(taskId)})`);
 assert.equal(state().journal.tasks.length,0);
 // Each Nuonuo pose must decode at native high resolution and have real alpha.
 await w.webContents.executeJavaScript(`window.workFeiBi.saveSettings({character:'nuonuo',idleMotion:false}).then(s=>render(s,true))`);
 assert.equal(state().settings.character,'nuonuo');
 for(const poseName of ['front','back','drowsy','angry']){
   const asset=await pet.webContents.executeJavaScript(`(async()=>{const img=new Image();img.src='../assets/images/nuonuo_${poseName}.png';await img.decode();const c=document.createElement('canvas');c.width=c.height=1;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return {width:img.naturalWidth,alpha:ctx.getImageData(0,0,1,1).data[3]};})()`);
   assert.ok(asset.width>=1024);assert.equal(asset.alpha,0);
 }
 await pet.webContents.executeJavaScript(`pose('turn',2000);image.decode()`);
 assert.match(await pet.webContents.executeJavaScript('image.src'),/nuonuo_back/);
 await capture(pet,'nuonuo-back.png');
 await pet.webContents.executeJavaScript(`pose('sleep',2000);image.decode()`);
 assert.match(await pet.webContents.executeJavaScript('image.src'),/nuonuo_drowsy/);
 await pet.webContents.executeJavaScript(`pose('',0);image.decode()`);
 await capture(pet,'nuonuo.png');
 await captureBlink('nuonuo-blink.png');
 const beforeInteractions=state().companion.count;action('interact:feed');
 assert.equal(state().companion.count,beforeInteractions+1);
 assert.equal(state().timer.running,false);
 action('interact:pat');assert.equal(state().companion.count,beforeInteractions+1);
 const stored=JSON.parse(fs.readFileSync(context.configPath,'utf8'));
 assert.equal(stored.companion.totalInteractions,state().companion.totalInteractions);
 assert.equal(stored.companion.completedRounds,1);
 // Stub only the file picker; real validation, copying and decoding still run.
 const {dialog}=require('electron'),picker=dialog.showOpenDialog;
 try{
   dialog.showOpenDialog=async()=>({canceled:false,filePaths:[path.join(__dirname,'../assets/audio/phoebe_chubby_0.mp3')]});
   await w.webContents.executeJavaScript(`window.workFeiBi.importVoice()`);
   assert.equal(state().voices.nuonuo,true);
   const duration=await pet.webContents.executeJavaScript(`window.workFeiBi.getVoice('nuonuo').then(src=>new Promise((resolve,reject)=>{const a=new Audio(src);a.onloadedmetadata=()=>resolve(a.duration);a.onerror=()=>reject(new Error('custom voice decode'));}))`);
   assert.ok(duration>0);
 }finally{dialog.showOpenDialog=picker;}
 await w.webContents.executeJavaScript(`document.querySelector('[data-tab="config"]').click();new Promise(requestAnimationFrame)`);
 const oldDuration=state().settings.studyMinutes;
 await w.webContents.executeJavaScript(`document.querySelector('[data-preset="50/10"]').click()`);
 assert.equal(state().settings.studyMinutes,oldDuration);
 assert.equal(await w.webContents.executeJavaScript(`document.getElementById('studyMinutes').value`),'50');
 await w.webContents.executeJavaScript(`render(currentState,true)`);
 await capture(w,'config.png');
 w.setSize(480,720);
 await w.webContents.executeJavaScript(`new Promise(requestAnimationFrame)`);
 assert.equal(await w.webContents.executeJavaScript('document.documentElement.scrollWidth<=innerWidth'),true);
 await capture(w,'config-compact.png');
 await w.webContents.executeJavaScript(`document.querySelector('[data-tab="laboratory"]').click();new Promise(requestAnimationFrame)`);
 assert.equal(await w.webContents.executeJavaScript('document.documentElement.scrollWidth<=innerWidth'),true);
 await capture(w,'laboratory-compact.png');
 await w.webContents.executeJavaScript(`document.querySelector('[data-tab="dashboard"]').click();new Promise(requestAnimationFrame)`);
 assert.equal(await w.webContents.executeJavaScript('document.documentElement.scrollWidth<=innerWidth'),true);
 await capture(w,'dashboard-compact.png');
 await w.webContents.executeJavaScript(`window.workFeiBi.saveSettings({character:'phoebe',idleMotion:true})`);
 const media=await pet.webContents.executeJavaScript(`Promise.all(['phoebe_chubby_0.mp3'].map(name=>new Promise((resolve,reject)=>{const a=new Audio('../assets/audio/'+name);a.onloadedmetadata=()=>resolve(a.duration);a.onerror=()=>reject(new Error(name));})))`);
 assert.ok(media.every(n=>n>0));
 const approvedLocal=path.join(__dirname,'../local-media/nuonuo/nuonuo-1.wav');
 if(fs.existsSync(approvedLocal)){
   const durations=await pet.webContents.executeJavaScript(`Promise.all([1,2,3].map(n=>new Promise((resolve,reject)=>{const a=new Audio('../local-media/nuonuo/nuonuo-'+n+'.wav');a.onloadedmetadata=()=>resolve(a.duration);a.onerror=()=>reject(new Error('nuonuo-'+n));})))`);
   assert.ok(durations.every(seconds=>seconds>.5&&seconds<2));
 }
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('SMOKE PASS: windows, hit-test, both characters, pose assets, settings, reminder/ack, journal, tasks, companion persistence, cooldown, safe action previews, branched native impact/auto-hide/accessibility flags, presets, voice decoding, responsive console and screenshots');
};
