const $ = id => document.getElementById(id);
const root = $('petRoot'), stage = $('petStage'), image = $('petImage');
let state, audio, dragging = false, dragged = false, start, clickTimer;
let motion = '', motionUntil = 0, lastHit = true, maskReady = false, idleLoop;
let speech='', speechUntil=0;
let audioContext,tones=[];
let soundRequest=0;
let selectedVoice=0;
let speechCancel, motionStarted=0, interactionKind='',motionAutomatic=false;
const behavior=window.PetBehavior,idleBag=new behavior.IdleBag();
const characters=window.PetCharacters,owlModel=$('owlModel'),owl=window.ClockworkOwl.create(owlModel);
const mikuModel=$('mikuModel'),miku=window.MikuPet.create(mikuModel);
const faceCanvas=$('faceOverlay'),faceCtx=faceCanvas.getContext('2d');
const mask = document.createElement('canvas');
mask.width = 500; mask.height = 500;
const maskCtx = mask.getContext('2d', {willReadFrequently:true});

function pose(name, duration=1800, automatic=false) {
  motion=name;motionAutomatic=automatic;motionStarted=Date.now();motionUntil=motionStarted+duration;paintMotion();
}
function paintMotion() {
  if(!state)return;
  const t=state.timer, s=state.settings;
  const active=t.angry?'angry':dragging?'lifted':Date.now()<motionUntil?motion:s.idleMotion&&!s.reducedMotion&&!behavior.quiet(s,t)?'idle':'';
  const isOwl=s.character==='owl',isMiku=s.character==='miku';
  const classes=`pet-stage ${active}${isOwl?' owl-character':isMiku?' sprite-character':''}`;
  if(stage.className!==classes)stage.className=classes;
  root.classList.toggle('reduced-motion',Boolean(s.reducedMotion));
  $('emotion').textContent=t.angry?'💢':active==='sleep'?'z Z':active==='happy'?'♡':'';
  image.hidden=isOwl||isMiku;faceCanvas.hidden=isOwl||isMiku;owlModel.hidden=!isOwl;mikuModel.hidden=!isMiku;
  owl.setPose(isOwl?active:'',s.reducedMotion);
  owl.setAppearance({palette:s.owlPalette,accessory:s.owlAccessory});
  miku.setVisible(isMiku);miku.setPose(isMiku?active:'',s.reducedMotion);
  if(!isOwl&&!isMiku){
    const poseName=active==='sleep'?'sleep':active==='turn'?'back':active==='angry'?'angry':'front';
    const limbPose=['wave','kick','stretch'].includes(active);
    const portrait=s.character==='nuonuo'?`../assets/images/nuonuo_${active==='sleep'?'drowsy':limbPose?'wave':poseName}.png`:s.outfit!==1?`../assets/images/phoebe_${s.outfit}.png`:active==='sleep'?'../assets/images/phoebe_sleep.png':active==='angry'?'../assets/images/phoebe_angry.png':active==='turn'?'../assets/images/phoebe_back.png':limbPose?'../assets/images/phoebe_wave.png':`../assets/images/phoebe_${s.outfit}.png`;
    if(image.getAttribute('src')!==portrait){maskReady=false;image.src=portrait;}
  }
  const effect=Date.now()<motionUntil&&!t.angry?interactionKind:'';
  $('interactionEffect').className=`interaction-effect ${effect}`;
  $('interactionEffect').textContent=effect==='pat'?'♡':'';
  paintFace(active);
}
function paintFace(active){
  faceCtx.clearRect(0,0,500,500);
  if(['owl','miku'].includes(state.settings.character))return;
  // These masks are fitted to the normal front portraits only. Never paint
  // artificial eyes on the alternate sleep/back/raised-arm illustrations.
  if(active!=='blink'||state.settings.reducedMotion)return;
  const elapsed=Date.now()-motionStarted;
  if(!((elapsed>=100&&elapsed<280)||(elapsed>=440&&elapsed<600)))return;
  const nuonuo=state.settings.character==='nuonuo';
  if(nuonuo){
    // Follow the exposed eyes below the fringe instead of covering hair with
    // circular skin patches. Coordinates use the portrait's 500px design space.
    faceCtx.fillStyle='#fff0eb';faceCtx.strokeStyle='#392b2c';faceCtx.lineWidth=2.6;faceCtx.lineCap='round';
    faceCtx.beginPath();faceCtx.moveTo(128,211);faceCtx.lineTo(173,205);faceCtx.lineTo(174,226);faceCtx.quadraticCurveTo(174,253,150,253);faceCtx.quadraticCurveTo(124,253,127,229);faceCtx.closePath();faceCtx.fill();
    faceCtx.beginPath();faceCtx.moveTo(258,200);faceCtx.lineTo(312,201);faceCtx.lineTo(312,225);faceCtx.quadraticCurveTo(312,249,285,249);faceCtx.quadraticCurveTo(258,249,258,227);faceCtx.closePath();faceCtx.fill();
    for(const [x,y,rx] of [[150,222,20],[285,221,24]]){faceCtx.beginPath();faceCtx.moveTo(x-rx,y);faceCtx.quadraticCurveTo(x,y+12,x+rx,y);faceCtx.stroke();}
    return;
  }
  const eyes=state.settings.outfit===2?[[192,329,29,26],[288,329,30,26]]:state.settings.outfit===0?[[200,335,29,26],[291,335,29,26]]:[[195,337,29,26],[288,337,31,27]];
  faceCtx.fillStyle='#ffe6d4';faceCtx.strokeStyle='#392b2c';faceCtx.lineWidth=4;faceCtx.lineCap='round';
  for(const [x,y,rx,ry] of eyes){
    faceCtx.beginPath();faceCtx.ellipse(x,y,rx,ry,0,0,Math.PI*2);faceCtx.fill();
    faceCtx.beginPath();faceCtx.moveTo(x-rx+4,y-3);faceCtx.quadraticCurveTo(x,y+10,x+rx-4,y-3);faceCtx.stroke();
  }
}
function stopAudio(){soundRequest++;if(audio){audio.onerror=null;audio.pause();audio.currentTime=0;}speechCancel?.();if('speechSynthesis' in window)speechSynthesis.cancel();for(const tone of tones)try{tone.stop();}catch{}tones=[];}
async function speak(text,{pitch=1,rate=1,voiceShift=true}={},request=soundRequest){
  if(!('speechSynthesis' in window))return false;
  const chinese=()=>speechSynthesis.getVoices().filter(voice=>/^zh(?:-|_)/i.test(voice.lang));
  if(!chinese().length)await new Promise(resolve=>{
    let timer;
    const done=()=>{clearTimeout(timer);speechSynthesis.removeEventListener('voiceschanged',done);resolve();};
    speechSynthesis.addEventListener('voiceschanged',done);timer=setTimeout(done,500);
  });
  const voices=chinese();
  if(!voices.length||request!==soundRequest||!behavior.canSound(state.settings,state.timer))return false;
  const utterance=new SpeechSynthesisUtterance(text);
  if(voiceShift)selectedVoice=(selectedVoice+1)%voices.length;
  utterance.voice=voices[selectedVoice%voices.length];
  utterance.lang='zh-CN';utterance.volume=state.settings.volume/100;utterance.pitch=pitch;utterance.rate=rate;
  return new Promise(resolve=>{
    let finished=false,timer;
    const finish=ok=>{if(finished)return;finished=true;clearTimeout(timer);if(speechCancel===cancel)speechCancel=null;resolve(ok);};
    const cancel=()=>finish(false);speechCancel=cancel;
    utterance.onend=()=>finish(true);utterance.onerror=()=>finish(false);
    timer=setTimeout(()=>{finish(false);speechSynthesis.cancel();},8000);
    try{speechSynthesis.speak(utterance);}catch{finish(false);}
  });
}
function chime(request){
  if(request!==soundRequest||!behavior.canSound(state.settings,state.timer))return;
  audioContext??=new AudioContext();audioContext.resume().catch(()=>{});
  [523,659,784].forEach((frequency,index)=>{
    const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),time=audioContext.currentTime+index*.13;
    oscillator.frequency.value=frequency;oscillator.type='sine';gain.gain.setValueAtTime(0,time);
    gain.gain.linearRampToValueAtTime(state.settings.volume/100*.12,time+.015);gain.gain.exponentialRampToValueAtTime(.001,time+.18);
    oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(time);oscillator.stop(time+.2);tones.push(oscillator);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  });
}
async function fallbackNuonuo(cue,request){
  const variations=cue==='angry'?[[1.3,.98],[1.55,1.12],[1.8,1.2]]:[[1.4,1.05],[1.7,1.17],[1.55,.98]];
  const [pitch,rate]=variations[Math.floor(Math.random()*variations.length)];
  if(!await speak('糯糯',{pitch,rate},request))chime(request);
}
function playAudio(src,request,rate,fallback,pitchShift=false){
  if(request!==soundRequest||!behavior.canSound(state.settings,state.timer))return;
  const clip=new Audio(src);audio=clip;clip.volume=state.settings.volume/100;clip.playbackRate=rate;
  if(pitchShift){clip.preservesPitch=false;clip.webkitPreservesPitch=false;}
  let failed=false;
  const fail=()=>{if(failed||request!==soundRequest)return;failed=true;clip.onerror=null;clip.pause();fallback();};
  clip.onerror=fail;clip.play().catch(fail);
}
async function sound(cue='preview') {
  if(!state||!behavior.canSound(state.settings,state.timer))return;
  stopAudio();
  const request=soundRequest,character=state.settings.character;
  const builtin=async()=>{
    if(request!==soundRequest||!behavior.canSound(state.settings,state.timer))return;
    if(character==='owl'||character==='miku'){chime(request);return;}
    if(character==='nuonuo'){
      if(state.voices?.localNuonuo){
        const clip=1+Math.floor(Math.random()*3),rate=cue==='angry'?1.08:cue==='feed'?1.16:cue==='pat'?1.1:1.04;
        playAudio(`../local-media/nuonuo/nuonuo-${clip}.wav`,request,rate,()=>fallbackNuonuo(cue,request),true);
      }else await fallbackNuonuo(cue,request);
      return;
    }
    if(cue==='angry'&&await speak('菲吧揪比！',{pitch:1.75,rate:1.1,voiceShift:false},request))return;
    playAudio('../assets/audio/phoebe_chubby_0.mp3',request,cue==='feed'?1.42:cue==='pat'?1.36:cue==='reminder'?1.35:1.3,()=>chime(request),true);
  };
  if(state.voices?.[character]){
    try{
      const src=await window.workFeiBi.getVoice(character);
      if(request!==soundRequest||!behavior.canSound(state.settings,state.timer))return;
      if(src){playAudio(src,request,1,builtin);return;}
    }catch(error){console.warn('读取自定义音效失败',error.message);}
  }
  await builtin();
}
function format(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
function render(next) {
  const before=state;
  state=next;
  const {timer:t,settings:s}=state;
  const characterChanged=before&&before.settings.character!==s.character;
  if(characterChanged){motion='';motionUntil=0;motionAutomatic=false;speech='';speechUntil=0;interactionKind='';maskReady=false;if(s.character!=='owl'&&image.complete&&image.naturalWidth)image.onload();}
  if(motionAutomatic&&(!s.idleMotion||s.reducedMotion||t.reminding||behavior.quiet(s,t)&&motion!=='blink')){motion='';motionUntil=0;}
  if((before?.timer.reminding&&!t.reminding)||!behavior.canSound(s,t)||characterChanged||before?.voices?.revision!==state.voices?.revision)stopAudio();
  if(before&&(before.settings.idleFrequency!==s.idleFrequency||before.settings.idleMotion!==s.idleMotion||before.settings.focusQuiet!==s.focusQuiet||before.settings.reducedMotion!==s.reducedMotion))scheduleIdle();
  if(audio)audio.volume=s.volume/100;
  $('timerBadge').textContent=t.reminding?'点我确认':`${t.running?(t.phase==='study'?'专注 ':t.breakKind==='long'?'长休息 ':'休息 '):'待开始 '}${format(t.remaining)}`;
  $('bubble').classList.toggle('hidden',!t.reminding);
  const name=characters.name(s.character);
  root.title=`拖动${name}；单击摸头；双击设置；右键菜单`;
  const nextLongBreak=s.longBreakEnabled&&t.rounds>0&&t.rounds%s.longBreakEvery===0;
  $('bubbleTitle').textContent=t.angry?`${name}生气了！`:t.phase==='study'?(nextLongBreak?'该长休息啦':'该休息啦'):'回来学习啦';
  $('bubbleText').textContent=t.angry?'哼！':format(t.reminderElapsed);
  $('bubbleHint').textContent=t.angry?'已经等你好久了，点我确认～':'点桌宠或气泡，开始下一阶段';
  if(!t.reminding&&Date.now()<speechUntil){
    $('bubble').classList.remove('hidden');$('bubbleTitle').textContent=`${name}的悄悄话`;
    $('bubbleText').textContent='♡';$('bubbleHint').textContent=speech;
  }
  image.alt=`${name}桌宠`;
  paintMotion();
}
setInterval(paintMotion,120);
function scheduleIdle(){
  clearTimeout(idleLoop);
  idleLoop=setTimeout(()=>{
    if(state&&!dragging&&Date.now()>=motionUntil){
      const next=idleBag.next(behavior.idlePool(state.settings,state.timer));
      if(next){interactionKind='';pose(next,behavior.duration(next),true);}
    }
    scheduleIdle();
  },behavior.idleDelay(state?.settings.idleFrequency));
}
function interact(){if(state?.timer.reminding){window.workFeiBi.petClick();return;}window.workFeiBi.timerAction('interact:pat');}

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
  if(state?.settings.character==='owl')return owl.hitTest(x,y);
  if(state?.settings.character==='miku')return miku.hitTest(x,y);
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
  if(['interaction','game','celebration'].includes(e?.type)){
    speech=String(e.text||'').replaceAll('啾比',characters.get(state?.settings.character).nickname);speechUntil=Date.now()+4000;
    const effect=e.effect||e.sound;interactionKind=['pat','feed'].includes(effect)?effect:'';
    pose(e.motion,behavior.duration(e.motion,e.duration));
    if(state?.settings.interactionSounds&&e.sound)sound(e.sound);
    if(state)render(state);return;
  }
  if(e?.type==='preview-action'&&behavior.previewActions.includes(e.motion)){
    interactionKind='';speech='';speechUntil=0;
    pose(e.motion,behavior.duration(e.motion,e.duration));
    if(e.motion==='angry')sound('angry');
    if(state)render(state);return;
  }
  if(['reminder','angry','preview'].includes(e)){interactionKind='';pose(e==='angry'?'angry':'hop',2000);sound(e);}
  if(e==='acknowledged'){stopAudio();interactionKind='';pose('happy',1600);}
});
window.workFeiBi.getState().then(next=>{render(next);scheduleIdle();});
