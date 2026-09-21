const fields = ['studyMinutes', 'restMinutes', 'angryAfterSeconds', 'petScale', 'soundEnabled', 'idleMotion', 'outfit', 'volume', 'dailyGoal', 'character'];
let currentState;
let journalSignature='';

function formatTime(seconds) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  return `${String(minutes).padStart(2, '0')}:${String(Math.max(0, seconds) % 60).padStart(2, '0')}`;
}

function render(state, fillForm = false) {
  currentState = state;
  const { timer, settings } = state;
  document.getElementById('bond').textContent = `本次互动 ${state.companion?.count || 0} 次`;
  document.getElementById('companionStatus').textContent = (state.companion?.message || '我在这里陪你。').replaceAll('啾比',settings.character==='nuonuo'?'糯糯':'啾比');
  const preview=document.getElementById('portrait');
  const portrait=settings.character==='nuonuo'?'../assets/images/nuonuo_front.png':`../assets/images/phoebe_${settings.outfit}.png`;
  preview.alt=settings.character==='nuonuo'?'弗糯糯参考重绘试用版':'菲比啾比';
  document.getElementById('characterNote').textContent=settings.character==='nuonuo'?`弗糯糯 ONLINE · 参考 Akaoni 重绘，非原始动画素材 · ${state.voices?.nuonuo?'自定义语音':'暂用合成提示音'}`:'菲比啾比 ONLINE · 保留原图眼型';
  document.getElementById('importVoice').textContent=`导入${settings.character==='nuonuo'?'弗糯糯':'菲比'}音效`;
  document.getElementById('turnButton').hidden=settings.character!=='nuonuo';
  if(preview.getAttribute('src')!==portrait)preview.src=portrait;
  document.getElementById('phase').textContent = timer.reminding ? '等待确认' : (timer.phase === 'study' ? '学习阶段' : '休息阶段');
  document.getElementById('time').textContent = formatTime(timer.remaining);
  document.getElementById('toggle').textContent = timer.reminding ? '确认并继续' : timer.running ? '暂停' : (timer.phase === 'study' ? '开始专注' : '开始休息');
  document.getElementById('rounds').textContent = `累计完成 ${timer.rounds} 轮专注 · 数据仅存本机`;
  document.getElementById('sessionProgress').value = Math.min(100,Math.max(0,(1-timer.remaining/timer.sessionSeconds)*100));
  const warning=document.getElementById('storageWarning');warning.hidden=!state.storageWarning;warning.textContent=state.storageWarning||'';
  const today=state.journal?.today||{rounds:0,seconds:0};
  document.getElementById('todayRounds').textContent=today.rounds;
  document.getElementById('todayMinutes').textContent=Math.floor(today.seconds/60);
  document.getElementById('goalProgress').textContent=`${today.rounds} / ${settings.dailyGoal}`;
  document.getElementById('goalMessage').textContent=today.rounds>=settings.dailyGoal?'目标达成，做得很好！':'从一轮开始';
  renderJournal(state.journal);
  if (fillForm) {
    for (const id of fields) {
      const input = document.getElementById(id);
      if (input.type === 'checkbox') input.checked = Boolean(settings[id]);
      else input.value = settings[id];
    }
    document.getElementById('petScaleValue').textContent = `${settings.petScale}%`;
  }
}

function renderJournal(journal){
  if(!journal)return;
  const signature=JSON.stringify(journal);if(signature===journalSignature)return;journalSignature=signature;
  const list=document.getElementById('taskList');list.replaceChildren();
  if(!journal.tasks.length){const empty=document.createElement('li');empty.className='empty';empty.textContent='任务舱空空的。写下一件小事，就从这里开始。';list.append(empty);}
  for(const task of journal.tasks){
    const item=document.createElement('li'),label=document.createElement('label'),check=document.createElement('input'),text=document.createElement('span'),remove=document.createElement('button');
    check.type='checkbox';check.checked=task.done;check.onchange=()=>changeTask('toggle',task.id);
    text.textContent=task.text;label.append(check,text);item.classList.toggle('done',task.done);
    remove.textContent='移除';remove.setAttribute('aria-label',`移除任务：${task.text}`);remove.onclick=()=>changeTask('remove',task.id);
    item.append(label,remove);list.append(item);
  }
  const chart=document.getElementById('weekChart');chart.replaceChildren();
  const peak=Math.max(1,...journal.week.map(day=>day.rounds));
  for(const day of journal.week){
    const col=document.createElement('div'),value=document.createElement('strong'),bar=document.createElement('meter'),date=document.createElement('small');
    value.textContent=day.rounds;bar.min=0;bar.max=peak;bar.value=day.rounds;bar.setAttribute('aria-label',`${day.day} 完成 ${day.rounds} 轮`);
    date.textContent=day.day.slice(5);col.append(value,bar,date);chart.append(col);
  }
}
async function changeTask(action,input){
  try{render(await window.workFeiBi.taskAction(action,input));document.getElementById('taskStatus').textContent='已保存';return true;}
  catch{document.getElementById('taskStatus').textContent='未能保存：最多 30 项任务，也请检查磁盘权限。';return false;}
}
document.getElementById('taskForm').addEventListener('submit',async event=>{
  event.preventDefault();const input=document.getElementById('taskText');if(await changeTask('add',input.value))input.value='';
});
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('.tab-panel').forEach(panel=>panel.hidden=panel.id!==button.dataset.tab);
  document.querySelectorAll('[data-tab]').forEach(tab=>tab.setAttribute('aria-pressed',String(tab===button)));
}));

document.getElementById('toggle').addEventListener('click', () => window.workFeiBi.timerAction(currentState?.timer.reminding ? 'ack' : 'toggle'));
document.getElementById('skip').addEventListener('click', () => window.workFeiBi.timerAction('skip'));
document.getElementById('reset').addEventListener('click', () => window.workFeiBi.timerAction('reset'));
document.getElementById('petScale').addEventListener('input', (event) => { document.getElementById('petScaleValue').textContent = `${event.target.value}%`; });
document.getElementById('preview').onclick = () => window.workFeiBi.timerAction('preview');
document.getElementById('importVoice').onclick = async () => {
  try{const result=await window.workFeiBi.importVoice();if(result.canceled)return;render(result.state);document.getElementById('voiceStatus').textContent='已导入到本机。请点试听确认内容；未上传到 GitHub。';}
  catch{document.getElementById('voiceStatus').textContent='导入失败：请选择有效 MP3/WAV/OGG（不超过 5 MB），并检查磁盘权限。';}
};
document.querySelectorAll('[data-interact]').forEach(button => {
  button.onclick = () => window.workFeiBi.timerAction(`interact:${button.dataset.interact}`);
});
document.getElementById('save').addEventListener('click', async () => {
  const next = {};
  for (const id of fields) {
    const input = document.getElementById(id);
    if(!input.checkValidity()){input.reportValidity();return;}
    next[id] = input.type === 'checkbox' ? input.checked : id==='character'?input.value:Number(input.value);
  }
  try { render(await window.workFeiBi.saveSettings(next), true); } catch { document.getElementById('save').textContent = '保存失败，请重试'; return; }
  document.getElementById('save').textContent = '已保存 ✓';
  setTimeout(() => { document.getElementById('save').textContent = '保存设置'; }, 1300);
});

window.workFeiBi.onState((state) => render(state));
window.workFeiBi.getState().then((state) => render(state, true));
