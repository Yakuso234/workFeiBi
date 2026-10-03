const fields = ['studyMinutes', 'restMinutes', 'angryAfterSeconds', 'petScale', 'soundEnabled', 'idleMotion', 'outfit', 'volume', 'dailyGoal', 'character', 'idleFrequency', 'focusQuiet', 'reducedMotion', 'impactEnabled', 'interactionSounds'];
const stringFields = new Set(['character', 'idleFrequency']);
const settingDefaults = {idleFrequency:'normal',focusQuiet:true,reducedMotion:false,impactEnabled:true,interactionSounds:false};
const motionNames = {blink:'眨眨眼',wave:'挥挥手',kick:'踢踢脚',stretch:'伸懒腰',look:'摇摇头',sleep:'打个盹',turn:'转身看看',angry:'生气敲屏'};
let currentState;
let journalSignature='';
let badgeSignature='';
let owlPortrait;

function characterName(id) {
  return window.PetCharacters.name(id);
}

function renderPortrait(settings) {
  const preview = document.getElementById('portrait');
  const owlContainer = document.getElementById('owlPortrait');
  const isOwl = settings.character === 'owl';
  preview.hidden = isOwl;
  owlContainer.hidden = !isOwl;
  if (isOwl) {
    if (!owlPortrait) {
      owlPortrait = window.ClockworkOwl.create(owlContainer);
      owlPortrait.setPose('idle', true);
    }
    return;
  }
  const portrait = settings.character === 'nuonuo' ? '../assets/images/nuonuo_front.png' : `../assets/images/phoebe_${settings.outfit}.png`;
  preview.alt = characterName(settings.character);
  if (preview.getAttribute('src') !== portrait) preview.src = portrait;
}

function formatTime(seconds) {
  const remaining = Math.floor(Math.max(0, seconds));
  const minutes = Math.floor(remaining / 60);
  return `${String(minutes).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
}

function render(state, fillForm = false) {
  currentState = state;
  const { timer, settings } = state;
  const name = characterName(settings.character);
  document.documentElement.dataset.reducedMotion=String(Boolean(settings.reducedMotion));
  document.getElementById('bond').textContent = `本次互动 ${state.companion?.count || 0} 次`;
  document.getElementById('companionStatus').textContent = (state.companion?.message || '我在这里陪你。').replaceAll('啾比', settings.character === 'nuonuo' ? '糯糯' : settings.character === 'owl' ? '小鸮' : '啾比');
  renderCompanion(state.companion);
  renderPortrait(settings);
  const voiceSource = state.voices?.[settings.character] ? '已导入的本机音效' : settings.character === 'owl' ? '原创合成电子铃音' : settings.character === 'nuonuo' ? (state.voices?.localNuonuo ? '本机糯糯短音效' : '本机中文语音 / 合成提示音') : '菲比角色音效 / 本机中文语音';
  document.getElementById('characterNote').textContent=`${name} ONLINE · ${voiceSource}`;
  document.getElementById('voiceSource').textContent=`当前已保存角色：${name} · ${voiceSource}。切换角色后请先保存，再试听或导入。`;
  document.getElementById('labCharacter').textContent=name;
  document.getElementById('importVoice').textContent=`导入${name}音效`;
  document.getElementById('turnButton').hidden=false;
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
      const value = settings[id] ?? settingDefaults[id];
      if (input.type === 'checkbox') input.checked = Boolean(value);
      else input.value = value;
    }
    document.getElementById('petScaleValue').textContent = `${settings.petScale}%`;
  }
}

function renderCompanion(companion = {}) {
  for (const key of ['bond', 'mood', 'energy']) {
    const value = Math.round(Math.min(100, Math.max(0, Number(companion[key]) || 0)));
    document.getElementById(`${key}Meter`).value = value;
    document.getElementById(`${key}Value`).textContent = `${value} / 100`;
  }
  document.getElementById('companionLevel').textContent = companion.level || '初次见面';
  document.getElementById('companionHistory').textContent = `累计互动 ${companion.totalInteractions || 0} 次 · 一起完成 ${companion.completedRounds || 0} 轮专注`;
  const badges = Array.isArray(companion.unlocked) ? companion.unlocked : [];
  const signature = JSON.stringify(badges);
  if (signature === badgeSignature) return;
  badgeSignature = signature;
  const list = document.getElementById('companionBadges');
  list.replaceChildren();
  if (!badges.length) {
    const empty = document.createElement('li');
    empty.className = 'empty-badge';
    empty.textContent = '第一枚陪伴纪念章，等你们一起点亮。';
    list.append(empty);
  }
  for (const badge of badges) {
    const item = document.createElement('li');
    item.textContent = `◇ ${badge}`;
    list.append(item);
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

document.querySelectorAll('[data-export]').forEach(button => {
  button.addEventListener('click', async () => {
    const status = document.getElementById('exportStatus');
    const buttons = document.querySelectorAll('[data-export]');
    buttons.forEach(item => { item.disabled = true; });
    status.textContent = '请选择保存位置……';
    try {
      const result = await window.workFeiBi.exportRecords(button.dataset.export);
      status.textContent = result.canceled ? '已取消导出，记录未改变。' : `已导出：${result.filename}。文件仅保存在你选择的本机位置。`;
    } catch {
      status.textContent = '导出没有完成，请检查保存位置是否可写，并保留对应的 .csv 或 .json 扩展名。现有记录未改变。';
    } finally {
      buttons.forEach(item => { item.disabled = false; });
    }
  });
});

async function timerAction(action) {
  try {
    const next = await window.workFeiBi.timerAction(action);
    if (next?.timer) render(next);
    document.getElementById('actionStatus').textContent = '';
  } catch {
    document.getElementById('actionStatus').textContent = '操作暂时没有完成，请再试一次。';
  }
}
document.getElementById('toggle').addEventListener('click', () => timerAction(currentState?.timer.reminding ? 'ack' : 'toggle'));
document.getElementById('skip').addEventListener('click', () => timerAction('skip'));
document.getElementById('reset').addEventListener('click', () => timerAction('reset'));
document.getElementById('petScale').addEventListener('input', (event) => { document.getElementById('petScaleValue').textContent = `${event.target.value}%`; });
document.getElementById('preview').onclick = () => timerAction('preview');
document.getElementById('importVoice').onclick = async () => {
  try{const result=await window.workFeiBi.importVoice();if(result.canceled)return;render(result.state);document.getElementById('voiceStatus').textContent='已导入到本机。请点试听确认内容；未上传到 GitHub。';}
  catch{document.getElementById('voiceStatus').textContent='导入失败：请选择有效 MP3/WAV/OGG（不超过 5 MB），并检查磁盘权限。';}
};
document.querySelectorAll('[data-interact]').forEach(button => {
  button.onclick = () => timerAction(`interact:${button.dataset.interact}`);
});
document.querySelectorAll('[data-preset]').forEach(button => {
  button.addEventListener('click', () => {
    const [study, rest] = button.dataset.preset.split('/').map(Number);
    document.getElementById('studyMinutes').value = study;
    document.getElementById('restMinutes').value = rest;
    document.getElementById('presetStatus').textContent = `已填入学习 ${study} 分钟 / 休息 ${rest} 分钟，点击「保存设置」后生效。当前轮次未改变。`;
  });
});
document.querySelectorAll('[data-motion]').forEach(button => {
  button.addEventListener('click', async () => {
    const status = document.getElementById('labStatus');
    if (currentState?.timer.reminding) {
      status.textContent = '桌宠正在等你确认学习或休息提醒，请先回到「专注舱」确认，再预览动作。';
      return;
    }
    const buttons = document.querySelectorAll('[data-motion]');
    buttons.forEach(item => { item.disabled = true; });
    try {
      const next = await window.workFeiBi.previewAction(button.dataset.motion);
      if (next?.timer) render(next);
      const character = characterName(currentState?.settings.character);
      status.textContent = `已发送「${motionNames[button.dataset.motion]}」预览，看看桌面上的${character}吧。`;
    } catch {
      status.textContent = currentState?.timer.reminding ? '现在有到时提醒，请先确认提醒，再预览动作。' : '暂时没能播放这个动作，请稍后再试。';
    } finally {
      buttons.forEach(item => { item.disabled = false; });
    }
  });
});
document.getElementById('save').addEventListener('click', async () => {
  const next = {};
  for (const id of fields) {
    const input = document.getElementById(id);
    if(!input.checkValidity()){input.reportValidity();return;}
    next[id] = input.type === 'checkbox' ? input.checked : stringFields.has(id)?input.value:Number(input.value);
  }
  try { render(await window.workFeiBi.saveSettings(next), true); } catch { document.getElementById('save').textContent = '保存失败，请重试'; document.getElementById('presetStatus').textContent='设置未能保存，请重试并检查磁盘权限。'; return; }
  document.getElementById('save').textContent = '已保存 ✓';
  document.getElementById('presetStatus').textContent = '设置已保存。新的时长在下一轮生效；立即应用可回专注舱点击重置。';
  setTimeout(() => { document.getElementById('save').textContent = '保存设置'; }, 1300);
});

window.workFeiBi.onState((state) => render(state));
window.workFeiBi.getState().then((state) => render(state, true)).catch(() => {
  document.getElementById('actionStatus').textContent = '终端暂时没有连接到桌宠，请关闭设置窗口后重新打开。';
});
