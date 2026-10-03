const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Timer,sanitize}=require('../src/timer');
test('重启恢复暂停进度，不静默开始或改变本轮时长',()=>{
 const t=new Timer();t.toggle(0);t.update(120000);t.configure({studyMinutes:45});
 const restored=new Timer(t.settings);restored.restore(t.serialize());
 assert.equal(restored.running,false);assert.equal(restored.remaining,1380);assert.equal(restored.sessionSeconds,1500);
 restored.toggle(200000);assert.equal(restored.deadline,1580000);
});
test('恢复未确认提醒与角色设置校验',()=>{
 const t=new Timer({character:'nuonuo'});t.toggle(0);t.update(1560000);
 const restored=new Timer(t.settings);restored.restore(t.serialize());
 assert.equal(restored.reminding,true);assert.equal(restored.angry,true);assert.equal(restored.rounds,1);
 assert.equal(sanitize({character:'../bad'}).character,'phoebe');assert.equal(sanitize({character:'nuonuo'}).character,'nuonuo');
 assert.equal(sanitize({character:'owl'}).character,'owl');assert.equal(sanitize({character:'__proto__'}).character,'phoebe');
});
test('完整学习、等待60秒、生气、确认休息与返回学习',()=>{
 const t=new Timer({studyMinutes:1,restMinutes:1});t.toggle(0);
 assert.equal(t.update(60000),'reminder');assert.equal(t.rounds,1);
 assert.equal(t.update(119999),undefined);assert.equal(t.angry,false);
 assert.equal(t.update(120000),'angry');assert.equal(t.update(121000),undefined);
 t.ack(122000);assert.equal(t.phase,'rest');assert.equal(t.angry,false);assert.equal(t.remaining,60);
 t.update(182000);t.ack(182000);assert.equal(t.phase,'study');assert.equal(t.rounds,1);
});
test('暂停不计时、恢复不丢剩余时间',()=>{const t=new Timer({studyMinutes:1});t.toggle(0);t.toggle(10000);t.update(100000);assert.equal(t.remaining,50);t.toggle(100000);t.update(149000);assert.equal(t.remaining,1);assert.equal(t.update(150000),'reminder');});
test('系统休眠跨过截止与等待期限，只触发一次生气',()=>{const t=new Timer({studyMinutes:1});t.toggle(0);assert.equal(t.update(200000),'angry');assert.equal(t.rounds,1);t.update(300000);assert.equal(t.rounds,1);});
test('修改设置不重置已暂停的进度，下一轮使用新设置',()=>{const t=new Timer({studyMinutes:1});t.toggle(0);t.toggle(10000);t.configure({studyMinutes:2});assert.equal(t.remaining,50);t.reset();assert.equal(t.remaining,120);});
test('输入校验限制无效、负数、越界时长',()=>{const s=sanitize({studyMinutes:-8,restMinutes:Infinity,petScale:999,volume:'bad',soundEnabled:'false'});assert.equal(s.studyMinutes,1);assert.equal(s.restMinutes,5);assert.equal(s.petScale,150);assert.equal(s.volume,60);assert.equal(s.soundEnabled,true);});
test('点击暂停恰逢到点，仍返回提醒事件',()=>{const t=new Timer({studyMinutes:1});t.toggle(0);assert.equal(t.toggle(60000),'reminder');assert.equal(t.reminding,true);assert.equal(t.rounds,1);});
test('重置与跳过清除生气标志且不虚增完成轮数',()=>{const t=new Timer({studyMinutes:1});t.toggle(0);t.update(120000);t.reset();assert.equal(t.angry,false);assert.equal(t.reminding,false);t.skip();assert.equal(t.rounds,1);assert.equal(t.phase,'rest');assert.equal(t.running,false);});
test('陪伴设置兼容旧配置，布尔和频率严格白名单',()=>{
 const legacy=sanitize({studyMinutes:50});
 assert.equal(legacy.idleFrequency,'normal');assert.equal(legacy.focusQuiet,true);
 assert.equal(legacy.reducedMotion,false);assert.equal(legacy.interactionSounds,false);assert.equal(legacy.impactEnabled,true);
 const changed=sanitize({idleFrequency:'calm',focusQuiet:false,reducedMotion:true,interactionSounds:true,impactEnabled:false});
 assert.equal(changed.idleFrequency,'calm');assert.equal(changed.focusQuiet,false);assert.equal(changed.reducedMotion,true);
 assert.equal(changed.interactionSounds,true);assert.equal(changed.impactEnabled,false);
 const bad=sanitize({idleFrequency:'__proto__',focusQuiet:'false',reducedMotion:1});
 assert.equal(bad.idleFrequency,'normal');assert.equal(bad.focusQuiet,true);assert.equal(bad.reducedMotion,false);
});
