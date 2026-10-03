const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

test('事件订阅只传递状态，不向渲染器返回内部 IPC 对象',()=>{
  const listeners=new Map();let api;
  const ipcRenderer={on(channel,listener){listeners.set(channel,listener);return this;}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/preload.js'),'utf8'),{
    require(name){assert.equal(name,'electron');return {ipcRenderer,contextBridge:{exposeInMainWorld(name,value){assert.equal(name,'workFeiBi');api=value;}}};}
  });
  for(const [method,channel] of [['onState','state'],['onPetEvent','pet-event'],['onImpact','impact']]){
    let received;assert.equal(api[method](value=>{received=value;}),undefined);
    const payload={type:channel};listeners.get(channel)({sender:'internal'},payload);
    assert.equal(received,payload);
  }
});
