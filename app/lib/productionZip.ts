// ZIP STORE with UTF-8 names (PKWARE APPNOTE: general-purpose flag bit 11).
// Writing only: filenames are basenames and every entry receives a unique prefix.
const crcTable=Uint32Array.from({length:256},(_,value)=>{
 let crc=value;for(let bit=0;bit<8;bit++)crc=crc&1?0xedb88320^(crc>>>1):crc>>>1;return crc>>>0;
});
function crc32(bytes:Uint8Array){let crc=0xffffffff;for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function header(length:number){const bytes=new Uint8Array(length);return {bytes,view:new DataView(bytes.buffer)};}
export function productionZip(files:Array<{name:string;data:ArrayBuffer}>){
 if(!files.length||files.length>65535)throw new Error('Cantidad de archivos no válida para el ZIP.');
 const parts:BlobPart[]=[],directory:BlobPart[]=[];let offset=0,directorySize=0;
 files.forEach((file,index)=>{
  const filename=new TextEncoder().encode(`${index+1}_${file.name.replace(/[\\/\x00-\x1f]/g,'_')||'material'}`),data=new Uint8Array(file.data),crc=crc32(data);
  if(filename.byteLength>65535||offset+data.byteLength>0xffffffff)throw new Error('El lote supera el tamaño admitido por ZIP.');
  const local=header(30);local.view.setUint32(0,0x04034b50,true);local.view.setUint16(4,20,true);local.view.setUint16(6,0x0800,true);local.view.setUint16(12,0x0021,true);local.view.setUint32(14,crc,true);local.view.setUint32(18,data.byteLength,true);local.view.setUint32(22,data.byteLength,true);local.view.setUint16(26,filename.byteLength,true);
  parts.push(local.bytes.buffer as ArrayBuffer,filename.buffer as ArrayBuffer,file.data);
  const central=header(46);central.view.setUint32(0,0x02014b50,true);central.view.setUint16(4,20,true);central.view.setUint16(6,20,true);central.view.setUint16(8,0x0800,true);central.view.setUint16(14,0x0021,true);central.view.setUint32(16,crc,true);central.view.setUint32(20,data.byteLength,true);central.view.setUint32(24,data.byteLength,true);central.view.setUint16(28,filename.byteLength,true);central.view.setUint32(42,offset,true);
  directory.push(central.bytes.buffer as ArrayBuffer,filename.buffer as ArrayBuffer);directorySize+=46+filename.byteLength;offset+=30+filename.byteLength+data.byteLength;
 });
 const end=header(22);end.view.setUint32(0,0x06054b50,true);end.view.setUint16(8,files.length,true);end.view.setUint16(10,files.length,true);end.view.setUint32(12,directorySize,true);end.view.setUint32(16,offset,true);
 return new Blob([...parts,...directory,end.bytes.buffer as ArrayBuffer],{type:'application/zip'});
}
