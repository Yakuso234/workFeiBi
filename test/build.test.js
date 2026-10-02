const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
test('默认构建排除本地语音，显式本机构建仅复制三段白名单',()=>{
  const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'scripts/build.js'),'utf8');
  function run(local){
    const copied=[];
    const fakeFs={existsSync:p=>p!==path.join(root,'release','workFeiBi'),cpSync:(a,b)=>copied.push(a),copyFileSync:(a,b)=>copied.push(a),renameSync(){},mkdirSync(){}};
    vm.runInNewContext(source,{__dirname:path.join(root,'scripts'),require:name=>name==='node:fs'?fakeFs:require(name),process:{argv:local?['node','build.js','--with-local-audio']:['node','build.js']},console:{log(){}}});
    return copied;
  }
  assert.equal(run(false).filter(p=>p.includes('local-media')).length,0);
  const clips=run(true).filter(p=>p.includes('local-media'));
  assert.deepEqual(clips.map(p=>path.basename(p)),['nuonuo-1.wav','nuonuo-2.wav','nuonuo-3.wav']);
});
