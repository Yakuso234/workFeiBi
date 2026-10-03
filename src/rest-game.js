// The main process owns the game. Snapshots never finish or restart a round.
const DURATION_MS=45000;
const MAX_SCORE=60;
const HIT_COOLDOWN_MS=250;
const MAX_PLAYED=1000000;
let nextInstance=0;

const savedNumber=(saved,key,max)=>Object.hasOwn(saved,key)&&typeof saved[key]==='number'&&Number.isFinite(saved[key])
  ?Math.max(0,Math.min(max,Math.floor(saved[key]))):0;
const timestamp=now=>{
  if(typeof now!=='number'||!Number.isFinite(now)||Math.abs(now)>Number.MAX_SAFE_INTEGER-DURATION_MS){
    throw new TypeError('小游戏时间必须是有限的安全数值');
  }
  return now;
};

class RestGame {
  #active=false;
  #score=0;
  #startedAt=0;
  #deadline=0;
  #lastHit=-Infinity;
  #session=0;
  #targetNumber=0;
  #target=null;
  #result=null;
  #instance;
  #random;
  #best;
  #played;
  #totalStars;
  #lastScore;

  constructor(saved={},options={}){
    if(!saved||typeof saved!=='object'||Array.isArray(saved))saved={};
    if(!options||typeof options!=='object')options={};
    this.#best=savedNumber(saved,'best',MAX_SCORE);
    this.#played=savedNumber(saved,'played',MAX_PLAYED);
    this.#totalStars=savedNumber(saved,'totalStars',MAX_PLAYED*MAX_SCORE);
    this.#lastScore=savedNumber(saved,'lastScore',MAX_SCORE);
    this.#instance=++nextInstance;
    this.#random=typeof options.random==='function'?options.random:Math.random;
  }

  serialize(){
    return {best:this.#best,played:this.#played,totalStars:this.#totalStars,lastScore:this.#lastScore};
  }

  snapshot(now=Date.now()){
    timestamp(now);
    return {
      ...this.serialize(),
      active:this.#active,
      durationMs:DURATION_MS,
      remainingMs:this.#active?Math.max(0,Math.min(DURATION_MS,this.#deadline-now)):0,
      score:this.#score,
      target:this.#active&&this.#target?{...this.#target}:null,
      result:this.#result?{...this.#result}:null,
    };
  }

  start(now=Date.now()){
    timestamp(now);
    if(this.#active)return false;
    this.#active=true;
    this.#score=0;
    this.#startedAt=now;
    this.#deadline=now+DURATION_MS;
    this.#lastHit=-Infinity;
    this.#session++;
    this.#targetNumber=0;
    this.#result=null;
    this.#newTarget();
    return true;
  }

  hit(targetId,now=Date.now()){
    timestamp(now);
    if(!this.#active||now<this.#startedAt||now>=this.#deadline||this.#score>=MAX_SCORE
      ||!this.#target||typeof targetId!=='string'||targetId!==this.#target.id
      ||now-this.#lastHit<HIT_COOLDOWN_MS)return false;
    this.#lastHit=now;
    this.#score++;
    if(this.#score<MAX_SCORE)this.#newTarget();else this.#target=null;
    return true;
  }

  // Completion is emitted once here, allowing the owner to save and notify once.
  update(now=Date.now()){
    timestamp(now);
    if(!this.#active||(now<this.#deadline&&this.#score<MAX_SCORE))return null;
    const reason=now>=this.#deadline?'timeout':'score-limit';
    const newBest=this.#score>this.#best;
    this.#best=Math.max(this.#best,this.#score);
    this.#played=Math.min(MAX_PLAYED,this.#played+1);
    this.#totalStars=Math.min(MAX_PLAYED*MAX_SCORE,this.#totalStars+this.#score);
    this.#lastScore=this.#score;
    this.#active=false;
    this.#target=null;
    this.#result={kind:'complete',reason,score:this.#score,newBest};
    return {type:'game-complete',reason,score:this.#score,newBest,...this.serialize()};
  }

  cancel(reason='canceled',now=Date.now()){
    timestamp(now);
    if(!this.#active)return false;
    this.#active=false;
    this.#target=null;
    const safeReason=typeof reason==='string'?reason.trim().slice(0,80):'';
    this.#result={kind:'canceled',reason:safeReason||'canceled',score:this.#score};
    return true;
  }

  #newTarget(){
    const unit=()=>{
      const value=this.#random();
      return typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1,value)):0.5;
    };
    this.#target={
      id:`${this.#instance}:${this.#session}:${++this.#targetNumber}`,
      x:Math.round((12+unit()*76)*100)/100,
      y:Math.round((15+unit()*70)*100)/100,
    };
  }
}

module.exports={RestGame,DURATION_MS,MAX_SCORE,HIT_COOLDOWN_MS};
