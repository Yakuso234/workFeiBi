const test=require('node:test');const assert=require('node:assert/strict');
const {mimeOf,Voices}=require('../src/voices');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
test('音频头校验拒绝伪装文本与过短文件',()=>{
  assert.throws(()=>mimeOf(Buffer.from('bad')));assert.throws(()=>mimeOf(Buffer.alloc(20)));
  assert.equal(mimeOf(Buffer.from('RIFF1234WAVE1234')),'audio/wav');assert.equal(mimeOf(Buffer.from('ID3abcdefghijklm')),'audio/mpeg');
});
test('分角色本地音效导入与重启恢复，阻止路径穿越',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'workfeibi-voice-'));
  try{const source=path.join(dir,'sample.wav');fs.writeFileSync(source,'RIFF1234WAVE1234');const voices=new Voices(path.join(dir,'voices'));
    assert.throws(()=>voices.get('../secret'));voices.import('nuonuo',source);
    assert.equal(voices.snapshot().nuonuo,true);assert.equal(voices.snapshot().phoebe,false);
    assert.match(new Voices(path.join(dir,'voices')).get('nuonuo'),/^data:audio\/wav/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
