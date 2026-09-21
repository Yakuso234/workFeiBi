const {randomUUID}=require('node:crypto');
const clamp=(n,max)=>Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;
function dayKey(date=new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
class Journal {
  constructor(input={}) {
    this.days={};this.tasks=[];
    if(!input||typeof input!=='object')input={};
    for(const [key,value] of Object.entries(input.days||{}).slice(-90)) {
      if(/^\d{4}-\d{2}-\d{2}$/.test(key)&&value&&typeof value==='object')
        this.days[key]={rounds:clamp(value.rounds,1000),seconds:clamp(value.seconds,86400)};
    }
    if(Array.isArray(input.tasks))for(const task of input.tasks.slice(0,30)) {
      if(task&&typeof task.id==='string'&&typeof task.text==='string'&&task.text.trim())
        this.tasks.push({id:task.id.slice(0,64),text:task.text.trim().slice(0,100),done:task.done===true});
    }
  }
  record(seconds,date=new Date()) {
    const key=dayKey(date),entry=this.days[key]||{rounds:0,seconds:0};
    entry.rounds++;entry.seconds+=clamp(seconds,14400);this.days[key]=entry;
    for(const old of Object.keys(this.days).sort().slice(0,-90))delete this.days[old];
  }
  task(action,input) {
    if(action==='add') {
      const text=typeof input==='string'?input.trim().slice(0,100):'';
      if(!text)throw new Error('先写下一件想完成的小事。');
      if(this.tasks.length>=30)throw new Error('最多保留 30 项任务，请先移除已完成的任务。');
      this.tasks.push({id:randomUUID(),text,done:false});
    } else if(action==='toggle') {
      const task=this.tasks.find(t=>t.id===input);if(task)task.done=!task.done;
    } else if(action==='remove')this.tasks=this.tasks.filter(t=>t.id!==input);
    else throw new Error('未知任务操作');
  }
  snapshot(date=new Date()) {
    const today=this.days[dayKey(date)]||{rounds:0,seconds:0};
    const week=[];
    for(let i=6;i>=0;i--){const d=new Date(date);d.setDate(d.getDate()-i);const key=dayKey(d);week.push({day:key,...(this.days[key]||{rounds:0,seconds:0})});}
    return {today:{...today},week,tasks:this.tasks.map(t=>({...t}))};
  }
  serialize(){return {days:this.days,tasks:this.tasks};}
}
module.exports={Journal,dayKey};
