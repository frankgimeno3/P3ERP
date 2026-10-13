import XLSX from 'xlsx';
import {createHash} from 'node:crypto';
export const normalizeTicketSupplier=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export function parseTicketWorkbook(bytes){
 const workbook=XLSX.read(bytes,{type:'buffer',cellNF:true}),sha256=createHash('sha256').update(bytes).digest('hex'),tickets=[];
 for(const [sheet,prefix,payment] of [['T Visa P3','V','tarjeta'],['T Efectivo','E','efectivo']]){
  const source=workbook.Sheets[sheet];if(!source)throw Error('Falta la hoja '+sheet);
  const rows=XLSX.utils.sheet_to_json(source,{header:1,defval:null});
  if(rows[0]?.[1]!=='Proveedor'||rows[0]?.[2]!=='Fecha'||rows[0]?.[3]!=='Importe')throw Error('Cabeceras incompatibles en '+sheet);
  for(let index=1;index<rows.length;index++){
   const row=rows[index];if(row.every(value=>value===null||value===''))continue;
   const code=String(row[0]||'').trim();if(!new RegExp('^'+prefix+'\\.\\d{2}\\.\\d{4}$').test(code))throw Error('Código inválido: '+sheet+' fila '+(index+1));
   const date=XLSX.SSF.parse_date_code(row[2],{date1904:!!workbook.Workbook?.WBProps?.date1904});
   if(!date)throw Error('Fecha inválida en '+code);
   const fecha=`${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
   let moneda='EUR',amount=row[3];
   if(typeof amount!=='number'){
    const text=String(amount||'').trim().toUpperCase(),match=text.match(/^(-?\d+(?:[.,]\d+)?)\s*(USD|MXN|\$)$/);
    if(!match)throw Error('Importe no reconocido en '+code);amount=Number(match[1].replace(',','.'));moneda=match[2]==='$'?'MXN':match[2];
   }
   if(!Number.isFinite(amount)||amount===0)throw Error('Importe inválido en '+code);
   const provider=String(row[1]||'').trim();if(!provider)throw Error('Falta proveedor en '+code);
   const card=payment==='tarjeta'?String(row[4]||'').match(/^(\d{4})\s*-\s*(BSAB|BSANT)$/):null;
   if(payment==='tarjeta'&&!card)throw Error('Tarjeta no reconocida en '+code);
   const original=Object.fromEntries(rows[0].map((header,column)=>[column===0?'Código ticket':header,row[column]]));
   tickets.push({codigo_ticket:code,fecha,forma_pago:payment,proveedor:provider,importe_total:moneda==='EUR'?Math.round(amount*100)/100:null,comentarios:String(row[payment==='tarjeta'?5:4]||'').trim(),feria:String(row[payment==='tarjeta'?6:5]||'').trim(),digits:card?.[1]||null,bank:card?(card[2]==='BSAB'?'Sabadell':'Santander'):null,datos_importacion:{sha256,sheet,row:index+1,original,moneda,importe_original:amount}});
  }
 }
 if(new Set(tickets.map(t=>t.codigo_ticket)).size!==tickets.length)throw Error('Hay códigos de ticket duplicados en el Excel.');
 return tickets;
}
export function readTicketArchives(archives){
 const files=new Map();
 for(const {name,bytes} of archives){
  const archive=XLSX.CFB.read(bytes,{type:'buffer'});
  for(let i=0;i<archive.FileIndex.length;i++){
   const file=archive.FileIndex[i],filename=archive.FullPaths[i];if(!file.content?.length||! /\.(pdf|png|jpe?g)$/i.test(filename))continue;
   const code=filename.match(/[VE]\.\d{2}\.\d{4}/i)?.[0].toUpperCase();if(!code)throw Error('Archivo sin código: '+filename);
   if(files.has(code))throw Error('Más de un justificante para '+code);
   files.set(code,{name:filename.split('/').at(-1),bytes:Buffer.from(file.content),zip:name,sha256:createHash('sha256').update(file.content).digest('hex')});
  }
 }
 return files;
}
