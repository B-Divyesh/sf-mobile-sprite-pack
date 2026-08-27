const DB_NAME='pocket-sprite-pack';
const STORE='project';
const PROJECT_KEY='lastProject';

export interface ProjectSettings {
  columns:number;
  rows:number;
  trim:boolean;
  padding:number;
  palette:string;
  dither:string;
  customPalette:string;
  currentFrame:number;
  zoom:number;
  exportColumns:number;
  frameDurations:number[];
}

export interface SavedProject {
  schema:1;
  files:File[];
  settings:ProjectSettings;
  savedAt:number;
}

export interface LegacyProject {
  schema:0;
  files:File[];
  settings:null;
  savedAt:number;
}

export type LocalProject=SavedProject|LegacyProject;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,2);
    request.onupgradeneeded=()=>{
      if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}

function readValue<T>(db:IDBDatabase,key:string):Promise<T|undefined>{
  return new Promise((resolve,reject)=>{
    const request=db.transaction(STORE).objectStore(STORE).get(key);
    request.onsuccess=()=>resolve(request.result as T|undefined);
    request.onerror=()=>reject(request.error);
  });
}

function isSavedProject(value:unknown):value is SavedProject {
  if(!value||typeof value!=='object')return false;
  const project=value as Partial<SavedProject>;
  return project.schema===1&&Array.isArray(project.files)&&Boolean(project.settings)&&typeof project.savedAt==='number';
}

export async function saveProject(files:File[],settings:ProjectSettings) {
  const db=await openDb();
  const project:SavedProject={schema:1,files,settings,savedAt:Date.now()};
  await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put(project,PROJECT_KEY);
    tx.objectStore(STORE).put(project.savedAt,'savedAt');
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
  db.close();
}

export async function loadProject():Promise<LocalProject|null>{
  const db=await openDb();
  try{
    const project=await readValue<unknown>(db,PROJECT_KEY);
    if(isSavedProject(project))return project;

    // Projects saved by versions before schema 1 contained only raw files.
    // Keep them resumable, then upgrade them on the next successful save.
    const files=await readValue<File[]>(db,'files');
    if(Array.isArray(files)&&files.length){
      const savedAt=await readValue<number>(db,'savedAt');
      return {schema:0,files,settings:null,savedAt:typeof savedAt==='number'?savedAt:0};
    }
    return null;
  }finally{db.close();}
}

export async function hasProject(){ return Boolean(await loadProject()); }

export async function clearProject(){
  const db=await openDb();
  await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
  db.close();
}
