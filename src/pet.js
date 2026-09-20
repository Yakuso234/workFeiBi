const $ = id => document.getElementById(id);
const root = $('petRoot'), stage = $('petStage'), image = $('petImage');
let state, audio, dragging = false, dragged = false, start, clickTimer;
let motion = '', motionUntil = 0, lastHit = true, maskReady = false;
const mask = document.createElement('canvas');
mask.width = 500; mask.height = 500;
const maskCtx = mask.getContext('2d', {willReadFrequently:true});

function pose(name, duration=1800) {
  motion=name; motionUntil=Date.now()+duration; paintMotion();
}
function paintMotion() {
  if(!state)return;
  const t=state.timer, s=state.settings;
  const active=t.angry?'angry':dragging?'lifted':s.idleMotion?(Date.now()<motionUntil?motion:'idle'):'';
  const classes=`pet-stage ${active}`;
  if(stage.className!==classes)stage.className=classes;
  $('emotion').textContent=t.angry?'💢':active==='sleep'?'z Z':active==='happy'?'♡':'';
}
function stopAudio(){if(audio){audio.pause();audio.currentTime=0;}}
function sound() {
  if(!state?.settings.soundEnabled)return;
  stopAudio();
  audio=new Audio('../assets/audio/phoebe_chubby_0.mp3');
  audio.volume=state.settings.volume/100;
  audio.play().catch(e=>{console.warn('音频播放失败', e.message);});
}
function format(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
function render(next) {
  const before=state;
  state=next;
  const {timer:t,settings:s}=state;
  if((before?.timer.reminding&&!t.reminding)||!s.soundEnabled)stopAudio();
  if(audio)audio.volume=s.volume/100;
  $('timerBadge').textContent=t.reminding?'点我确认':`${t.running?(t.phase==='study'?'专注 ':'休息 '):'待开始 '}${format(t.remaining)}`;
  $('bubble').classList.toggle('hidden',!t.reminding);
  $('bubbleTitle').textContent=t.angry?'菲比啾比生气了！':t.phase==='study'?'该休息啦':'回来学习啦';
  $('bubbleText').textContent=t.angry?'哼！':format(t.reminderElapsed);
  $('bubbleHint').textContent=t.angry?'已经等你好久了，点我确认～':'点菲比或气泡，开始下一阶段';
  const portrait=`../assets/images/phoebe_${s.outfit}.png`;
  if(image.getAttribute('src')!==portrait){maskReady=false;image.src=portrait;}
  paintMotion();
}
setInterval(paintMotion,120);
setInterval(()=>{
  if(state?.settings.idleMotion&&!state.timer.reminding&&!dragging){
    const pool=state.timer.phase==='rest'?['sleep','sway']:['sway','happy','hop'];
    pose(pool[Math.floor(Math.random()*pool.length)],2800);
  }
},7500);
function interact(){if(state?.timer.reminding){window.workFeiBi.petClick();return;}pose('happy',1200);sound();}

stage.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  start={x:e.screenX,y:e.screenY};dragged=false;dragging=true;
  stage.setPointerCapture(e.pointerId);
  window.workFeiBi.dragStart();paintMotion();
});
stage.addEventListener('pointermove',e=>{if(dragging&&Math.hypot(e.screenX-start.x,e.screenY-start.y)>5)dragged=true;});
stage.addEventListener('pointerup',e=>{
  if(!dragging)return;
  dragging=false;window.workFeiBi.dragEnd();paintMotion();
  if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
  if(dragged){clearTimeout(clickTimer);clickTimer=null;return;}
  if(state?.timer.reminding){clearTimeout(clickTimer);clickTimer=null;interact();return;}
  if(clickTimer){clearTimeout(clickTimer);clickTimer=null;window.workFeiBi.openSettings();}
  else clickTimer=setTimeout(()=>{clickTimer=null;interact();},280);
});
function cancelDrag(){dragging=false;window.workFeiBi.dragEnd();paintMotion();}
stage.addEventListener('pointercancel',cancelDrag);
stage.addEventListener('lostpointercapture',()=>{if(dragging)cancelDrag();});
window.addEventListener('blur',cancelDrag);

image.onload=()=>{maskCtx.clearRect(0,0,500,500);maskCtx.drawImage(image,0,0,500,500);maskReady=true;};
if(image.complete&&image.naturalWidth)image.onload();
function hitTest(x,y){
  const inside=el=>{const b=el.getBoundingClientRect();return x>=b.left&&x<b.right&&y>=b.top&&y<b.bottom;};
  if(inside($('settingsButton'))||inside($('timerBadge'))||(!$('bubble').classList.contains('hidden')&&inside($('bubble'))))return true;
  if(!maskReady)return false;
  const b=image.getBoundingClientRect(), size=Math.min(b.width,b.height);
  const px=Math.floor((x-b.left-(b.width-size)/2)*500/size),py=Math.floor((y-b.top-(b.height-size)/2)*500/size);
  return px>=0&&px<500&&py>=0&&py<500&&maskCtx.getImageData(px,py,1,1).data[3]>16;
}
window.addEventListener('mousemove',e=>{
  if(dragging)return;
  const hit=hitTest(e.clientX,e.clientY);
  if(hit!==lastHit){lastHit=hit;window.workFeiBi.hitTest(hit);}
});
root.addEventListener('contextmenu',e=>{e.preventDefault();window.workFeiBi.contextMenu();});
$('bubble').onclick=()=>window.workFeiBi.petClick();
$('timerBadge').onclick=()=>state?.timer.reminding?window.workFeiBi.petClick():window.workFeiBi.openSettings();
$('settingsButton').onclick=()=>window.workFeiBi.openSettings();
window.workFeiBi.onState(render);
window.workFeiBi.onPetEvent(e=>{
  if(['reminder','angry','preview'].includes(e)){pose(e==='angry'?'angry':'hop',2000);sound();}
  if(e==='acknowledged'){stopAudio();pose('happy',1600);}
});
window.workFeiBi.getState().then(render);
