import './style.css';
import { decodeFiles } from './decode';
import { sliceGrid, suggestGrid, transformPixels, type PixelFrame, type TransformOptions, type PaletteName, type DitherName } from './pixels';
import { createZip } from './zip';
import { saveProject, loadProject, hasProject, clearProject } from './storage';
import { captureLicenseFromUrl, isProCached, storeLicense, verifyLicense } from './license';

const $=<T extends HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const fileInput=$<HTMLInputElement>('#file-input'), dropZone=$<HTMLLabelElement>('#drop-zone');
const columns=$<HTMLInputElement>('#columns'), rows=$<HTMLInputElement>('#rows');
const palette=$<HTMLSelectElement>('#palette'), dither=$<HTMLSelectElement>('#dither');
const trim=$<HTMLInputElement>('#trim'), padding=$<HTMLInputElement>('#padding');
const customPalette=$<HTMLTextAreaElement>('#custom-palette');
const canvas=$<HTMLCanvasElement>('#preview-canvas'), ctx=canvas.getContext('2d')!;
const stage=$<HTMLElement>('#canvas-stage'), status=$<HTMLElement>('#status');
const proDialog=$<HTMLDialogElement>('#pro-dialog');

let sourceFiles:File[]=[]; let decodedFrames:PixelFrame[]=[]; let baseFrames:PixelFrame[]=[]; let transformedFrames:PixelFrame[]=[];
let currentFrame=0; let playTimer=0; let proUnlocked=isProCached(); let deferredInstall:BeforeInstallPromptEvent|null=null;

interface BeforeInstallPromptEvent extends Event { prompt():Promise<void>; userChoice:Promise<{outcome:string}>; }

function setStatus(message:string,tone:'normal'|'error'|'success'='normal'){
  status.textContent=message; status.className=`status-line${tone==='normal'?'':` ${tone}`}`;
}
function setProgress(stop:number){
  document.querySelectorAll<HTMLElement>('.route-rail li').forEach((item,index)=>{item.classList.toggle('active',index+1===stop);item.classList.toggle('complete',index+1<stop);});
}
function options():TransformOptions{return{trim:trim.checked,padding:Number(padding.value),palette:palette.value as PaletteName,dither:dither.value as DitherName,customPalette:customPalette.value};}
function currentDelay(){return Number($('#delay').getAttribute('value')||100)}

function rebuildFrames(){
  if(!decodedFrames.length)return;
  const canSlice=decodedFrames.length===1 && sourceFiles.length===1;
  baseFrames=canSlice?sliceGrid(decodedFrames[0],Number(columns.value),Number(rows.value)):decodedFrames.map(frame=>({...frame}));
  if(baseFrames.length>16 && !proUnlocked){baseFrames=baseFrames.slice(0,16);setStatus(`Loaded the first 16 frames. Pocket Pro raises the batch limit; your source remains untouched.`);}
  transformedFrames=baseFrames.map(frame=>({...frame,data:transformPixels(frame.data,options())}));
  currentFrame=Math.min(currentFrame,transformedFrames.length-1); rebuildThumbnails(); renderAll();
}

function renderAll(){
  if(!transformedFrames.length)return;
  const frame=transformedFrames[currentFrame]; canvas.width=frame.data.width;canvas.height=frame.data.height;ctx.putImageData(frame.data,0,0);
  const zoom=Number($<HTMLInputElement>('#zoom').value);canvas.style.width=`${frame.data.width*zoom}px`;canvas.style.height=`${frame.data.height*zoom}px`;
  $('#frame-count').textContent=`Frame ${currentFrame+1} / ${transformedFrames.length}`;
  $('#frame-size').textContent=`${frame.data.width} × ${frame.data.height} px · ${frame.duration} ms`;
  const delay=$<HTMLInputElement>('#delay');delay.value=String(frame.duration);delay.setAttribute('value',String(frame.duration));
  document.querySelectorAll('.frame-thumb').forEach((thumb,index)=>thumb.classList.toggle('active',index===currentFrame));
  $('#export-summary').textContent=`${transformedFrames.length} frame${transformedFrames.length===1?'':'s'} · PNG spritesheet + JSON atlas in one ZIP.`;
}

function rebuildThumbnails(){
  const strip=$('#frame-strip');strip.innerHTML='';
  transformedFrames.forEach((frame,index)=>{
    const button=document.createElement('button');button.className=`frame-thumb${index===currentFrame?' active':''}`;button.setAttribute('role','listitem');button.setAttribute('aria-label',`Show frame ${index+1}`);
    const thumb=document.createElement('canvas');thumb.width=frame.data.width;thumb.height=frame.data.height;thumb.getContext('2d')!.putImageData(frame.data,0,0);button.append(thumb);
    button.addEventListener('click',()=>{currentFrame=index;renderAll()});strip.append(button);
  });
}

function renderTransforms(){
  if(!baseFrames.length)return;
  try{transformedFrames=baseFrames.map(frame=>({...frame,data:transformPixels(frame.data,options())}));rebuildThumbnails();renderAll();
    const color=palette.selectedOptions[0].textContent;const ditherText=dither.value==='floyd'?' with Floyd–Steinberg dithering':'';
    $('#transform-note').textContent=palette.value==='original'?`No color transform. ${trim.checked?'Transparent edges are trimmed.':'Original bounds are kept.'}`:`Colors are mapped to ${color}${ditherText}. Alpha is preserved.`;
    setProgress(3);
  }catch(error){setStatus(error instanceof Error?error.message:'Could not apply the transform.','error');}
}

async function loadFiles(files:File[],persist=true){
  if(!files.length)return;
  stopPlayback();setStatus(`Reading ${files.length} source file${files.length===1?'':'s'} on this device…`);stage.setAttribute('aria-busy','true');
  try{
    const result=await decodeFiles(files);sourceFiles=files;decodedFrames=result.frames;
    const suggestion=suggestGrid(decodedFrames[0].data.width,decodedFrames[0].data.height);
    const canSlice=decodedFrames.length===1 && files.length===1;
    columns.value=String(canSlice?suggestion.columns:1);rows.value=String(canSlice?suggestion.rows:1);
    $('#grid-help').textContent=canSlice?suggestion.confidence:'This source already contains separate animation frames.';
    columns.disabled=!canSlice;rows.disabled=!canSlice;$<HTMLButtonElement>('#auto-grid').disabled=!canSlice;
    $('#frame-controls').removeAttribute('disabled');$('#finish-controls').removeAttribute('disabled');
    $('#source-summary').hidden=false;$('#source-summary').textContent=`${files.map(file=>file.name).join(', ')} · ${decodedFrames.length} decoded frame${decodedFrames.length===1?'':'s'}`;
    stage.classList.remove('empty');$('#empty-state').hidden=true;$('#transport').hidden=false;$('#export-bay').hidden=false;
    rebuildFrames();setProgress(2);
    setStatus(result.warnings[0]??`${baseFrames.length} frame${baseFrames.length===1?'':'s'} ready. Check the boundaries, then export.`,result.warnings.length?'normal':'success');
    if(persist)await saveProject(files);
  }catch(error){setStatus(error instanceof Error?error.message:'These files could not be opened. Try PNG, GIF, or WebP.','error');}
  finally{stage.removeAttribute('aria-busy');}
}

function changeFrame(amount:number){if(!transformedFrames.length)return;currentFrame=(currentFrame+amount+transformedFrames.length)%transformedFrames.length;renderAll();}
function stopPlayback(){window.clearTimeout(playTimer);playTimer=0;$('#play-frame').textContent='Play';$('#play-frame').setAttribute('aria-label','Play animation');}
function playNext(){if(!playTimer)return;changeFrame(1);playTimer=window.setTimeout(playNext,transformedFrames[currentFrame].duration);}
function togglePlayback(){if(playTimer){stopPlayback();return;}if(transformedFrames.length<2)return;playTimer=window.setTimeout(playNext,transformedFrames[currentFrame].duration);$('#play-frame').textContent='Pause';$('#play-frame').setAttribute('aria-label','Pause animation');}

function canvasToBlob(target:HTMLCanvasElement){return new Promise<Blob>((resolve,reject)=>target.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not encode the PNG.')),'image/png'));}
async function exportAtlas(){
  if(!transformedFrames.length)return;setStatus('Packing spritesheet and atlas on this device…');
  try{
    const count=transformedFrames.length, sheetColumns=Math.max(1,Math.min(count,Number($<HTMLInputElement>('#export-columns').value)));
    const cellWidth=Math.max(...transformedFrames.map(f=>f.data.width)),cellHeight=Math.max(...transformedFrames.map(f=>f.data.height));
    const sheetRows=Math.ceil(count/sheetColumns),sheet=document.createElement('canvas');sheet.width=cellWidth*sheetColumns;sheet.height=cellHeight*sheetRows;const sheetCtx=sheet.getContext('2d')!;
    const atlas:{frames:Record<string,unknown>;meta:Record<string,unknown>}={frames:{},meta:{app:'Pocket Sprite Pack',version:'1.0',image:'spritesheet.png',format:'RGBA8888',size:{w:sheet.width,h:sheet.height},scale:'1'}};
    transformedFrames.forEach((frame,index)=>{const column=index%sheetColumns,row=Math.floor(index/sheetColumns),x=column*cellWidth,y=row*cellHeight;const temp=document.createElement('canvas');temp.width=frame.data.width;temp.height=frame.data.height;temp.getContext('2d')!.putImageData(frame.data,0,0);sheetCtx.drawImage(temp,x,y);atlas.frames[`${frame.name}.png`]={frame:{x,y,w:frame.data.width,h:frame.data.height},rotated:false,trimmed:trim.checked,spriteSourceSize:{x:0,y:0,w:frame.data.width,h:frame.data.height},sourceSize:{w:frame.data.width,h:frame.data.height},duration:frame.duration};});
    const png=new Uint8Array(await (await canvasToBlob(sheet)).arrayBuffer());const json=new TextEncoder().encode(JSON.stringify(atlas,null,2));const zip=createZip([{name:'spritesheet.png',data:png},{name:'atlas.json',data:json}]);const name=`pocket-sprite-pack-${new Date().toISOString().slice(0,10)}.zip`;const file=new File([zip],name,{type:'application/zip'});
    const nav=navigator as Navigator&{canShare?:(data:{files:File[]})=>boolean;share?:(data:{files:File[];title:string})=>Promise<void>};
    if(/iPad|iPhone|iPod/.test(navigator.userAgent)&&nav.canShare?.({files:[file]})){await nav.share?.({files:[file],title:'Sprite atlas'});setStatus('Atlas opened in the iOS share sheet.','success');}
    else{const url=URL.createObjectURL(zip);const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);setStatus(`Exported ${name}.`,'success');}
    setProgress(4);
  }catch(error){if((error as DOMException).name==='AbortError'){setStatus('Export sharing was cancelled.');return;}setStatus(error instanceof Error?error.message:'Could not export the atlas.','error');}
}

fileInput.addEventListener('change',()=>loadFiles(Array.from(fileInput.files||[])));
dropZone.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();fileInput.click();}});
for(const type of ['dragenter','dragover'])dropZone.addEventListener(type,event=>{event.preventDefault();dropZone.classList.add('dragging')});
for(const type of ['dragleave','drop'])dropZone.addEventListener(type,event=>{event.preventDefault();dropZone.classList.remove('dragging')});
dropZone.addEventListener('drop',event=>loadFiles(Array.from(event.dataTransfer?.files||[])));
columns.addEventListener('change',rebuildFrames);rows.addEventListener('change',rebuildFrames);
$('#auto-grid').addEventListener('click',()=>{if(!decodedFrames.length)return;const grid=suggestGrid(decodedFrames[0].data.width,decodedFrames[0].data.height);columns.value=String(grid.columns);rows.value=String(grid.rows);$('#grid-help').textContent=grid.confidence;rebuildFrames();});
for(const control of [trim,padding,palette,dither,customPalette])control.addEventListener(control===padding?'input':'change',()=>{if(control===padding)$('#padding-output').textContent=padding.value;if(control===palette){if(palette.value==='custom'&&!proUnlocked){palette.value='original';openPro('Custom palettes are part of Pocket Pro.');return;}$('#custom-palette-wrap').hidden=palette.value!=='custom';}renderTransforms();});
$('#zoom').addEventListener('input',event=>{const value=(event.target as HTMLInputElement).value;$('#zoom-output').textContent=`${value}×`;if(transformedFrames.length)renderAll();});
$('#prev-frame').addEventListener('click',()=>changeFrame(-1));$('#next-frame').addEventListener('click',()=>changeFrame(1));$('#play-frame').addEventListener('click',togglePlayback);
stage.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();changeFrame(-1)}if(event.key==='ArrowRight'){event.preventDefault();changeFrame(1)}});
$('#delay').addEventListener('change',event=>{if(!baseFrames.length)return;const value=Math.max(20,Math.min(5000,Number((event.target as HTMLInputElement).value)));baseFrames[currentFrame].duration=value;transformedFrames[currentFrame].duration=value;renderAll()});
$('#export-button').addEventListener('click',exportAtlas);

function openPro(message=''){if(message)$('#license-status').textContent=message;proDialog.showModal();}
$('#pro-button').addEventListener('click',()=>openPro());$('#footer-pro').addEventListener('click',()=>openPro());$('#close-pro').addEventListener('click',()=>proDialog.close());
proDialog.addEventListener('click',event=>{if(event.target===proDialog)proDialog.close()});
$('#license-form').addEventListener('submit',async event=>{event.preventDefault();const token=$<HTMLInputElement>('#license-input').value.trim();if(!token){$('#license-status').textContent='Paste a license token first.';return;}storeLicense(token);$('#license-status').textContent='Checking license…';const verdict=await verifyLicense(true);proUnlocked=verdict.valid;$('#license-status').textContent=verdict.valid?'Pocket Pro is unlocked on this device.':verdict.reason==='offline'?'Could not verify while offline. Reconnect once to restore.':'That license is not active for Pocket Sprite Pack.';if(verdict.valid)setTimeout(()=>proDialog.close(),900);});

$('#resume-button').addEventListener('click',async()=>{const files=await loadProject();if(files)loadFiles(files,false)});
$('#clear-data').addEventListener('click',async()=>{await clearProject();$('#resume-button').hidden=true;setStatus('Local recovery project cleared. Source files were not changed.','success')});

function updateNetwork(){const online=navigator.onLine;$('#network-state').innerHTML=`<i></i> ${online?'Ready offline':'Offline mode'}`;$('#network-state').classList.toggle('offline',!online)}
addEventListener('online',updateNetwork);addEventListener('offline',updateNetwork);updateNetwork();

addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstall=event as BeforeInstallPromptEvent;$('#install-button').hidden=false});
$('#install-button').addEventListener('click',async()=>{await deferredInstall?.prompt();deferredInstall=null;$('#install-button').hidden=true});

async function boot(){
  const captured=captureLicenseFromUrl();if(captured)openPro('License received. Verifying…');
  if(await hasProject())$('#resume-button').hidden=false;
  const verdict=await verifyLicense();proUnlocked=verdict.valid;if(captured)$('#license-status').textContent=verdict.valid?'Pocket Pro is unlocked on this device.':'License could not be verified yet.';
  if('serviceWorker'in navigator){const registration=await navigator.serviceWorker.register('/sw.js');if(registration.waiting)$('#update-toast').hidden=false;navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='APP_UPDATED')$('#update-toast').hidden=false});}
}
$('#reload-app').addEventListener('click',()=>location.reload());
boot().catch(()=>setStatus('The local recovery store is unavailable; editing and export still work.'));
