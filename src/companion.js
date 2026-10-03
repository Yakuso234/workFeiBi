// Care is earned through interaction and focus rounds, never lost while away.
const responses = {
  pat: {motion:'wave', duration:2600, sound:'pat', text:'摸摸收到啦！挥挥手，啾比陪你慢慢完成。'},
  feed: {motion:'kick', duration:3200, sound:'feed', text:'啊呜！开心得踢踢脚，点心收下啦。'},
  stretch: {motion:'stretch', duration:3600, sound:'stretch', text:'一起伸个懒腰，放松肩膀，再看看远处～'},
  sleep: {motion:'sleep', duration:8000, sound:'sleep', text:'闭眼休息一下，我就在你旁边。'},
  turn: {motion:'turn', duration:3000, sound:'turn', text:'转个身，马上回来陪你。'},
  cheer: {motion:'happy', duration:3800, sound:'pat', text:'啾比给你加油！从眼前的一小步开始吧。'},
};
const encouragements=Object.freeze([
  '不用一下做到完美，啾比陪你从一小步开始。',
  '已经认真努力啦！先完成眼前这一件小事。',
  '卡住也没关系，我们慢慢拆开它，一点点来。',
  '今天的你也值得鼓励，啾比给你比个小爱心！',
  '专心一会儿，再好好休息。啾比一直在旁边。',
  '比起急着做很多，我们一起把这一小段做好。'
]);
const bounded=(value,fallback,max=100)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(max,Math.floor(value))):fallback;
class Companion {
  constructor(saved={}){
    if(!saved||typeof saved!=='object')saved={};
    this.count=0;this.last=-Infinity;this.message='我在这里陪你。今天也一起认真一点点。';
    this.totalInteractions=bounded(saved.totalInteractions,0,1000000);
    this.completedRounds=bounded(saved.completedRounds,0,1000000);
    this.bond=bounded(saved.bond,0);this.mood=bounded(saved.mood,70);this.energy=bounded(saved.energy,80);
  }
  serialize(){const {totalInteractions,completedRounds,bond,mood,energy}=this;return {totalInteractions,completedRounds,bond,mood,energy};}
  snapshot(){
    const unlocked=[];
    if(this.totalInteractions>=1)unlocked.push('初次招呼');
    if(this.totalInteractions>=10)unlocked.push('熟悉的陪伴');
    if(this.completedRounds>=1)unlocked.push('第一轮专注');
    if(this.completedRounds>=10)unlocked.push('十轮同行');
    if(this.bond>=80)unlocked.push('默契搭档');
    return {...this.serialize(),count:this.count,message:this.message,level:this.bond>=80?'默契搭档':this.bond>=50?'熟悉伙伴':this.bond>=20?'渐渐熟悉':'初次相伴',unlocked};
  }
  completeRound(){this.completedRounds=Math.min(1000000,this.completedRounds+1);this.bond=Math.min(100,this.bond+5);this.mood=Math.min(100,this.mood+4);this.energy=Math.max(0,this.energy-2);}
  interact(kind, reminding, now=Date.now()){
    if(!Object.hasOwn(responses,kind))return null;
    if(reminding){this.message='先确认学习或休息提醒，再来玩吧。';return null;}
    if(now-this.last<2500){this.message='慢一点啦，啾比还没反应过来呢。';return null;}
    this.last=now;this.count++;this.totalInteractions=Math.min(1000000,this.totalInteractions+1);this.message=kind==='cheer'?`加油！${encouragements[(this.totalInteractions-1)%encouragements.length]}`:responses[kind].text;
    this.bond=Math.min(100,this.bond+1);
    this.mood=Math.min(100,this.mood+(kind==='pat'?6:kind==='feed'?4:2));
    this.energy=Math.min(100,Math.max(0,this.energy+(kind==='sleep'?12:kind==='feed'?8:kind==='stretch'?3:0)));
    return {type:'interaction',...responses[kind],text:this.message};
  }
}
module.exports={Companion};
