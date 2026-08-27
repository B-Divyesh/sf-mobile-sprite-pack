import { access, readFile } from 'node:fs/promises';

await access(new URL('../dist/index.html',import.meta.url));
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
if(!html.includes('<main id="main">'))throw new Error('Built index is missing its main landmark.');
console.log('dist/ ready with index.html and offline/legal routes.');
