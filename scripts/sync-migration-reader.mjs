import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

// The reading room is authored in the Migration workspace. Publish its built
// static assets here; do not independently edit the generated migration/ copy.
const siteRoot=path.resolve(import.meta.dirname,'..');
const source=path.resolve(process.argv[2]||path.join(siteRoot,'../Migration/migration-reader/dist'));
const destination=path.join(siteRoot,'migration');
if((await fs.readFile(path.join(siteRoot,'CNAME'),'utf8')).trim()!=='www.rewardschool.com.au')throw Error('Unexpected target website');
if(path.relative(siteRoot,destination)!=='migration')throw Error('Unexpected export directory');
const sourceIndex=await fs.readFile(path.join(source,'index.html'),'utf8');
if(!sourceIndex.includes('Migration Reading Room'))throw Error('Unexpected source application');
const cases=JSON.parse(await fs.readFile(path.join(source,'data/cases.json'),'utf8'));
const hashes={};let bytes=0;
async function copy(directory,relative=''){
 for(const entry of await fs.readdir(directory,{withFileTypes:true})){
  if(entry.name==='server'||entry.name==='.openai')continue;
  if(entry.isSymbolicLink())throw Error('Symlinks are not exported');
  const name=path.join(relative,entry.name),target=path.join(destination,name);
  if(entry.isDirectory()){await fs.mkdir(target,{recursive:true});await copy(path.join(directory,entry.name),name);continue;}
  if(!entry.isFile())continue;
  let body=await fs.readFile(path.join(directory,entry.name));
  if(name==='index.html'){
   let html=body.toString('utf8');
   html=html.replace('<title>','<link rel="canonical" href="https://www.rewardschool.com.au/migration/">\n  <title>');
   html=html.replace('<title>','<meta name="mrr-search-api" content="https://migration-law-reading-room.fluffybrowndiscord.chatgpt.site/">\n  <title>');
   html=html.replace('<div class="sidebar-foot">','<div class="sidebar-foot"><a class="aside-link" href="/">← Reward School</a>');
   body=Buffer.from(html,'utf8');
  }
  await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,body);
  hashes[name.replaceAll(path.sep,'/')]=createHash('sha256').update(body).digest('hex');bytes+=body.length;
 }
}
await fs.mkdir(destination,{recursive:true});await copy(source);
await fs.writeFile(path.join(siteRoot,'migration-release.json'),JSON.stringify({url:'https://www.rewardschool.com.au/migration/',files:hashes,cases:cases.cases.length},null,2)+'\n');
console.log(JSON.stringify({destination,files:Object.keys(hashes).length,bytes,cases:cases.cases.length}));
