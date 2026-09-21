const fs=require('node:fs');const path=require('node:path');
const characters=['phoebe','nuonuo'];
function mimeOf(buffer){
  if(buffer.length<12)throw new Error('音频文件太短或已损坏');
  if(buffer.subarray(0,3).toString()==='ID3'||(buffer[0]===255&&(buffer[1]&224)===224))return 'audio/mpeg';
  if(buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WAVE')return 'audio/wav';
  if(buffer.subarray(0,4).toString()==='OggS')return 'audio/ogg';
  throw new Error('只支持有效的 MP3、WAV 或 OGG 文件');
}
class Voices{
  constructor(directory){this.directory=directory;this.data={};this.revision=0;
    for(const character of characters){try{this.data[character]=this.read(this.file(character));}catch{}}
  }
  file(character){if(!characters.includes(character))throw new Error('未知角色');return path.join(this.directory,`${character}.audio`);}
  read(file){if(fs.statSync(file).size>5*1024*1024)throw new Error('音频不能超过 5 MB');const bytes=fs.readFileSync(file);return `data:${mimeOf(bytes)};base64,${bytes.toString('base64')}`;}
  import(character,source){
    const data=this.read(source),target=this.file(character);
    fs.mkdirSync(this.directory,{recursive:true});
    fs.writeFileSync(`${target}.tmp`,Buffer.from(data.split(',')[1],'base64'));fs.renameSync(`${target}.tmp`,target);
    this.data[character]=data;this.revision++;return this.snapshot();
  }
  get(character){this.file(character);return this.data[character]||null;}
  snapshot(){return {phoebe:Boolean(this.data.phoebe),nuonuo:Boolean(this.data.nuonuo),revision:this.revision};}
}
module.exports={Voices,mimeOf};
