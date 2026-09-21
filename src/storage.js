const fs=require('node:fs');
const path=require('node:path');
function load(file) {
  for(const target of [file,`${file}.bak`]){
    try{const data=JSON.parse(fs.readFileSync(target,'utf8'));if(data&&typeof data==='object'&&!Array.isArray(data))return {data,recovered:target!==file};}catch{}
  }
  return {data:{},recovered:fs.existsSync(file)};
}
// Write beside the original and rename only after the complete payload exists.
function save(file,data) {
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const next=`${file}.tmp`;
  fs.writeFileSync(next,JSON.stringify(data,null,2),'utf8');
  if(fs.existsSync(file)){
    try{JSON.parse(fs.readFileSync(file,'utf8'));fs.copyFileSync(file,`${file}.bak`);}catch(error){if(error.code)throw error;}
  }
  fs.renameSync(next,file);
}
module.exports={load,save};
