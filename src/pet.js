const $ = id => document.getElementById(id);
const root = $('petRoot'), stage = $('petStage'), image = $('petImage');
let state, audio, dragging = false, dragged = false, start, clickTimer;
let motion = '', motionUntil = 0, lastHit = true, maskReady = false, idleLoop;
let speech='', speechUntil=0;
let audioContext,tones=[];
let soundRequest=0;
let selectedVoice=0;
const mask = document.createElement('canvas');
mask.width = 500; mask.height = 500;
const maskCtx = mask.getContext('2d', {willReadFrequently:true});

function pose(name, duration=1800) {
  motion=name; motionUntil=Date.now()+duration; paintMotion();
}
function paintMotion() {
  if(!state)return;
  const t=state.timer, s=state.settings;
  const active=t.angry?'angry':dragging?'lifted':Date.now()<motionUntil?motion:s.idleMotion?'idle':'';
  const classes=`pet-stage ${active}`;
  if(stage.className!==classes)stage.className=classes;
  $('emotion').textContent=t.angry?'💢':active==='sleep'?'z Z':active==='happy'?'♡':'';
  const poseName=active==='sleep'?'sleep':active==='turn'?'back':active==='angry'?'angry':'front';
  const limbPose=['wave','kick','stretch','blink'].includes(active);
  const portrait=s.character==='nuonuo'?`../assets/images/nuonuo_${active==='sleep'?'drowsy':limbPose?'wave':poseName}.png`:active==='sleep'?'../assets/images/phoebe_sleep.png':active==='angry'?'../assets/images/phoebe_angry.png':active==='turn'?'../assets/images/phoebe_back.png':limbPose?'../assets/images/phoebe_wave.png':`../assets/images/phoebe_${s.outfit}.png`;
  if(image.getAttribute('src')!==portrait){maskReady=false;image.src=portrait;}
}
function stopAudio(){soundRequest++;if(audio){audio.pause();audio.currentTime=0;}if('speechSynthesis' in window)speechSynthesis.cancel();for(const tone of tones)try{tone.stop();}catch{}tones=[];}
function speak(text,{pitch=1,rate=1,voiceShift=true}={}){
  if(!('speechSynthesis' in window))return false;
  const utterance=new SpeechSynthesisUtterance(text);
  const chinese=speechSynthesis.getVoices().filter(voice=>/^zh(?:-|_)/i.test(voice.lang));
  if(chinese.length){
    if(voiceShift)selectedVoice=(selectedVoice+1)%chinese.length;
    utterance.voice=chinese[selectedVoice];
  }
  utterance.lang='zh-CN';utterance.volume=state.settings.volume/100;utterance.pitch=pitch;utterance.rate=rate;
  try{speechSynthesis.speak(utterance);return true;}catch{return false;}
}
function fallbackNuonuo(cue){
  const variations=cue==='angry'?[[.82,.86],[1.08,.98],[1.36,1.12]]:[[1.22,1.05],[1.46,1.17],[1.02,.94]];
  const [pitch,rate]=variations[Math.floor(Math.random()*variations.length)];
  if(speak('糯糯',{pitch,rate}))return;
  audioContext??=new AudioContext();audioContext.resume().catch(()=>{});
  [523,659,784].forEach((frequency,index)=>{
    const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),time=audioContext.currentTime+index*.13;
    oscillator.frequency.value=frequency;oscillator.type='sine';gain.gain.setValueAtTime(0,time);
    gain.gain.linearRampToValueAtTime(state.settings.volume/100*.12,time+.015);gain.gain.exponentialRampToValueAtTime(.001,time+.18);
    oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(time);oscillator.stop(time+.2);tones.push(oscillator);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  });
}
async function sound(cue='preview') {
  if(!state?.settings.soundEnabled||state.settings.volume<=0)return;
  stopAudio();
  const request=soundRequest,character=state.settings.character;
  if(state.voices?.[character]){
    try{
      const src=await window.workFeiBi.getVoice(character);
      if(request!==soundRequest||!state.settings.soundEnabled)return;
      if(src){audio=new Audio(src);audio.volume=state.settings.volume/100;audio.play().catch(()=>{speech='音频无法播放，请换一个有效音频文件。';speechUntil=Date.now()+5000;});return;}
    }catch(error){console.warn('读取自定义音效失败',error.message);}
  }
  if(request!==soundRequest||!state.settings.soundEnabled)return;
  if(state.settings.character==='nuonuo'){
    // Author-approved local clips stay outside Git.  The packaged local copy
    // randomly picks a short vocal cue; repositories without it fall back.
    const clip=1+Math.floor(Math.random()*3);
    audio=new Audio(`../local-media/nuonuo/nuonuo-${clip}.wav`);
    audio.volume=state.settings.volume/100;
    audio.playbackRate=cue==='angry'?.92:cue==='preview'?1.04:1;
    let fellBack=false;
    const fallback=()=>{if(!fellBack&&request===soundRequest){fellBack=true;fallbackNuonuo(cue);}};
    audio.onerror=fallback;
    audio.play().catch(fallback);
    return;
  }
  if(cue==='angry'){
    // The angry line uses the local Windows Chinese voice, so it actually
    // says the meme-like phrase rather than merely changing a music pitch.
    if(speak('菲吧揪比！',{pitch:.82,rate:.88,voiceShift:false}))return;
  }
  audio=new Audio('../assets/audio/phoebe_chubby_0.mp3');
  audio.volume=state.settings.volume/100;
  // Keep the licensed source untouched, but give the built-in "啾比" cue a
  // smaller, more playful character. Chromium honours preservesPitch=false.
  audio.preservesPitch=false;
  audio.webkitPreservesPitch=false;
  audio.playbackRate=cue==='reminder'?1.30:cue==='preview'?1.25:1.08;
  audio.play().catch(e=>{console.warn('音频播放失败', e.message);});
}
function format(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
function render(next) {
  const before=state;
  state=next;
  const {timer:t,settings:s}=state;
  if((before?.timer.reminding&&!t.reminding)||!s.soundEnabled||before?.settings.character!==s.character||before?.voices?.revision!==state.voices?.revision)stopAudio();
  if(audio)audio.volume=s.volume/100;
  $('timerBadge').textContent=t.reminding?'点我确认':`${t.running?(t.phase==='study'?'专注 ':'休息 '):'待开始 '}${format(t.remaining)}`;
  $('bubble').classList.toggle('hidden',!t.reminding);
  const name=s.character==='nuonuo'?'弗糯糯':'菲比啾比';
  $('bubbleTitle').textContent=t.angry?`${name}生气了！`:t.phase==='study'?'该休息啦':'回来学习啦';
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
    if(state?.settings.idleMotion&&!state.timer.reminding&&!dragging&&Date.now()>=motionUntil){
      const pool=state.timer.phase==='rest'?['sleep','sway','blink','look','turn']:['sway','happy','hop','blink','wave','kick','stretch','look','turn'];
      pose(pool[Math.floor(Math.random()*pool.length)],2600);
    }
    scheduleIdle();
  },3000+Math.floor(Math.random()*4000));
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
  if(e?.type==='interaction'){speech=e.text.replaceAll('啾比',state?.settings.character==='nuonuo'?'糯糯':'啾比');speechUntil=Date.now()+4000;pose(e.motion,2200);if(state)render(state);return;}
  if(['reminder','angry','preview'].includes(e)){pose(e==='angry'?'angry':'hop',2000);sound(e);}
  if(e==='acknowledged'){stopAudio();pose('happy',1600);}
});
window.workFeiBi.getState().then(next=>{render(next);scheduleIdle();});
