import {parseCsvRecords} from '../../../app/lib/parseCsv.js';
export const normalizedAccountName = value => String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleUpperCase('es');
export function commentDate(value) {
  const m=String(value).match(/^(\d{2})-(\d{2})-(\d{4}) (\d{1,2}):(\d{2}) (AM|PM)$/);
  if(!m)throw Error(`Fecha de comentario no válida: ${value}`);
  const [,d,mo,y,h,mi,period]=m,hour=Number(h)%12+(period==='PM'?12:0);
  if(+h<1||+h>12||+mi>59)throw Error('Hora de comentario no válida.');
  const wall=Date.UTC(+y,+mo-1,+d,hour,+mi);
  const offset=new Intl.DateTimeFormat('en',{timeZone:'Europe/Madrid',timeZoneName:'shortOffset'}).formatToParts(new Date(wall)).find(p=>p.type==='timeZoneName').value.match(/GMT([+-])(\d+)/);
  const result=new Date(wall-(offset?Number(offset[2])*(offset[1]==='+'?1:-1):0)*3600000);
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(result).map(p=>[p.type,p.value]));
  if(parts.year!==y||parts.month!==mo||parts.day!==d||+parts.hour!==hour||parts.minute!==mi)throw Error(`Fecha imposible: ${value}`);
  return result.toISOString();
}
export function prepareVtigerComments(csv,accounts,agents=[]) {
  const [headers,...records]=parseCsvRecords(csv);
  const required=['Comentarios Comentario','Comentarios Related To','Comentarios Autor','Comentarios Fecha de Creación','Comentarios Acción'];
  if(!required.every(h=>headers.includes(h))||new Set(headers).size!==headers.length)throw Error('Encabezado de comentarios vtiger no válido.');
  const names=new Map();
  for(const a of accounts)for(const name of new Set([a.nombre_empresa,a.original_name].filter(Boolean).map(normalizedAccountName)))names.set(name,[...(names.get(name)||[]),a.id_cuenta]);
  const comments=[],unresolved=[],keys=new Map();let empty=0,duplicates=0;
  records.forEach((values,index)=>{
    if(values.length!==headers.length)throw Error(`Fila ${index+2}: columnas incorrectas.`);
    const raw=Object.fromEntries(headers.map((h,i)=>[h,values[i]]));
    if(!raw['Comentarios Comentario'].trim()){empty++;return;}
    const sourceId=raw['Comentarios Acción'];if(!/^\d+$/.test(sourceId))throw Error(`Fila ${index+2}: falta el identificador original del comentario.`);
    const ids=names.get(normalizedAccountName(raw['Comentarios Related To']))||[];
    if(ids.length!==1){unresolved.push({row:index+2,sourceId,name:raw['Comentarios Related To'],accountRecord:raw['Cuentas Acción']?.match(/[?&]record=(\d+)/)?.[1]||null,candidates:ids});return;}
    const author=raw['Comentarios Autor'],email=author.split(/\s+/).find(s=>s.includes('@'));
    const matches=email?agents.filter(a=>a.email_agente?.toLowerCase()===email.toLowerCase()):[];
    const item={id_comentario:`com_vtiger_${sourceId}`,id_entidad:ids[0],contenido_comentario:raw['Comentarios Comentario'],
      created_at:commentDate(raw['Comentarios Fecha de Creación']),id_original_autor:matches.length===1?matches[0].id_agente:`vtiger: ${author}`,raw};
    const old=keys.get(sourceId);
    if(old){if(JSON.stringify(old)!==JSON.stringify(item))throw Error(`El comentario ${sourceId} aparece con datos incompatibles.`);duplicates++;return;}
    keys.set(sourceId,item);comments.push(item);
  });
  return {comments,unresolved,empty,duplicates,total:records.length};
}
