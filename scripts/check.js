const {spawnSync}=require('node:child_process');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const folder of ['src','scripts','test'])for(const file of fs.readdirSync(path.join(root,folder))){
  if(!file.endsWith('.js'))continue;
  const result=spawnSync(process.execPath,['--check',path.join(root,folder,file)],{stdio:'inherit'});
  if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);
}
console.log('All JavaScript syntax checks passed.');
