const assert=require('node:assert/strict');
const fs=require('node:fs');
const {Timer}=require('./timer');
const characters=require('./characters');

module.exports=async({pet,w,action,state,timer,context,waitFor,capture})=>{
  const execute=code=>w.webContents.executeJavaScript(code);
  const petExecute=code=>pet.webContents.executeJavaScript(code);
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const initialSettings={...state().settings};
  const originalTasks=state().journal.tasks;
  let taskId;
  const scores=()=>JSON.stringify(state().companion);
  const totals=()=>state().journal.week.reduce((sum,day)=>({rounds:sum.rounds+day.rounds,seconds:sum.seconds+day.seconds}),{rounds:0,seconds:0});
  const eventCount=type=>petExecute(`window.__cadenceEvents.filter(event=>event.type===${JSON.stringify(type)}).length`);
  const saveForm=async(enabled,minutes)=>{
    await execute(`render(currentState,true);document.querySelector('[data-tab="config"]').click();document.getElementById('longBreakEnabled').checked=${enabled};document.getElementById('longBreakEvery').value='2';document.getElementById('longBreakMinutes').value=${JSON.stringify(String(minutes))};document.getElementById('save').click()`);
    await waitFor(()=>state().settings.longBreakEnabled===enabled&&state().settings.longBreakMinutes===minutes&&state().settings.longBreakEvery===2,'long-break settings form did not save');
  };
  const expire=async(phase,rounds)=>{
    if(!state().timer.running)action('toggle');
    assert.equal(state().timer.phase,phase);assert.equal(state().timer.running,true);
    // Accelerate the deadline only. The actual main-process interval owns
    // completion, reminders, journal rewards, persistence and rendering.
    timer.deadline=Date.now()-1;
    await waitFor(()=>state().timer.reminding&&state().timer.rounds===rounds,`${phase} deadline did not produce a real reminder`);
  };
  const acknowledge=async phase=>{
    await petExecute(`window.workFeiBi.petClick()`);
    await waitFor(()=>!state().timer.reminding&&state().timer.phase===phase&&state().timer.running,'pet click did not acknowledge reminder');
  };
  try{
    assert.equal(initialSettings.studyMinutes,25);assert.equal(initialSettings.restMinutes,5);
    await petExecute(`window.__cadenceCapture=true;window.__cadenceEvents=[];window.workFeiBi.onPetEvent(event=>{if(window.__cadenceCapture)window.__cadenceEvents.push(typeof event==='string'?{type:event}:event);})`);
    action('reset');if(state().timer.phase==='rest')action('skip');
    const initialRounds=state().timer.rounds,initialCompleted=state().companion.completedRounds,initialTotals=totals();
    await saveForm(true,3);
    assert.equal(state().settings.studyMinutes,25);assert.equal(state().settings.restMinutes,5);
    assert.equal(state().timer.phase,'study');assert.equal(state().timer.sessionSeconds,1500);
    const target=initialRounds+(initialRounds%2===0?2:1);
    for(let rounds=initialRounds+1;rounds<=target;rounds++){
      await expire('study',rounds);
      if(rounds===target){
        await waitFor(()=>petExecute(`document.getElementById('bubbleTitle').textContent.includes('长休息')`),'pet reminder did not announce upcoming long break');
      }
      await acknowledge('rest');
      assert.equal(state().timer.breakKind,rounds===target?'long':'short');
      assert.equal(state().timer.sessionSeconds,rounds===target?180:300);
      if(rounds!==target){await expire('rest',rounds);await acknowledge('study');}
    }
    const completed=target-initialRounds;
    assert.ok(completed>=1&&completed<=2);
    assert.equal(state().companion.completedRounds,initialCompleted+completed);
    assert.deepEqual(totals(),{rounds:initialTotals.rounds+completed,seconds:initialTotals.seconds+1500*completed});
    await waitFor(()=>petExecute(`document.getElementById('timerBadge').textContent.includes('长休息')`),'pet badge did not label long break');
    await waitFor(()=>execute(`document.getElementById('phase').textContent==='长休息阶段'&&document.getElementById('breakCadence').textContent.includes('3 分钟长休息')`),'console did not render the current long-break duration');
    await capture(pet,'long-break.png');await capture(w,'long-break-console.png');
    // Saving a different future cadence must not rewrite the in-flight rest.
    await saveForm(false,4);
    assert.equal(state().timer.phase,'rest');assert.equal(state().timer.breakKind,'long');assert.equal(state().timer.sessionSeconds,180);
    await waitFor(()=>execute(`document.getElementById('breakCadence').textContent.includes('3 分钟长休息')`),'disabled future cadence changed the current long-break label');
    action('toggle');assert.equal(state().timer.running,false);
    const saved=JSON.parse(fs.readFileSync(context.configPath,'utf8'));
    assert.equal(saved.session.breakKind,'long');assert.equal(saved.session.sessionSeconds,180);assert.equal(saved.session.running,false);
    const restored=new Timer(saved.settings);restored.restore(saved.session);
    assert.equal(restored.phase,'rest');assert.equal(restored.breakKind,'long');assert.equal(restored.sessionSeconds,180);assert.equal(restored.running,false);
    const beforeGame=JSON.stringify({timer:state().timer,journal:state().journal,companion:state().companion});
    const gameHistory={played:state().game.played,best:state().game.best,totalStars:state().game.totalStars};
    await execute(`document.querySelector('[data-tab="arcade"]').click();document.getElementById('gameStart').click()`);
    await waitFor(async()=>state().game.active&&await execute(`currentState.game.active`),'long-break arcade did not start');
    await execute(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`);
    await waitFor(()=>!state().game.active&&state().game.result?.reason==='user','Escape did not cancel the active long-break game');
    await waitFor(()=>execute(`!document.getElementById('gameStart').disabled`),'arcade did not settle after Escape');
    const gameEvents=await eventCount('game');
    // Start and Escape in one renderer task, before the start response arrives.
    // The two real main events prove this was a start/cancel, not a no-op on an
    // already inactive game; a subsequent get-state provides an IPC barrier.
    await execute(`document.getElementById('gameStart').click();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));window.workFeiBi.getState()`);
    await waitFor(async()=>await eventCount('game')===gameEvents+2,'pending start/Escape did not reach both real main operations');
    assert.equal(state().game.active,false);assert.equal(state().game.result.reason,'user');
    await waitFor(()=>execute(`document.getElementById('gameTarget').hidden&&!document.getElementById('gameStart').disabled`),'late start response reopened the canceled arcade');
    assert.deepEqual({played:state().game.played,best:state().game.best,totalStars:state().game.totalStars},gameHistory);
    assert.equal(JSON.stringify({timer:state().timer,journal:state().journal,companion:state().companion}),beforeGame);
    const beforeRestFinish=scores(),beforeRestJournal=JSON.stringify(state().journal);
    await expire('rest',target);await acknowledge('study');
    assert.equal(state().timer.breakKind,null);assert.equal(state().timer.sessionSeconds,1500);
    assert.equal(scores(),beforeRestFinish);assert.equal(JSON.stringify(state().journal),beforeRestJournal);
    action('reset');assert.equal(state().timer.rounds,target);
    action('skip');assert.equal(state().timer.phase,'rest');assert.equal(state().timer.breakKind,'short');assert.equal(state().timer.sessionSeconds,300);
    assert.equal(state().timer.rounds,target);action('skip');assert.equal(state().timer.phase,'study');assert.equal(state().timer.rounds,target);
    // A real encouragement button click uses the interaction cooldown and
    // may reward one interaction, never an additional completed focus round.
    await delay(2600);
    const beforeCheer=state().companion,beforeCheerTimer=JSON.stringify(state().timer),beforeCheerJournal=JSON.stringify(state().journal);
    await execute(`document.querySelector('[data-tab="dashboard"]').click();document.querySelector('[data-interact="cheer"]').click()`);
    await waitFor(()=>state().companion.count===beforeCheer.count+1,'encouragement button did not invoke a real companion interaction');
    assert.equal(state().companion.totalInteractions,beforeCheer.totalInteractions+1);assert.equal(state().companion.completedRounds,beforeCheer.completedRounds);
    assert.equal(JSON.stringify(state().timer),beforeCheerTimer);assert.equal(JSON.stringify(state().journal),beforeCheerJournal);
    await waitFor(()=>petExecute(`speech.includes('加油')&&document.getElementById('bubbleHint').textContent.includes('加油')`),'pet did not display encouragement');
    await petExecute(`window.__cadenceEvents=[]`);
    const taskText='节奏验收：只移除这一项';
    await execute(`window.workFeiBi.taskAction('add',${JSON.stringify(taskText)})`);
    taskId=state().journal.tasks.find(task=>task.text===taskText&&!originalTasks.some(original=>original.id===task.id))?.id;
    assert.ok(taskId);
    const beforeTasks=scores(),beforeTaskTimer=JSON.stringify(state().timer);
    // Four actual character swaps use the shared nickname catalog. Completion
    // reactions are free celebrations, so this adds no cooldown or affection.
    for(const character of characters.list){
      await execute(`window.workFeiBi.saveSettings({character:${JSON.stringify(character.id)}})`);
      await waitFor(()=>petExecute(`state.settings.character===${JSON.stringify(character.id)}`),'task nickname character was not applied');
      const celebrations=await eventCount('celebration');
      await execute(`window.workFeiBi.taskAction('toggle',${JSON.stringify(taskId)})`);
      await waitFor(async()=>await eventCount('celebration')===celebrations+1,'completed task did not emit celebration');
      assert.equal(state().journal.tasks.find(task=>task.id===taskId).done,true);
      const reaction=await petExecute(`({speech,hint:document.getElementById('bubbleHint').textContent,effect:document.getElementById('interactionEffect').textContent})`);
      assert.match(reaction.speech,new RegExp(character.nickname));assert.match(reaction.hint,new RegExp(character.nickname));assert.equal(reaction.effect,'♡');
      if(character.id!=='phoebe')assert.equal(reaction.speech.includes('啾比'),false);
      assert.equal(scores(),beforeTasks);assert.equal(JSON.stringify(state().timer),beforeTaskTimer);
      await execute(`window.workFeiBi.taskAction('toggle',${JSON.stringify(taskId)})`);
      await petExecute(`new Promise(requestAnimationFrame)`);
      assert.equal(await eventCount('celebration'),celebrations+1);
      assert.equal(state().journal.tasks.find(task=>task.id===taskId).done,false);
      assert.equal(scores(),beforeTasks);assert.equal(JSON.stringify(state().timer),beforeTaskTimer);
    }
    // Toggle the same task at an expired study deadline: completion still
    // records exactly one real round, and the reminder owns the visible bubble.
    const celebrations=await eventCount('celebration'),roundsBeforeRace=state().timer.rounds,completedBeforeRace=state().companion.completedRounds,countBeforeRace=state().companion.count;
    action('toggle');timer.deadline=Date.now()-1;
    await execute(`window.workFeiBi.taskAction('toggle',${JSON.stringify(taskId)})`);
    await waitFor(()=>state().timer.reminding&&state().timer.rounds===roundsBeforeRace+1,'task/deadline race did not keep reminder priority');
    await waitFor(()=>petExecute(`state.timer.reminding&&!document.getElementById('bubble').classList.contains('hidden')&&document.getElementById('bubbleTitle').textContent==='该休息啦'`),'task celebration obscured the due reminder');
    assert.equal(await eventCount('celebration'),celebrations);
    assert.equal(state().companion.count,countBeforeRace);assert.equal(state().companion.completedRounds,completedBeforeRace+1);
    assert.equal(state().journal.tasks.find(task=>task.id===taskId).done,true);
    await capture(pet,'task-reminder-priority.png');
    assert.deepEqual(state().journal.tasks.filter(task=>task.id!==taskId),originalTasks);
  }finally{
    if(taskId)await execute(`window.workFeiBi.taskAction('remove',${JSON.stringify(taskId)})`);
    await execute(`window.workFeiBi.saveSettings(${JSON.stringify({longBreakEnabled:false,longBreakEvery:initialSettings.longBreakEvery,longBreakMinutes:initialSettings.longBreakMinutes,character:initialSettings.character})})`);
    action('reset');if(state().timer.phase==='rest')action('skip');
    await petExecute(`window.__cadenceCapture=false;delete window.__cadenceEvents`);
  }
};
