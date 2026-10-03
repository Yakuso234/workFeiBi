// Shared deterministic rules; rendering, sound and desktop effects stay outside.
(function (scope) {
  const durations={blink:850,wave:2200,kick:2200,stretch:3000,look:2400,sleep:8000,turn:3600,angry:2200,sway:2600,happy:2200,hop:1400};
  const previewActions=Object.freeze(['blink','wave','kick','stretch','look','sleep','turn','angry']);
  function quiet(settings={},timer={}) {return Boolean(settings.focusQuiet&&timer.running&&timer.phase==='study'&&!timer.reminding);}
  function canSound(settings={},timer={}) {return Boolean(settings.soundEnabled&&settings.volume>0&&!quiet(settings,timer));}
  function idlePool(settings={},timer={}) {
    if(!settings.idleMotion||settings.reducedMotion||timer.reminding)return [];
    if(quiet(settings,timer))return ['blink'];
    const pool=timer.phase==='rest'?['sleep','sway','blink','look','turn','stretch']:['sway','happy','hop','blink','wave','kick','stretch','look','turn'];
    // The generated special poses wear the normal hat. Preserve other costumes.
    if(settings.character==='miku')return pool.filter(name=>name!=='turn');
    return settings.character==='phoebe'&&settings.outfit!==1?pool.filter(name=>['sway','happy','hop','blink','look'].includes(name)):pool;
  }
  function idleDelay(frequency='normal',random=Math.random) {
    const ranges={calm:[10000,18000],normal:[5000,9000],lively:[3000,5500]};
    const [min,max]=ranges[frequency]||ranges.normal;
    return min+Math.floor(Math.max(0,Math.min(.999999,random()))*(max-min));
  }
  function duration(name,value) {return Number.isFinite(value)?Math.max(300,Math.min(12000,value)):(durations[name]||2200);}
  class IdleBag {
    constructor(random=Math.random){this.random=random;this.bag=[];this.key='';this.last='';}
    next(pool){
      const unique=[...new Set(pool)],key=unique.join('|');
      if(key!==this.key){this.bag=[];this.key=key;}
      if(!unique.length)return null;
      if(!this.bag.length){
        this.bag=unique.slice();
        for(let i=this.bag.length-1;i>0;i--){const j=Math.floor(Math.max(0,Math.min(.999999,this.random()))*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];}
        if(this.bag.length>1&&this.bag.at(-1)===this.last)[this.bag[0],this.bag[this.bag.length-1]]=[this.bag.at(-1),this.bag[0]];
      }
      this.last=this.bag.pop();return this.last;
    }
  }
  const api={IdleBag,quiet,canSound,idlePool,idleDelay,duration,previewActions};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else scope.PetBehavior=api;
})(typeof window==='object'?window:globalThis);
