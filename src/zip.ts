const encoder = new TextEncoder();

let crcTable: Uint32Array | undefined;
function crc32(data: Uint8Array) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=(c&1)?0xedb88320^(c>>>1):c>>>1; crcTable[n]=c>>>0; }
  }
  let crc=0xffffffff; for(const byte of data) crc=crcTable[(crc^byte)&0xff]^(crc>>>8); return (crc^0xffffffff)>>>0;
}

function view(size:number){ const bytes=new Uint8Array(size); return {bytes,data:new DataView(bytes.buffer)}; }
export interface ZipFile { name:string; data:Uint8Array; }

export function createZip(files: ZipFile[]): Blob {
  const parts: Uint8Array[]=[]; const directory: Uint8Array[]=[]; let offset=0;
  for (const file of files) {
    const name=encoder.encode(file.name); const checksum=crc32(file.data);
    const local=view(30+name.length); local.data.setUint32(0,0x04034b50,true); local.data.setUint16(4,20,true); local.data.setUint16(8,0,true); local.data.setUint32(14,checksum,true); local.data.setUint32(18,file.data.length,true); local.data.setUint32(22,file.data.length,true); local.data.setUint16(26,name.length,true); local.bytes.set(name,30);
    parts.push(local.bytes,file.data);
    const central=view(46+name.length); central.data.setUint32(0,0x02014b50,true); central.data.setUint16(4,20,true); central.data.setUint16(6,20,true); central.data.setUint32(16,checksum,true); central.data.setUint32(20,file.data.length,true); central.data.setUint32(24,file.data.length,true); central.data.setUint16(28,name.length,true); central.data.setUint32(42,offset,true); central.bytes.set(name,46); directory.push(central.bytes);
    offset+=local.bytes.length+file.data.length;
  }
  const centralSize=directory.reduce((sum,item)=>sum+item.length,0); const end=view(22); end.data.setUint32(0,0x06054b50,true); end.data.setUint16(8,files.length,true); end.data.setUint16(10,files.length,true); end.data.setUint32(12,centralSize,true); end.data.setUint32(16,offset,true);
  return new Blob([...parts,...directory,end.bytes].map(part=>Uint8Array.from(part).buffer),{type:'application/zip'});
}
