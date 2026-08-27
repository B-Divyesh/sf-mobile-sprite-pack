import { parseGIF, decompressFrames } from 'gifuct-js';
import type { PixelFrame } from './pixels';

const canvasToData = (canvas: HTMLCanvasElement) => canvas.getContext('2d',{willReadFrequently:true})!.getImageData(0,0,canvas.width,canvas.height);

async function decodeStatic(file: File): Promise<PixelFrame[]> {
  const url=URL.createObjectURL(file);
  try {
    const image=new Image(); image.decoding='async'; image.src=url; await image.decode();
    const canvas=document.createElement('canvas'); canvas.width=image.naturalWidth; canvas.height=image.naturalHeight;
    canvas.getContext('2d')!.drawImage(image,0,0);
    return [{data:canvasToData(canvas),duration:100,name:file.name.replace(/\.[^.]+$/,'')}];
  } finally { URL.revokeObjectURL(url); }
}

async function decodeGif(file: File): Promise<PixelFrame[]> {
  const gif=parseGIF(await file.arrayBuffer());
  const parts=decompressFrames(gif,true);
  const width=gif.lsd.width, height=gif.lsd.height;
  let composed=new Uint8ClampedArray(width*height*4);
  const frames:PixelFrame[]=[];
  for(let index=0;index<parts.length;index++){
    const part=parts[index]; const before=new Uint8ClampedArray(composed);
    const {left,top,width:patchWidth,height:patchHeight}=part.dims;
    for(let y=0;y<patchHeight;y++)for(let x=0;x<patchWidth;x++){
      const from=(y*patchWidth+x)*4; const alpha=part.patch[from+3]; if(alpha===0)continue;
      const to=((top+y)*width+left+x)*4; composed.set(part.patch.subarray(from,from+4),to);
    }
    frames.push({data:new ImageData(new Uint8ClampedArray(composed),width,height),duration:Math.max(20,(part.delay||10)*10),name:`${file.name.replace(/\.[^.]+$/,'')}-${String(index+1).padStart(2,'0')}`});
    if(part.disposalType===2){for(let y=top;y<top+patchHeight;y++)for(let x=left;x<left+patchWidth;x++)composed.fill(0,(y*width+x)*4,(y*width+x)*4+4);}
    if(part.disposalType===3)composed=before;
  }
  return frames;
}

async function decodeAnimatedWebP(file:File):Promise<PixelFrame[]|null>{
  const Decoder=(globalThis as unknown as {ImageDecoder?:new(options:{data:ArrayBuffer;type:string})=>any}).ImageDecoder;
  if(!Decoder)return null;
  try{
    const decoder=new Decoder({data:await file.arrayBuffer(),type:file.type||'image/webp'}); await decoder.tracks.ready;
    const count=decoder.tracks.selectedTrack?.frameCount||1; const frames:PixelFrame[]=[];
    for(let index=0;index<count;index++){const result=await decoder.decode({frameIndex:index});const frame=result.image;const canvas=document.createElement('canvas');canvas.width=frame.displayWidth;canvas.height=frame.displayHeight;canvas.getContext('2d')!.drawImage(frame,0,0);frames.push({data:canvasToData(canvas),duration:Math.max(20,Math.round((frame.duration||100000)/1000)),name:`${file.name.replace(/\.[^.]+$/,'')}-${String(index+1).padStart(2,'0')}`});frame.close();}
    decoder.close(); return frames;
  }catch{return null;}
}

export async function decodeFiles(files:File[]):Promise<{frames:PixelFrame[];warnings:string[]}> {
  const frames:PixelFrame[]=[]; const warnings:string[]=[];
  for(const file of files){
    if(file.size>25*1024*1024)throw new Error(`${file.name} is over the 25 MB safety limit.`);
    const type=file.type || ({png:'image/png',gif:'image/gif',webp:'image/webp'}[file.name.split('.').pop()?.toLowerCase()||''] ?? '');
    if(!['image/png','image/gif','image/webp'].includes(type))throw new Error(`${file.name} is not a PNG, GIF, or WebP image.`);
    if(type==='image/gif')frames.push(...await decodeGif(file));
    else if(type==='image/webp'){
      const decoded=await decodeAnimatedWebP(file);
      if(decoded)frames.push(...decoded); else {frames.push(...await decodeStatic(file));warnings.push('This browser exposes the first WebP frame only. Export animated WebP as GIF or separate PNGs for all frames.');}
    } else frames.push(...await decodeStatic(file));
    if(frames.reduce((sum,frame)=>sum+frame.data.width*frame.data.height,0)>80_000_000)throw new Error('This project would exceed the 80-megapixel mobile memory limit. Try fewer or smaller frames.');
  }
  return {frames,warnings};
}
