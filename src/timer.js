const characters=require('./characters');
const defaults = { studyMinutes:25, restMinutes:5, longBreakEnabled:false, longBreakMinutes:15, longBreakEvery:4, angryAfterSeconds:60, petScale:100, soundEnabled:true, idleMotion:true, outfit:1, volume:60, dailyGoal:4, character:'phoebe', idleFrequency:'normal', focusQuiet:true, reducedMotion:false, impactEnabled:true, interactionSounds:false, owlPalette:'classic', owlAccessory:'none' };
function sanitize(input = {}) {
  if(!input || typeof input!=='object') input={};
  const s = { ...defaults };
  for (const [key,min,max] of [['studyMinutes',1,240],['restMinutes',1,120],['angryAfterSeconds',10,600],['petScale',70,150],['volume',0,100],['outfit',0,2],['dailyGoal',1,20]]) {
    const n = Number(input[key]);
    if (Number.isFinite(n)) s[key] = Math.min(max,Math.max(min,Math.round(n)));
  }
  for(const [key,min,max] of [['longBreakMinutes',1,120],['longBreakEvery',2,12]]){
    const n=input[key];
    if(Object.hasOwn(input,key)&&typeof n==='number'&&Number.isFinite(n))s[key]=Math.min(max,Math.max(min,Math.round(n)));
  }
  for (const key of ['soundEnabled','idleMotion','focusQuiet','reducedMotion','impactEnabled','interactionSounds']) if(typeof input[key]==='boolean') s[key]=input[key];
  if(Object.hasOwn(input,'longBreakEnabled')&&typeof input.longBreakEnabled==='boolean')s.longBreakEnabled=input.longBreakEnabled;
  if(['calm','normal','lively'].includes(input.idleFrequency))s.idleFrequency=input.idleFrequency;
  if(characters.valid(input.character))s.character=input.character;
  if(['classic','neon','moon'].includes(input.owlPalette))s.owlPalette=input.owlPalette;
  if(['none','star','headphones'].includes(input.owlAccessory))s.owlAccessory=input.owlAccessory;
  return s;
}
class Timer {
  constructor(settings) { this.settings=sanitize(settings); this.phase='study'; this.rounds=0; this.breakKind=null; this.restEligible=false; this.reset(); }
  duration() { return this.settings[this.phase==='study'?'studyMinutes':this.breakKind==='long'?'longBreakMinutes':'restMinutes']*60; }
  reset() {
    // Only a confirmed, completed study round makes this rest eligible. A
    // skipped study cannot repeatedly reuse an earlier Nth-round long break.
    if(this.phase==='study'){this.breakKind=null;this.restEligible=false;}
    else this.breakKind=this.restEligible&&this.settings.longBreakEnabled&&this.rounds>0&&this.rounds%this.settings.longBreakEvery===0?'long':'short';
    this.running=false;this.reminding=false;this.angry=false;this.remaining=this.duration();this.sessionSeconds=this.remaining;this.reminderElapsed=0;this.deadline=0;this.due=0;
  }
  toggle(now=Date.now()) {
    if(this.reminding) return this.ack(now);
    if(this.running) { const event=this.update(now); if(this.reminding) return event; this.running=false; }
    else { this.running=true; this.deadline=now+this.remaining*1000; }
  }
  update(now=Date.now()) {
    let event;
    if(this.running) {
      this.remaining=Math.max(0,Math.ceil((this.deadline-now)/1000));
      if(!this.remaining) { this.running=false; this.reminding=true; this.due=this.deadline; if(this.phase==='study') this.rounds++; event='reminder'; }
    }
    if(this.reminding) {
      this.reminderElapsed=Math.max(0,Math.floor((now-this.due)/1000));
      if(!this.angry && this.reminderElapsed>=this.settings.angryAfterSeconds) { this.angry=true; event='angry'; }
    }
    return event;
  }
  ack(now=Date.now()) { if(!this.reminding) return; this.restEligible=this.phase==='study';this.phase=this.phase==='study'?'rest':'study'; this.reset(); this.toggle(now); return 'acknowledged'; }
  skip() { this.restEligible=false;this.phase=this.phase==='study'?'rest':'study'; this.reset(); }
  configure(input) { this.settings=sanitize({...this.settings,...input}); }
  restore(input) {
    if(!input||typeof input!=='object'||!['study','rest'].includes(input.phase))return;
    this.phase=input.phase;this.restEligible=false;this.reset();
    // Preserve the saved kind independently of current settings. Legacy rest
    // sessions without a kind remain short even if long breaks are now enabled.
    this.breakKind=this.phase==='study'?null:Object.hasOwn(input,'breakKind')&&input.breakKind==='long'?'long':'short';
    this.restEligible=this.phase==='rest'&&((Object.hasOwn(input,'restEligible')&&input.restEligible===true)||(!Object.hasOwn(input,'restEligible')&&this.breakKind==='long'));
    this.remaining=this.duration();this.sessionSeconds=this.remaining;
    if(Number.isFinite(input.sessionSeconds))this.sessionSeconds=Math.max(60,Math.min(this.phase==='study'?14400:7200,Math.round(input.sessionSeconds)));
    this.remaining=this.sessionSeconds;
    if(Number.isFinite(input.remaining))this.remaining=Math.max(0,Math.min(this.sessionSeconds,Math.round(input.remaining)));
    if(Number.isFinite(input.rounds))this.rounds=Math.max(0,Math.min(100000,Math.floor(input.rounds)));
    // An interrupted session resumes paused instead of silently starting.
    this.reminding=input.reminding===true;
    if(this.reminding){this.remaining=0;this.due=Number.isFinite(input.due)?Math.min(input.due,Date.now()):Date.now();this.angry=input.angry===true;}
    else if(this.remaining===0)this.remaining=this.sessionSeconds;
  }
  serialize(){return {...this.snapshot(),due:this.due};}
  snapshot() { const {phase,rounds,running,reminding,angry,remaining,reminderElapsed,sessionSeconds,breakKind,restEligible}=this; return {phase,rounds,running,reminding,angry,remaining,reminderElapsed,sessionSeconds,breakKind,restEligible}; }
}
module.exports={Timer,sanitize,defaults};
