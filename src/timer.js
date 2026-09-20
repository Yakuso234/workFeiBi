const defaults = { studyMinutes:25, restMinutes:5, angryAfterSeconds:60, petScale:100, soundEnabled:true, idleMotion:true, outfit:1, volume:60 };
function sanitize(input = {}) {
  if(!input || typeof input!=='object') input={};
  const s = { ...defaults };
  for (const [key,min,max] of [['studyMinutes',1,240],['restMinutes',1,120],['angryAfterSeconds',10,600],['petScale',70,150],['volume',0,100],['outfit',0,2]]) {
    const n = Number(input[key]);
    if (Number.isFinite(n)) s[key] = Math.min(max,Math.max(min,Math.round(n)));
  }
  for (const key of ['soundEnabled','idleMotion']) if(typeof input[key]==='boolean') s[key]=input[key];
  return s;
}
class Timer {
  constructor(settings) { this.settings=sanitize(settings); this.phase='study'; this.rounds=0; this.reset(); }
  duration() { return this.settings[this.phase==='study'?'studyMinutes':'restMinutes']*60; }
  reset() { this.running=false; this.reminding=false; this.angry=false; this.remaining=this.duration(); this.reminderElapsed=0; this.deadline=0; this.due=0; }
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
  ack(now=Date.now()) { if(!this.reminding) return; this.phase=this.phase==='study'?'rest':'study'; this.reset(); this.toggle(now); return 'acknowledged'; }
  skip() { this.phase=this.phase==='study'?'rest':'study'; this.reset(); }
  configure(input) { this.settings=sanitize({...this.settings,...input}); }
  snapshot() { const {phase,rounds,running,reminding,angry,remaining,reminderElapsed}=this; return {phase,rounds,running,reminding,angry,remaining,reminderElapsed}; }
}
module.exports={Timer,sanitize,defaults};
