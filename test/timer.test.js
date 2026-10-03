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
 assert.equal(sanitize({character:'miku'}).character,'miku');
});
test('发条鸮外观兼容旧配置并限制为明确的配色和头饰',()=>{
 assert.equal(sanitize({}).owlPalette,'classic');assert.equal(sanitize({}).owlAccessory,'none');
 assert.equal(sanitize({owlPalette:'neon',owlAccessory:'star'}).owlPalette,'neon');
 assert.equal(sanitize({owlPalette:'moon',owlAccessory:'headphones'}).owlAccessory,'headphones');
 const bad=sanitize({owlPalette:'__proto__',owlAccessory:['star']});
 assert.equal(bad.owlPalette,'classic');assert.equal(bad.owlAccessory,'none');
 const timer=new Timer({owlPalette:'moon',owlAccessory:'star'});timer.configure({character:'miku'});
 assert.equal(timer.settings.owlPalette,'moon');assert.equal(timer.settings.owlAccessory,'star');
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

function completeStudy(timer,now){
 assert.equal(timer.phase,'study');
 if(!timer.running)timer.toggle(now);
 const due=timer.deadline;assert.equal(timer.update(due),'reminder');
 assert.equal(timer.ack(due),'acknowledged');
 return due;
}
function completeRest(timer){
 assert.equal(timer.phase,'rest');const due=timer.deadline;
 assert.equal(timer.update(due),'reminder');assert.equal(timer.ack(due),'acknowledged');
 return due;
}

test('长休息默认关闭，新增设置使用严格布尔和数值边界',()=>{
 const legacy=sanitize({studyMinutes:50});
 assert.equal(legacy.longBreakEnabled,false);assert.equal(legacy.longBreakMinutes,15);assert.equal(legacy.longBreakEvery,4);
 const low=sanitize({longBreakEnabled:true,longBreakMinutes:-5,longBreakEvery:0});
 assert.equal(low.longBreakEnabled,true);assert.equal(low.longBreakMinutes,1);assert.equal(low.longBreakEvery,2);
 const high=sanitize({longBreakMinutes:121.8,longBreakEvery:50});
 assert.equal(high.longBreakMinutes,120);assert.equal(high.longBreakEvery,12);
 const fractional=sanitize({longBreakMinutes:20.4,longBreakEvery:3.7});
 assert.equal(fractional.longBreakMinutes,20);assert.equal(fractional.longBreakEvery,4);
 for(const value of ['30',null,true,NaN,Infinity,{},['12']]){
  const invalid=sanitize({longBreakEnabled:value,longBreakMinutes:value,longBreakEvery:value});
  assert.equal(invalid.longBreakEnabled,typeof value==='boolean'?value:false);
  assert.equal(invalid.longBreakMinutes,15);assert.equal(invalid.longBreakEvery,4);
 }
 const inherited=sanitize(Object.create({longBreakEnabled:true,longBreakMinutes:120,longBreakEvery:2}));
 assert.equal(inherited.longBreakEnabled,false);assert.equal(inherited.longBreakMinutes,15);assert.equal(inherited.longBreakEvery,4);
});

test('每4轮真实学习完成并确认后长休，休息完成不计学习轮数',()=>{
 const timer=new Timer({studyMinutes:1,restMinutes:2,longBreakEnabled:true,longBreakMinutes:15,longBreakEvery:4});
 let now=0;
 for(let round=1;round<=8;round++){
  now=completeStudy(timer,now);
  assert.equal(timer.rounds,round);assert.equal(timer.phase,'rest');
  assert.equal(timer.breakKind,round%4===0?'long':'short');
  assert.equal(timer.sessionSeconds,round%4===0?900:120);
  assert.equal(timer.remaining,timer.sessionSeconds);
  now=completeRest(timer);assert.equal(timer.rounds,round);assert.equal(timer.breakKind,null);
 }
});

test('关闭长休与旧行为兼容，恰逢第4轮也仍为短休',()=>{
 const timer=new Timer({studyMinutes:1,restMinutes:1,longBreakMinutes:90,longBreakEvery:2});let now=0;
 for(let round=1;round<=4;round++){
  now=completeStudy(timer,now);assert.equal(timer.rounds,round);assert.equal(timer.breakKind,'short');
  assert.equal(timer.sessionSeconds,60);now=completeRest(timer);
 }
});

test('暂停、重置、跳过不刷轮次，也不能重复使用之前第N轮长休资格',()=>{
 const timer=new Timer({studyMinutes:1,restMinutes:1,longBreakEnabled:true,longBreakEvery:2});
 timer.toggle(0);timer.toggle(10000);timer.update(100000);
 assert.equal(timer.rounds,0);assert.equal(timer.remaining,50);
 timer.reset();assert.equal(timer.rounds,0);assert.equal(timer.breakKind,null);
 timer.skip();assert.equal(timer.rounds,0);assert.equal(timer.breakKind,'short');
 timer.reset();assert.equal(timer.breakKind,'short');timer.skip();
 let now=completeStudy(timer,200000);now=completeRest(timer);
 now=completeStudy(timer,now);assert.equal(timer.rounds,2);assert.equal(timer.breakKind,'long');
 timer.skip();assert.equal(timer.phase,'study');assert.equal(timer.rounds,2);assert.equal(timer.breakKind,null);
 timer.skip();assert.equal(timer.phase,'rest');assert.equal(timer.breakKind,'short');
 timer.reset();assert.equal(timer.breakKind,'short');assert.equal(timer.rounds,2);
 timer.configure({longBreakEvery:4});timer.reset();assert.equal(timer.breakKind,'short');
});

test('休息当轮kind和时长固定，显式reset或下轮切换应用新设置',()=>{
 const timer=new Timer({studyMinutes:1,restMinutes:2,longBreakEnabled:true,longBreakEvery:2,longBreakMinutes:15});
 let now=completeStudy(timer,0);now=completeRest(timer);now=completeStudy(timer,now);
 timer.toggle(now+60000);const before=timer.snapshot();
 assert.equal(before.breakKind,'long');assert.equal(before.remaining,840);
 timer.configure({longBreakEnabled:false,longBreakMinutes:30,restMinutes:3,longBreakEvery:3});
 assert.equal(timer.breakKind,'long');assert.equal(timer.sessionSeconds,900);assert.equal(timer.remaining,840);
 assert.equal(timer.running,false);assert.equal(timer.rounds,2);
 timer.reset();assert.equal(timer.breakKind,'short');assert.equal(timer.sessionSeconds,180);assert.equal(timer.remaining,180);
 timer.configure({longBreakEnabled:true,longBreakEvery:2,longBreakMinutes:20});
 assert.equal(timer.breakKind,'short');assert.equal(timer.sessionSeconds,180);
 timer.reset();assert.equal(timer.breakKind,'long');assert.equal(timer.sessionSeconds,1200);
 timer.toggle(now+60000);now=completeRest(timer);assert.equal(timer.breakKind,null);
 now=completeStudy(timer,now);assert.equal(timer.rounds,3);assert.equal(timer.breakKind,'short');assert.equal(timer.sessionSeconds,180);
 timer.configure({longBreakEvery:3});assert.equal(timer.breakKind,'short');timer.reset();assert.equal(timer.breakKind,'long');
});

test('重启当前长休按原kind和session恢复为暂停，不按新设置更改',()=>{
 const timer=new Timer({studyMinutes:1,restMinutes:1,longBreakEnabled:true,longBreakEvery:2,longBreakMinutes:15});
 let now=completeStudy(timer,0);now=completeRest(timer);now=completeStudy(timer,now);
 timer.update(now+60000);timer.configure({longBreakEnabled:false,longBreakMinutes:45,restMinutes:8});
 const saved=timer.serialize();assert.equal(saved.breakKind,'long');assert.equal(saved.restEligible,true);
 const restored=new Timer(timer.settings);restored.restore(JSON.parse(JSON.stringify(saved)));
 assert.equal(restored.phase,'rest');assert.equal(restored.breakKind,'long');assert.equal(restored.sessionSeconds,900);
 assert.equal(restored.remaining,840);assert.equal(restored.running,false);assert.equal(restored.rounds,2);
 restored.toggle(now+300000);assert.equal(restored.deadline,now+1140000);
 restored.toggle(now+300000);restored.reset();
 assert.equal(restored.breakKind,'short');assert.equal(restored.sessionSeconds,480);
});

test('长休未确认提醒与怒气能够恢复，确认后学习的breakKind为null',()=>{
 const timer=new Timer({studyMinutes:1,restMinutes:1,longBreakEnabled:true,longBreakEvery:2,longBreakMinutes:2});
 let now=completeStudy(timer,0);now=completeRest(timer);now=completeStudy(timer,now);
 timer.update(timer.deadline+60000);assert.equal(timer.reminding,true);assert.equal(timer.angry,true);
 const restored=new Timer({...timer.settings,longBreakEnabled:false});restored.restore(timer.serialize());
 assert.equal(restored.breakKind,'long');assert.equal(restored.sessionSeconds,120);assert.equal(restored.remaining,0);
 assert.equal(restored.running,false);assert.equal(restored.reminding,true);assert.equal(restored.angry,true);
 restored.ack(now+200000);assert.equal(restored.phase,'study');assert.equal(restored.breakKind,null);
 assert.equal(restored.reminding,false);assert.equal(restored.angry,false);assert.equal(restored.rounds,2);
});

test('旧rest缺少kind保持短休，损坏kind和会话数值有清洗边界',()=>{
 const settings={longBreakEnabled:true,longBreakEvery:4,longBreakMinutes:15,restMinutes:5};
 const legacy=new Timer(settings);legacy.restore({phase:'rest',rounds:4,remaining:100,sessionSeconds:300});
 assert.equal(legacy.breakKind,'short');assert.equal(legacy.sessionSeconds,300);assert.equal(legacy.remaining,100);
 legacy.reset();assert.equal(legacy.breakKind,'short');assert.equal(legacy.restEligible,false);
 for(const kind of [undefined,null,'LONG','../long','__proto__',{},['long']]){
  const timer=new Timer(settings);timer.restore({phase:'rest',breakKind:kind,rounds:4,sessionSeconds:300,remaining:90});
  assert.equal(timer.breakKind,'short');assert.equal(timer.remaining,90);
 }
 const inherited=new Timer(settings);inherited.restore(Object.assign(Object.create({breakKind:'long'}),{phase:'rest',rounds:4}));
 assert.equal(inherited.breakKind,'short');
 const damaged=new Timer(settings);damaged.restore({phase:'rest',breakKind:'long',restEligible:'true',rounds:-20,sessionSeconds:99999,remaining:999999});
 assert.equal(damaged.breakKind,'long');assert.equal(damaged.restEligible,false);assert.equal(damaged.rounds,0);
 assert.equal(damaged.sessionSeconds,7200);assert.equal(damaged.remaining,7200);
 const missing=new Timer(settings);missing.restore({phase:'rest',breakKind:'long',sessionSeconds:120,remaining:NaN});
 assert.equal(missing.sessionSeconds,120);assert.equal(missing.remaining,120);
 const study=new Timer(settings);study.restore({phase:'study',breakKind:'long',restEligible:true,sessionSeconds:-1,remaining:0});
 assert.equal(study.breakKind,null);assert.equal(study.restEligible,false);assert.equal(study.sessionSeconds,60);assert.equal(study.remaining,60);
});
