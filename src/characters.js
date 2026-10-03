// One catalog shared by Electron, the pet renderer and the control console.
(function (scope) {
  const list=Object.freeze([
    Object.freeze({id:'phoebe',name:'菲比啾比',nickname:'啾比',supportsBack:true}),
    Object.freeze({id:'nuonuo',name:'弗糯糯',nickname:'糯糯',supportsBack:true}),
    Object.freeze({id:'owl',name:'发条鸮',nickname:'小鸮',supportsBack:true}),
    Object.freeze({id:'miku',name:'初音未来',nickname:'初音',supportsBack:false,portrait:'../assets/miku/previews/idle.webp',kind:'FAN ART / 1024px 连续帧',description:'涂山苏苏绘制的 Q 版初音，40 张原始透明动画帧。待机、眨眼、挠头、困倦和生气各有动作；上游未提供背面。'})
  ]);
  const ids=Object.freeze(list.map(character=>character.id));
  const valid=id=>typeof id==='string'&&ids.includes(id);
  const name=id=>list.find(character=>character.id===id)?.name||list[0].name;
  const get=id=>list.find(character=>character.id===id)||list[0];
  const api=Object.freeze({list,ids,valid,name,get});
  if(typeof module==='object'&&module.exports)module.exports=api;
  else scope.PetCharacters=api;
})(typeof window==='object'?window:globalThis);
