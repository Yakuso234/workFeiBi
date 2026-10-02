const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
test('裂纹首帧时间早于开始时间时安全绘制，结束后清空',()=>{
  let callback,onImpact,drawn=0;
  const point=(...values)=>{assert.ok(values.every(Number.isFinite));drawn++;};
  const ctx={setTransform(){},clearRect(){},save(){},restore(){},beginPath(){},moveTo:point,lineTo:point,stroke(){},arc:point,closePath(){},fill(){}};
  const canvas={width:0,height:0,dataset:{},getContext:()=>ctx};
  const scope={document:{getElementById:()=>canvas},window:{workFeiBi:{onImpact:fn=>onImpact=fn}},performance:{now:()=>110},innerWidth:1200,innerHeight:800,devicePixelRatio:1,requestAnimationFrame:fn=>{callback=fn;return 1;},cancelAnimationFrame(){},Math};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/impact.js'),'utf8'),scope);
  onImpact({x:NaN,y:4});assert.equal(callback,undefined);
  onImpact({x:1000,y:600});assert.equal(canvas.dataset.active,'true');
  callback(100);assert.ok(drawn>0);
  callback(400);assert.equal(canvas.dataset.rays,'11');assert.equal(canvas.dataset.branches,'22');
  callback(2900);assert.equal(canvas.dataset.active,'false');
});
