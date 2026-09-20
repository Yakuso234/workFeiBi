// Copies the verified Electron runtime and this app into a standalone folder.
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const dest=path.join(root,'release','workFeiBi');
if(fs.existsSync(dest))throw new Error('release/workFeiBi 已存在，请先将旧目录改名备份再构建');
const runtime=path.join(root,'node_modules/electron/dist');
if(!fs.existsSync(path.join(runtime,'electron.exe')))throw new Error('请先安装 Electron 运行文件');
fs.cpSync(runtime,dest,{recursive:true});fs.renameSync(path.join(dest,'electron.exe'),path.join(dest,'workFeiBi.exe'));
const app=path.join(dest,'resources/app');fs.mkdirSync(app,{recursive:true});
for(const name of ['src','assets','package.json','README.md','ASSET-LICENSE.txt','ASSET-SOURCES.md','QA.md'])fs.cpSync(path.join(root,name),path.join(app,name),{recursive:true,filter:p=>!p.endsWith('spritesheet.webp')&&(!p.endsWith('.mp3')||p.endsWith('phoebe_chubby_0.mp3'))});
console.log('独立程序目录：'+dest);
