// Copies the verified Electron runtime and this app into a standalone folder.
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const dest=path.join(root,'release','workFeiBi');
if(fs.existsSync(dest))throw new Error('release/workFeiBi 已存在，请先将旧目录改名备份再构建');
const runtime=path.join(root,'node_modules/electron/dist');
if(!fs.existsSync(path.join(runtime,'electron.exe')))throw new Error('请先安装 Electron 运行文件');
fs.cpSync(runtime,dest,{recursive:true});fs.renameSync(path.join(dest,'electron.exe'),path.join(dest,'workFeiBi.exe'));
const app=path.join(dest,'resources/app');fs.mkdirSync(app,{recursive:true});
for(const name of ['src','docs','package.json','README.md','ASSET-LICENSE.txt','ASSET-SOURCES.md','QA.md'])fs.cpSync(path.join(root,name),path.join(app,name),{recursive:true});
// Explicit allowlist: drafts, references, downloaded clips and private imports
// never enter the distributable simply because they exist under assets.
for(const name of ['images/phoebe_0.png','images/phoebe_1.png','images/phoebe_2.png','images/phoebe_wave.png','images/phoebe_sleep.png','images/phoebe_angry.png','images/nuonuo_front.png','images/nuonuo_back.png','images/nuonuo_wave.png','images/nuonuo_drowsy.png','images/nuonuo_angry.png','audio/phoebe_chubby_0.mp3']){
  const target=path.join(app,'assets',name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,'assets',name),target);
}
console.log('独立程序目录：'+dest);
