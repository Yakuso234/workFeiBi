const fields = ['studyMinutes', 'restMinutes', 'angryAfterSeconds', 'petScale', 'soundEnabled', 'idleMotion', 'outfit', 'volume'];
let currentState;

function formatTime(seconds) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  return `${String(minutes).padStart(2, '0')}:${String(Math.max(0, seconds) % 60).padStart(2, '0')}`;
}

function render(state, fillForm = false) {
  currentState = state;
  const { timer, settings } = state;
  const preview=document.getElementById('portrait');
  const portrait=`../assets/images/phoebe_${settings.outfit}.png`;
  if(preview.getAttribute('src')!==portrait)preview.src=portrait;
  document.getElementById('phase').textContent = timer.reminding ? '等待确认' : (timer.phase === 'study' ? '学习阶段' : '休息阶段');
  document.getElementById('time').textContent = formatTime(timer.remaining);
  document.getElementById('toggle').textContent = timer.reminding ? '确认并继续' : timer.running ? '暂停' : (timer.phase === 'study' ? '开始专注' : '开始休息');
  document.getElementById('rounds').textContent = `本次完成 ${timer.rounds} 轮专注`;
  if (fillForm) {
    for (const id of fields) {
      const input = document.getElementById(id);
      if (input.type === 'checkbox') input.checked = Boolean(settings[id]);
      else input.value = settings[id];
    }
    document.getElementById('petScaleValue').textContent = `${settings.petScale}%`;
  }
}

document.getElementById('toggle').addEventListener('click', () => window.workFeiBi.timerAction(currentState?.timer.reminding ? 'ack' : 'toggle'));
document.getElementById('skip').addEventListener('click', () => window.workFeiBi.timerAction('skip'));
document.getElementById('reset').addEventListener('click', () => window.workFeiBi.timerAction('reset'));
document.getElementById('petScale').addEventListener('input', (event) => { document.getElementById('petScaleValue').textContent = `${event.target.value}%`; });
document.getElementById('preview').onclick = () => window.workFeiBi.timerAction('preview');
document.getElementById('save').addEventListener('click', async () => {
  const next = {};
  for (const id of fields) {
    const input = document.getElementById(id);
    next[id] = input.type === 'checkbox' ? input.checked : Number(input.value);
  }
  try { render(await window.workFeiBi.saveSettings(next), true); } catch { document.getElementById('save').textContent = '保存失败，请重试'; return; }
  document.getElementById('save').textContent = '已保存 ✓';
  setTimeout(() => { document.getElementById('save').textContent = '保存设置'; }, 1300);
});

window.workFeiBi.onState((state) => render(state));
window.workFeiBi.getState().then((state) => render(state, true));
