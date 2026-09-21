// Interactions are session-only and never advance or dismiss the study timer.
const responses = {
  pat: {motion:'wave', text:'摸摸收到啦！挥挥手，啾比陪你慢慢完成。'},
  feed: {motion:'kick', text:'啊呜！开心得踢踢脚，点心收下啦。'},
  stretch: {motion:'stretch', text:'一起伸个懒腰，放松肩膀，再看看远处～'},
  sleep: {motion:'sleep', text:'闭眼休息一下，我就在你旁边。'},
  turn: {motion:'turn', text:'转个身，马上回来陪你。'},
};
class Companion {
  constructor(){this.count=0;this.last=-Infinity;this.message='我在这里陪你。今天也一起认真一点点。';}
  snapshot(){return {count:this.count,message:this.message};}
  interact(kind, reminding, now=Date.now()){
    if(!Object.hasOwn(responses,kind))return null;
    if(reminding){this.message='先确认学习或休息提醒，再来玩吧。';return null;}
    if(now-this.last<2500){this.message='慢一点啦，啾比还没反应过来呢。';return null;}
    this.last=now;this.count++;this.message=responses[kind].text;
    return {type:'interaction',...responses[kind]};
  }
}
module.exports={Companion};
