const test=require('node:test');const assert=require('node:assert/strict');
const {Journal,dayKey}=require('../src/journal');
test('学习记录按本地日期统计并提供连续七天',()=>{
  const date=new Date(2026,8,21,0,1);const j=new Journal();
  j.record(1500,date);j.record(2700,date);
  assert.equal(dayKey(date),'2026-09-21');
  assert.deepEqual(j.snapshot(date).today,{rounds:2,seconds:4200});
  assert.equal(j.snapshot(date).week.length,7);
  assert.equal(j.snapshot(date).week[0].day,'2026-09-15');
  assert.equal(j.snapshot(date).week[6].rounds,2);
});
test('任务增删完成切换与快照隔离',()=>{
  const j=new Journal();j.task('add','  读十页书  ');const id=j.tasks[0].id;
  j.task('toggle',id);assert.equal(j.tasks[0].done,true);
  j.snapshot().tasks[0].text='不能影响原记录';assert.equal(j.tasks[0].text,'读十页书');
  j.task('remove',id);assert.equal(j.tasks.length,0);assert.throws(()=>j.task('add',' '));
});
test('任务上限与损坏配置清洗',()=>{
  const j=new Journal({days:{'__proto__':{},bad:{rounds:123},'2026-09-21':{rounds:-1,seconds:Infinity}},tasks:[null,{id:'a',text:'ok',done:'yes'}]});
  assert.equal(j.tasks[0].done,false);assert.equal(j.days.bad,undefined);
  assert.deepEqual(j.days['2026-09-21'],{rounds:0,seconds:0});
  for(let i=1;i<30;i++)j.task('add',String(i));assert.throws(()=>j.task('add','31'));
});
