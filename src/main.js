const {app,BrowserWindow,ipcMain,Menu,screen,Tray,nativeImage,globalShortcut,dialog}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {Timer,sanitize}=require('./timer');
const {Companion}=require('./companion');
const {Journal}=require('./journal');
const {Voices}=require('./voices');
const characters=require('./characters');
const {createExport}=require('./export');
const {randomUUID}=require('node:crypto');
const storage=require('./storage');
let companion=new Companion();
const smoke=process.argv.includes('--smoke-test');
if(smoke)app.setPath('userData',path.join(__dirname,'../.qa-profile'));
app.setName('workFeiBi');
let pet,settingsWindow,impactWindow,tray,timer,journal,voices,position,drag,moveLoop,saveDelay,tickLoop,checkpointLoop,impactDelay;
let quitting=false,storageWarning='',recordedRounds=0,impactReady,impactSequence=0,exporting=false;
const localNuonuo=[1,2,3].every(n=>fs.existsSync(path.join(__dirname,`../local-media/nuonuo/nuonuo-${n}.wav`)));
const previewDurations={blink:900,wave:2800,kick:3200,stretch:3600,look:3000,sleep:8000,turn:3000,angry:3000};
const configPath=()=>path.join(app.getPath('userData'),'settings.json');
function persist(strict=false){
  try{
    storage.save(configPath(),{settings:timer.settings,position,session:timer.serialize(),journal:journal.serialize(),companion:companion.serialize()});
    storageWarning='';return true;
  }catch(error){
    storageWarning='本地保存失败，请检查磁盘空间和配置目录权限。';console.error(storageWarning,error.message);
    if(strict)throw new Error(storageWarning);return false;
  }
}
function state(){return {timer:timer.snapshot(),settings:timer.settings,companion:companion.snapshot(),journal:journal.snapshot(),voices:{...voices.snapshot(),localNuonuo},storageWarning};}
function broadcast(event){
  const value=state();
  for(const w of [pet,settingsWindow])if(w&&!w.isDestroyed())w.webContents.send('state',value);
  if(event==='angry')showImpact();
  if(event&&pet&&!pet.isDestroyed())pet.webContents.send('pet-event',event);
}
function clearImpact(){
  impactSequence++;clearTimeout(impactDelay);
  if(impactWindow&&!impactWindow.isDestroyed())impactWindow.hide();
}
async function showImpact(){
  if(!pet||pet.isDestroyed()||!timer.settings.impactEnabled||timer.settings.reducedMotion)return;
  const sequence=++impactSequence;
  if(!impactWindow||impactWindow.isDestroyed()){
    const area=screen.getDisplayMatching(pet.getBounds()).workArea;
    impactWindow=new BrowserWindow({...area,show:false,transparent:true,frame:false,focusable:false,skipTaskbar:true,resizable:false,alwaysOnTop:true,hasShadow:false,backgroundColor:'#00000000',webPreferences:options()});
    secure(impactWindow);impactWindow.setAlwaysOnTop(true,'screen-saver');impactWindow.setIgnoreMouseEvents(true,{forward:true});
    impactWindow.on('closed',()=>{impactWindow=null;impactReady=null;});
    impactReady=impactWindow.loadFile(path.join(__dirname,'impact.html'));
  }
  try{await impactReady;}catch(error){console.error('敲屏特效加载失败',error.message);return;}
  if(sequence!==impactSequence||quitting||!pet||pet.isDestroyed()||!impactWindow||impactWindow.isDestroyed()||!timer.settings.impactEnabled||timer.settings.reducedMotion)return;
  const bounds=pet.getBounds(),area=screen.getDisplayMatching(bounds).workArea;
  const point={x:Math.round(bounds.x+bounds.width*.25-area.x),y:Math.round(bounds.y+bounds.height*.63-area.y)};
  impactWindow.setBounds(area);impactWindow.showInactive();impactWindow.webContents.send('impact',point);
  clearTimeout(impactDelay);impactDelay=setTimeout(clearImpact,2800);
}
function previewAction(motion){
  if(typeof motion!=='string'||!Object.hasOwn(previewDurations,motion))throw new Error('未知动作');
  const dueEvent=timer.update();recordCompletion();
  if(dueEvent){persist();broadcast(dueEvent);}
  if(timer.reminding)throw new Error('请先确认到期提醒，再预览动作。');
  clearImpact();showPet();
  broadcast({type:'preview-action',motion,duration:previewDurations[motion]});
  if(motion==='angry')void showImpact();
  return state();
}
function recordCompletion(){
  if(timer.rounds>recordedRounds){
    journal.record(timer.sessionSeconds,new Date(timer.due||Date.now()));companion.completeRound();recordedRounds=timer.rounds;
  }
}
function bounded(bounds){
  const area=screen.getDisplayMatching(bounds).workArea;
  return {...bounds,x:Math.round(Math.max(area.x,Math.min(bounds.x,area.x+area.width-bounds.width))),y:Math.round(Math.max(area.y,Math.min(bounds.y,area.y+area.height-bounds.height)))};
}
function showPet(){if(pet&&!pet.isDestroyed()){pet.setBounds(bounded(pet.getBounds()));pet.showInactive();}}
function hidePet(){clearImpact();if(pet&&!pet.isDestroyed())pet.hide();}
function options(){return {preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false};}
function secure(window){
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',event=>event.preventDefault());
}
function openSettings(){
  if(!timer)return;
  if(settingsWindow&&!settingsWindow.isDestroyed()){settingsWindow.show();settingsWindow.focus();return;}
  const area=screen.getDisplayMatching(pet.getBounds()).workArea;
  settingsWindow=new BrowserWindow({width:Math.min(960,area.width),height:Math.min(860,area.height),minWidth:450,minHeight:500,title:'workFeiBi · 夜之城专注终端',autoHideMenuBar:true,backgroundColor:'#090c12',webPreferences:options()});
  secure(settingsWindow);settingsWindow.loadFile(path.join(__dirname,'settings.html'));
  settingsWindow.on('closed',()=>{settingsWindow=null;});
}
function action(name){
  if(typeof name!=='string')return;
  // Update first so a click at the deadline cannot skip a completed session.
  const dueEvent=timer.update();recordCompletion();
  if(name.startsWith('interact:')){
    const event=companion.interact(name.slice(9),timer.reminding);
    if(event||dueEvent)showPet();if(event||dueEvent)persist();broadcast(dueEvent||event);return;
  }
  let event;
  if(name==='toggle')event=dueEvent||timer.toggle();
  else if(name==='ack')event=timer.ack();
  else if(name==='reset')timer.reset();
  else if(name==='skip')timer.skip();
  else if(name==='preview'){broadcast(dueEvent||'preview');showPet();if(dueEvent)persist();return;}
  else return;
  if(['ack','reset','skip'].includes(name)||event==='acknowledged')clearImpact();
  persist();broadcast(event);
}
function menu(){return Menu.buildFromTemplate([
  {label:'显示桌宠',click:showPet},{label:'专注终端 / 设置',click:openSettings},
  {label:timer.reminding?'确认提醒，进入下一轮':timer.running?'暂停计时':'开始 / 继续计时',click:()=>action('toggle')},
  {label:'重置本轮',click:()=>action('reset')},{label:'跳过本轮',click:()=>action('skip')},
  {type:'separator'},{label:'♡ 摸摸头',click:()=>action('interact:pat')},{label:'◇ 喂点心',click:()=>action('interact:feed')},{label:'↗ 一起伸懒腰',click:()=>action('interact:stretch')},
  {label:'☾ 打个盹',click:()=>action('interact:sleep')},{label:'↻ 转身看看',click:()=>action('interact:turn')},
  {type:'separator'},{label:'隐藏桌宠（托盘可恢复）',click:hidePet},{label:'退出 workFeiBi',click:()=>app.quit()},
]);}
function endDrag(){
  const wasDragging=Boolean(drag);drag=null;clearInterval(moveLoop);
  if(wasDragging&&pet&&!pet.isDestroyed()){position=pet.getPosition();clearTimeout(saveDelay);saveDelay=setTimeout(()=>persist(),200);}
}
function trusted(event){return Boolean(timer&&[pet,settingsWindow].some(w=>w&&!w.isDestroyed()&&event.sender===w.webContents&&event.senderFrame===w.webContents.mainFrame));}
function handle(channel,fn){ipcMain.handle(channel,(event,...args)=>{if(!trusted(event))throw new Error('不允许的请求来源');return fn(...args);});}
function on(channel,fn){ipcMain.on(channel,(event,...args)=>{if(trusted(event))fn(event,...args);});}
handle('get-state',()=>state());
handle('preview-action',previewAction);
handle('get-voice',character=>voices.get(character));
handle('import-voice',async()=>{
  if(!settingsWindow||settingsWindow.isDestroyed())throw new Error('请从设置窗口导入');
  const character=timer.settings.character;
  const result=await dialog.showOpenDialog(settingsWindow,{title:`导入${characters.name(character)}音效（仅保存本机）`,properties:['openFile'],filters:[{name:'音频（最大 5 MB）',extensions:['mp3','wav','ogg']}]});
  if(result.canceled)return {canceled:true};
  voices.import(character,result.filePaths[0]);broadcast();return {canceled:false,state:state()};
});
handle('save-settings',input=>{
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('无效设置');
  const previous=timer.settings;timer.configure(input);
  try{persist(true);}catch(error){timer.settings=previous;throw error;}
  if(!timer.settings.impactEnabled||timer.settings.reducedMotion)clearImpact();
  const b=pet.getBounds(),scale=timer.settings.petScale/100;
  pet.setBounds(bounded({...b,width:Math.round(300*scale),height:Math.round(355*scale)}));
  position=pet.getPosition();persist();broadcast();return state();
});
handle('task-action',(action,input)=>{
  const previous=JSON.parse(JSON.stringify(journal.serialize()));
  journal.task(action,input);
  try{persist(true);}catch(error){journal=new Journal(previous);throw error;}
  broadcast();return state();
});
handle('export-records',async format=>{
  if(!settingsWindow||settingsWindow.isDestroyed())throw new Error('请从任务档案导出记录');
  if(exporting)throw new Error('已有导出正在进行');
  // Only the native dialog supplies a destination; renderer paths are not accepted.
  const suggested=createExport(format,{journal:journal.serialize(),companion:companion.serialize()});
  exporting=true;let temporary,ownsTemporary=false;
  try{
    const choice=await dialog.showSaveDialog(settingsWindow,{title:'导出学习记录（仅保存本机）',defaultPath:path.join(app.getPath('documents'),suggested.filename),filters:[{name:format==='csv'?'CSV 学习统计':'JSON 学习档案',extensions:[format]}],properties:['createDirectory','showOverwriteConfirmation']});
    if(choice.canceled||!choice.filePath)return {canceled:true};
    // Never append an extension after the dialog: that could overwrite a path
    // different from the one whose replacement the user actually confirmed.
    const destination=choice.filePath;
    if(!path.isAbsolute(destination)||path.extname(destination).toLowerCase()!==`.${format}`)throw new Error(`请在保存文件名末尾保留 .${format} 扩展名`);
    const dueEvent=timer.update();recordCompletion();if(dueEvent){persist();broadcast(dueEvent);}
    const output=createExport(format,{journal:journal.serialize(),companion:companion.serialize()});
    temporary=`${destination}.workfeibi-${randomUUID()}.tmp`;
    const outputFile=await fs.promises.open(temporary,'wx',0o600);ownsTemporary=true;
    try{await outputFile.writeFile(output.content,'utf8');}finally{await outputFile.close();}
    await fs.promises.rename(temporary,destination);temporary=null;
    return {canceled:false,filename:path.basename(destination)};
  }finally{
    if(temporary&&ownsTemporary)await fs.promises.unlink(temporary).catch(()=>{});
    exporting=false;
  }
});
on('pet-click',()=>{if(timer.reminding)action('ack');else action('interact:pat');});
on('open-settings',openSettings);on('context-menu',()=>menu().popup({window:pet}));
on('timer-action',(_,name)=>action(name));
on('drag-start',event=>{
  if(event.sender!==pet.webContents)return;
  endDrag();pet.setIgnoreMouseEvents(false);drag={cursor:screen.getCursorScreenPoint(),bounds:pet.getBounds()};
  moveLoop=setInterval(()=>{if(!drag)return;const cursor=screen.getCursorScreenPoint();pet.setBounds(bounded({...drag.bounds,x:drag.bounds.x+cursor.x-drag.cursor.x,y:drag.bounds.y+cursor.y-drag.cursor.y}));},16);
});
on('drag-end',endDrag);
on('hit-test',(event,interactive)=>{if(event.sender===pet.webContents&&!drag&&typeof interactive==='boolean')pet.setIgnoreMouseEvents(!interactive,{forward:true});});
if(!app.requestSingleInstanceLock())app.quit();
else{
  app.on('second-instance',()=>{showPet();openSettings();});
  app.whenReady().then(async()=>{
    const loaded=storage.load(configPath()),stored=smoke?{}:loaded.data;
    if(loaded.recovered&&!smoke)storageWarning='配置文件曾损坏，已使用备份或默认值恢复。';
    timer=new Timer(sanitize(stored.settings||stored));timer.restore(stored.session);
    recordedRounds=timer.rounds;journal=new Journal(stored.journal);voices=new Voices(path.join(app.getPath('userData'),'voices'));
    companion=new Companion(stored.companion);
    const area=screen.getPrimaryDisplay().workArea,scale=timer.settings.petScale/100;
    const size={width:Math.round(300*scale),height:Math.round(355*scale)};
    position=Array.isArray(stored.position)&&stored.position.length===2&&stored.position.every(Number.isFinite)?stored.position:[area.x+area.width-size.width-20,area.y+area.height-size.height-10];
    pet=new BrowserWindow({...bounded({...size,x:position[0],y:position[1]}),show:false,transparent:true,frame:false,resizable:false,maximizable:false,fullscreenable:false,alwaysOnTop:true,skipTaskbar:true,hasShadow:false,backgroundColor:'#00000000',webPreferences:options()});
    secure(pet);pet.setAlwaysOnTop(true,'floating');pet.once('ready-to-show',showPet);
    pet.on('close',event=>{if(!quitting){event.preventDefault();hidePet();}});
    await pet.loadFile(path.join(__dirname,'pet.html'));
    tray=new Tray(nativeImage.createFromPath(path.join(__dirname,'../assets/images/phoebe_1.png')).resize({width:32,height:32}));
    tray.setToolTip('workFeiBi · 双击打开设置');tray.on('double-click',()=>{showPet();openSettings();});
    tray.on('right-click',()=>tray.popUpContextMenu(menu()));tray.on('click',showPet);
    globalShortcut.register('CommandOrControl+Shift+F',()=>pet.isVisible()?hidePet():showPet());
    screen.on('display-removed',()=>{endDrag();showPet();});
    tickLoop=setInterval(()=>{const event=timer.update();recordCompletion();if(event){showPet();persist();}broadcast(event);},250);
    checkpointLoop=setInterval(()=>{if(timer.running)persist();},15000);
    if(!stored.settings)openSettings();
    if(smoke)require('./smoke')(pet,()=>settingsWindow,openSettings,action,state,timer,{getImpact:()=>impactWindow,configPath:configPath()}).then(()=>app.quit()).catch(error=>{console.error(error);app.exit(1);});
  }).catch(error=>{console.error(error);app.exit(1);});
  app.on('before-quit',()=>{quitting=true;if(timer){timer.update();recordCompletion();persist();}clearInterval(moveLoop);clearInterval(tickLoop);clearInterval(checkpointLoop);clearTimeout(saveDelay);clearTimeout(impactDelay);globalShortcut.unregisterAll();});
  app.on('window-all-closed',()=>{});
}
