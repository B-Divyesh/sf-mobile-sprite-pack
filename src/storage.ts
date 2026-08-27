const DB_NAME='pocket-sprite-pack'; const STORE='project';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{ const request=indexedDB.open(DB_NAME,1); request.onupgradeneeded=()=>request.result.createObjectStore(STORE); request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error); });
}
export async function saveProject(files: File[]) {
  const db=await openDb(); await new Promise<void>((resolve,reject)=>{ const tx=db.transaction(STORE,'readwrite'); tx.objectStore(STORE).put(files,'files'); tx.objectStore(STORE).put(Date.now(),'savedAt'); tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error); }); db.close();
}
export async function loadProject(): Promise<File[] | null> {
  const db=await openDb(); const result=await new Promise<File[]|null>((resolve,reject)=>{ const req=db.transaction(STORE).objectStore(STORE).get('files'); req.onsuccess=()=>resolve(req.result ?? null); req.onerror=()=>reject(req.error); }); db.close(); return result;
}
export async function hasProject(){ return (await loadProject())?.length ? true:false; }
export async function clearProject(){ const db=await openDb(); await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).clear();tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close(); }
