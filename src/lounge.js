// The main process owns scores, targets and deadlines. This module only paints
// the archive/arcade and sends a current target ID, never a claimed score.
(function(scope){
  const $=id=>document.getElementById(id),cards=new Map();
  let state,busy=false,switching=false,viewEpoch=0;
  const reasons={reminder:'到期啦，先确认学习或休息提醒。',study:'学习开始啦，星星等休息时再接。',character:'换伙伴啦，这局已结束。',window:'终端已关闭，这局已结束。',left:'已离开街机，这局不计成绩。',user:'这局结束啦，想休息多久都可以。'};
  function createCards(){
    const list=$('characterCards');
    for(const character of scope.PetCharacters.list){
      const card=document.createElement('article'),art=character.id==='owl'?document.createElement('div'):document.createElement('img');
      card.className='character-card';card.dataset.character=character.id;art.className='character-art';
      let model;
      if(character.id==='owl'){model=scope.ClockworkOwl.create(art);model.setPose('idle',true);}
      else{art.src=character.portrait||`../assets/images/${character.id==='nuonuo'?'nuonuo_front':'phoebe_1'}.png`;art.alt=character.name;art.loading='lazy';}
      const title=document.createElement('h3'),kind=document.createElement('small'),note=document.createElement('p'),button=document.createElement('button');
      title.textContent=character.name;kind.className='character-kind';kind.textContent=character.kind|| (character.id==='owl'?'ORIGINAL / 分层关节动画':'FAN ART / 姿势图 + 程序动态');
      note.textContent=character.description|| (character.id==='owl'?'独立翅膀、脚、眼皮与真实背面。三套配色和两款头饰，矢量模型放大仍清晰。':character.id==='nuonuo'?'灰青头发、粉蓝呆眼的小伙伴。当前为高清补绘试用形象，可在本机导入糯糯音效。':'原始啾比形象，三种外观与补绘姿势。原素材来源 Genius-Society，CC BY-NC-SA 4.0。');
      button.textContent='出场';button.dataset.selectCharacter=character.id;button.onclick=()=>select(character.id);
      card.append(art,title,kind,note,button);list.append(card);cards.set(character.id,{card,button,art,model});
    }
  }
  async function select(character){
    if(switching||!scope.PetCharacters.valid(character))return;
    switching=true;renderCards();$('collectionStatus').textContent='正在连接伙伴……';
    try{
      const next=await scope.workFeiBi.saveSettings({character});
      // Preserve unsaved duration/volume/outfit fields while reflecting the one
      // setting the archive actually changed.
      $('character').value=next.settings.character;scope.render(next);
      $('collectionStatus').textContent=`${scope.PetCharacters.name(character)}已出场，计时进度保留。`;
    }catch{$('collectionStatus').textContent='切换未能保存，请重试并检查本机磁盘权限。';}
    finally{switching=false;renderCards();}
  }
  function renderCards(){
    for(const [id,item] of cards){
      const selected=state?.settings.character===id;item.card.dataset.active=String(selected);item.button.disabled=switching||selected;item.button.textContent=selected?'正在陪伴 · ONLINE':'出场';
      if(id==='phoebe'&&state){const source=`../assets/images/phoebe_${state.settings.outfit}.png`;if(item.art.getAttribute('src')!==source)item.art.src=source;}
      if(item.model&&state)item.model.setAppearance({palette:state.settings.owlPalette,accessory:state.settings.owlAccessory});
    }
  }
  async function gameAction(action,target){
    if(busy)return;
    const epoch=viewEpoch;
    busy=true;
    try{const next=await scope.workFeiBi.gameAction(action,target);if(epoch===viewEpoch)scope.render(next);}
    catch{$('gameStatus').textContent='这次操作未完成。学习计时或提醒中不能开启，请稍后再试。';}
    finally{busy=false;renderGame();}
  }
  function renderGame(){
    if(!state)return;
    const g=state.game||{},t=state.timer,allowed=!t.reminding&&(!t.running||t.phase==='rest');
    $('gameScore').textContent=g.score||0;$('gameBest').textContent=g.best||0;
    $('gameTime').textContent=g.active?Math.ceil(g.remainingMs/1000):g.result?'0':'45';
    $('gameProgress').value=g.active?g.remainingMs:g.result?0:45000;
    $('gameHistory').textContent=`已完成 ${g.played||0} 局 · 累计 ${g.totalStars||0} 颗星星 · 上局 ${g.lastScore||0} 颗`;
    const target=$('gameTarget');target.hidden=!g.active||!g.target;$('gameSplash').hidden=Boolean(g.active);
    if(g.target){target.dataset.targetId=g.target.id;target.style.left=`${g.target.x}%`;target.style.top=`${g.target.y}%`;target.setAttribute('aria-label',`接住第 ${(g.score||0)+1} 颗星星`);}
    $('gameStart').disabled=busy||g.active||!allowed;$('gameCancel').disabled=busy||!g.active;target.disabled=busy;
    if(g.active){$('gameStatus').textContent=`接到 ${g.score} 颗啦！${scope.PetCharacters.name(state.settings.character)}正在为你加油。`;}
    else if(!allowed)$('gameStatus').textContent=t.reminding?'桌宠在等你确认提醒，请先回「专注舱」。':'先专心学习吧，暂停或休息时可以玩。';
    else if(g.result){
      $('gameStatus').textContent=g.result.kind==='complete'?`接到了 ${g.result.score} 颗星星${g.result.newBest?'，刷新纪录！':'，做得好！'}再看看远处，休息一下吧。`:(reasons[g.result.reason]||'这局已结束，未计入成绩。');
    }else $('gameStatus').textContent='准备好了吗？接一点星星，换个轻松的节奏。';
  }
  createCards();
  $('gameStart').onclick=()=>gameAction('start');$('gameCancel').onclick=()=>gameAction('cancel');$('gameTarget').onclick=()=>gameAction('hit',$('gameTarget').dataset.targetId);
  scope.PetLounge=Object.freeze({render(next){state=next;renderCards();renderGame();},leaveGame(){viewEpoch++;void scope.workFeiBi.gameAction('leave').then(scope.render).catch(()=>{});}});
})(window);
