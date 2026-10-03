// One catalog shared by Electron, the pet renderer and the control console.
(function (scope) {
  const list=Object.freeze([
    Object.freeze({id:'phoebe',name:'菲比啾比'}),
    Object.freeze({id:'nuonuo',name:'弗糯糯'}),
    Object.freeze({id:'owl',name:'发条鸮'})
  ]);
  const ids=Object.freeze(list.map(character=>character.id));
  const valid=id=>typeof id==='string'&&ids.includes(id);
  const name=id=>list.find(character=>character.id===id)?.name||list[0].name;
  const api=Object.freeze({list,ids,valid,name});
  if(typeof module==='object'&&module.exports)module.exports=api;
  else scope.PetCharacters=api;
})(typeof window==='object'?window:globalThis);
