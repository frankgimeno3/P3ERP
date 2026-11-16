import {contentLayoutDefaults,layoutFormatMatches,layoutKey} from './magazineLayout.js';
import {contentPending} from './productionManagement.js';
import {productionStage} from './productionWorkflow.js';
export const charlyReservedPages = {4:'Índice',6:'Sumario'};
export function buildCharlyPlanning(contents,support,entries=[]) {
 const rows=contents.filter(row=>contentPending(row)&&layoutFormatMatches(row,support)).map(row=>{
  const saved=productionStage(row)==='publicacion'?entries.find(entry=>layoutKey(entry)===layoutKey(row)):null;
  const draft=saved||contentLayoutDefaults(row);
  return {...row,planning:{...draft},provisional:!saved&&(draft.posicion===''||!draft.seccion)};
 });
 rows.sort((a,b)=>{
  const position=row=>row.planning.posicion===''?Infinity:Number(row.planning.posicion);
  return position(a)-position(b)||String(a.nombre_empresa||a.cliente_hoja||'').localeCompare(String(b.nombre_empresa||b.cliente_hoja||''),'es')||String(a.id_contenido).localeCompare(String(b.id_contenido));
 });
 const occupied=new Set([4,6]);
 for(const row of rows)if(row.planning.posicion!=='')for(let i=0;i<(Number(row.planning.paginas)||1);i++)occupied.add(Number(row.planning.posicion)+i);
 for(const row of rows){
  if(row.planning.posicion===''){
   let page=1;const count=Number(row.planning.paginas)||1;
   while(Array.from({length:count},(_,i)=>occupied.has(page+i)).some(Boolean))page++;
   row.planning.posicion=page;for(let i=0;i<count;i++)occupied.add(page+i);
  }
  row.planning.seccion||=row.tipo==='articulos'?'Actualidad':'Publicidad';
  row.planning.paginas||=1;
 }
 return rows;
}
