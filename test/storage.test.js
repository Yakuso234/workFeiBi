const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {load,save}=require('../src/storage');
test('保存保留上一版，损坏主配置可以恢复备份',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'workfeibi-test-'));
  try {
    const file=path.join(dir,'settings.json');assert.deepEqual(load(file).data,{});
    save(file,{version:1});save(file,{version:2});assert.equal(load(file).data.version,2);
    fs.writeFileSync(file,'{broken');assert.equal(load(file).data.version,1);assert.equal(load(file).recovered,true);
    save(file,{version:3});assert.equal(load(file).data.version,3);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
