const {app,BrowserWindow,ipcMain,Menu,screen,Tray,nativeImage,globalShortcut} = require('electron');
const fs=require('node:fs');
const path=require('node:path');
const {Timer,sanitize}=require('./timer');
const smoke=process.argv.includes('--smoke-test');
if(smoke) app.setPath('userData',path.join(__dirname,'../.qa-profile'));
app.setName('workFeiBi');
let pet,settingsWindow,tray,timer,position,drag,moveLoop,saveDelay;
const configPath=()=>path.join(app.getPath('userData'),'settings.json');
function persist(){try{fs.mkdirSync(path.dirname(configPath()),{recursive:true});fs.writeFileSync(configPath(),JSON.stringify({settings:timer.settings,position},null,2));}catch(e){console.error('保存失败',e);}}
function state(){return {timer:timer.snapshot(),settings:timer.settings};}
function broadcast(event){for(const w of [pet,settingsWindow]) if(w&&!w.isDestroyed()) w.webContents.send('state',state()); if(event) pet.webContents.send('pet-event',event);}
function bounded(bounds){const a=screen.getDisplayMatching(bounds).workArea;return {...bounds,x:Math.round(Math.max(a.x,Math.min(bounds.x,a.x+a.width-bounds.width))),y:Math.round(Math.max(a.y,Math.min(bounds.y,a.y+a.height-bounds.height)))};}
function showPet(){pet.setBounds(bounded(pet.getBounds()));pet.showInactive();}
function options(){return {preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false};}
function secure(w){w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.webContents.on('will-navigate',e=>e.preventDefault());}
function openSettings(){
  if(settingsWindow&&!settingsWindow.isDestroyed()){settingsWindow.show();settingsWindow.focus();return;}
  settingsWindow=new BrowserWindow({width:500,height:780,minWidth:450,minHeight:650,title:'workFeiBi · 学习计划',autoHideMenuBar:true,backgroundColor:'#f6f2fb',webPreferences:options()});
  secure(settingsWindow);settingsWindow.loadFile(path.join(__dirname,'settings.html'));settingsWindow.on('closed',()=>{settingsWindow=null;});
}
function action(name){let event;
  if(name==='toggle') event=timer.toggle();
  if(name==='ack') event=timer.ack();
  if(name==='reset') timer.reset();
  if(name==='skip') timer.skip();
  if(name==='preview') {pet.webContents.send('pet-event','preview');showPet();return;}
  broadcast(event);
}
function menu(){return Menu.buildFromTemplate([
  {label:'显示菲比',click:showPet}, {label:'学习计划 / 设置',click:openSettings},
  {label:timer.reminding?'确认提醒，进入下一轮':timer.running?'暂停计时':'开始 / 继续计时',click:()=>action('toggle')},
  {label:'重置本轮',click:()=>action('reset')},{label:'跳过本轮',click:()=>action('skip')},
  {type:'separator'},{label:'隐藏桌宠（托盘可恢复）',click:()=>pet.hide()},
  {label:'退出 workFeiBi',click:()=>app.quit()}]);}
function endDrag(){drag=null;clearInterval(moveLoop);if(pet&&!pet.isDestroyed()){position=pet.getPosition();clearTimeout(saveDelay);saveDelay=setTimeout(persist,200);}}
ipcMain.handle('get-state',()=>state());
ipcMain.handle('save-settings',(_,input)=>{
  timer.configure(input);
  const b=pet.getBounds(), scale=timer.settings.petScale/100;
  pet.setBounds(bounded({...b,width:Math.round(300*scale),height:Math.round(355*scale)}));position=pet.getPosition();persist();broadcast();return state();
});
ipcMain.on('pet-click',()=>{if(timer.reminding)action('ack');});
ipcMain.on('open-settings',openSettings);
ipcMain.on('context-menu',()=>menu().popup({window:pet}));
ipcMain.on('timer-action',(_,name)=>action(name));
ipcMain.on('drag-start',()=>{endDrag();drag={cursor:screen.getCursorScreenPoint(),bounds:pet.getBounds()};moveLoop=setInterval(()=>{if(!drag)return;const c=screen.getCursorScreenPoint();pet.setBounds(bounded({...drag.bounds,x:drag.bounds.x+c.x-drag.cursor.x,y:drag.bounds.y+c.y-drag.cursor.y}));},16);});
ipcMain.on('drag-end',endDrag);
ipcMain.on('hit-test',(event,interactive)=>{if(event.sender===pet?.webContents&&!drag)pet.setIgnoreMouseEvents(!interactive,{forward:true});});
if(!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance',()=>{showPet();openSettings();});
  app.whenReady().then(async()=>{
    let stored={};try{stored=JSON.parse(fs.readFileSync(configPath(),'utf8'));}catch{}
    if(!stored || typeof stored!=='object') stored={};
    timer=new Timer(sanitize(stored.settings||stored));
    const a=screen.getPrimaryDisplay().workArea,scale=timer.settings.petScale/100;
    const size={width:Math.round(300*scale),height:Math.round(355*scale)};
    position=Array.isArray(stored.position)&&stored.position.length===2&&stored.position.every(Number.isFinite)?stored.position:[a.x+a.width-size.width-20,a.y+a.height-size.height-10];
    pet=new BrowserWindow({...bounded({...size,x:position[0],y:position[1]}),show:false,transparent:true,frame:false,resizable:false,maximizable:false,fullscreenable:false,alwaysOnTop:true,skipTaskbar:true,hasShadow:false,backgroundColor:'#00000000',webPreferences:options()});
    secure(pet);pet.setAlwaysOnTop(true,'floating');pet.once('ready-to-show',showPet);
    await pet.loadFile(path.join(__dirname,'pet.html'));
    tray=new Tray(nativeImage.createFromPath(path.join(__dirname,'../assets/images/phoebe_1.png')).resize({width:32,height:32}));tray.setToolTip('workFeiBi · 双击打开设置');tray.on('double-click',()=>{showPet();openSettings();});tray.on('right-click',()=>tray.popUpContextMenu(menu()));tray.on('click',showPet);
    globalShortcut.register('CommandOrControl+Shift+F',()=>{pet.isVisible()?pet.hide():showPet();});
    setInterval(()=>{const event=timer.update();if(event)showPet();broadcast(event);},250);
    if(!stored.settings)openSettings();
    if(smoke)require('./smoke')(pet,()=>settingsWindow,openSettings,action,state,timer).then(()=>app.quit()).catch(e=>{console.error(e);app.exit(1);});
  });
  app.on('before-quit',()=>{if(timer)persist();clearInterval(moveLoop);globalShortcut.unregisterAll();});
  app.on('window-all-closed',()=>{});
}
