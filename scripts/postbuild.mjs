import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { renderServiceWorker } from './sw-template.mjs';

const dist=new URL('../dist/',import.meta.url);
await access(new URL('index.html',dist));
const html=await readFile(new URL('index.html',dist),'utf8');
if(!html.includes('<main id="main">'))throw new Error('Built index is missing its main landmark.');

async function listFiles(directory,relative=''){
  const entries=await readdir(directory,{withFileTypes:true});
  const files=[];
  for(const entry of entries){
    const next=relative?`${relative}/${entry.name}`:entry.name;
    if(entry.isDirectory())files.push(...await listFiles(new URL(`${entry.name}/`,directory),next));
    else files.push(next);
  }
  return files;
}

const files=(await listFiles(dist)).filter(file=>file!=='sw.js'&&file!=='_headers'&&file!=='staticwebapp.config.json'&&!file.endsWith('.map')).sort();
const shell=[
  '/',
  ...files.map(file=>`/${file}`),
  ...files.filter(file=>file.endsWith('/index.html')).map(file=>`/${file.slice(0,-'index.html'.length)}`)
].filter((path,index,paths)=>paths.indexOf(path)===index);
const fingerprint=createHash('sha256').update(`${Date.now()}\0${shell.join('\0')}`).digest('hex').slice(0,16);
await writeFile(new URL('sw.js',dist),renderServiceWorker({version:`psp-${fingerprint}`,shell}));
console.log(`dist/ ready with index.html, versioned app shell (${shell.length} files), and offline/legal routes.`);
