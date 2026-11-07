import apiClient from '@/app/apiClient';
import {productionZip} from './productionZip';
const maximumBytes=200*1024*1024;
/** Download from S3 without proxying large files through a Vercel function. */
export async function downloadContentMaterials(contentId:string,ids:string[],zip=false){
 const endpoint=`/api/v1/produccion/contenidos/${encodeURIComponent(contentId)}/materiales`;
 const {data}=await apiClient.post(endpoint,{accion:'preparar-descarga',ids});
 const files:Array<{id:string;nombre:string;url:string;size?:number}>=data.archivos||[];
 if(files.length!==ids.length)throw new Error('No se han podido preparar todos los archivos.');
 if(files.reduce((sum,file)=>sum+(file.size||0),0)>maximumBytes)throw new Error('El lote supera 200 MB. Descarga los materiales individualmente.');
 const downloaded:Array<{name:string;data:ArrayBuffer}>=[];let total=0;
 for(const file of files){
  const response=await fetch(file.url);
  if(!response.ok)throw new Error(`No se pudo descargar «${file.nombre}».`);
  if(total+Number(response.headers.get('content-length')||0)>maximumBytes)throw new Error('El lote supera 200 MB. Descarga los materiales individualmente.');
  const bytes=await response.arrayBuffer();total+=bytes.byteLength;
  if(total>maximumBytes)throw new Error('El lote supera 200 MB. Descarga los materiales individualmente.');
  downloaded.push({name:file.nombre,data:bytes});
 }
 let blob:Blob;
 if(zip){
  blob=productionZip(downloaded);
 }else blob=new Blob([downloaded[0].data]);
 await apiClient.post(endpoint,{accion:'marcar',ids,descargado:true});
 const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=zip?'materiales.zip':downloaded[0].name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
