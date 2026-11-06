import {contentPending} from './productionManagement.js';
const clean = value => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export const productionStages = [
  {value:'recibir',label:'0 · Contratado pendiente de recibir'},
  {value:'redaccion',label:'1 · Pendiente redacción'},
  {value:'maquetacion',label:'2 · Pendiente maquetación'},
  {value:'correccion',label:'3 · Pendiente corrección'},
  {value:'revision',label:'4 · Pendiente revisión'},
  {value:'todo',label:'5 · Todo'},
];
export const versionLabel = number => `V${String(number).padStart(2,'0')}`;
export function productionStage(row) {
  if (!contentPending(row)) return '';
  const state=clean(row.estado_contenido || row.estado);
  if (/pendiente.*recibir|contratado pendiente|no pedido|pedido,/.test(state)) return 'recibir';
  if (/redaccion/.test(state)) return 'redaccion';
  if (/corregido|revision/.test(state)) return 'revision';
  if (/correccion/.test(state)) return 'correccion';
  if (/maquetacion|pasar produccion/.test(state)) return 'maquetacion';
  if ((row.materiales || []).some(m=>m.es_version_acabada)) return 'revision';
  const received=(row.materiales || []).length || /recibido|ok|maquet/.test(clean(row.tipo==='articulos'?row.articulo_hoja:row.anuncio_hoja));
  if (!received && row.id_contrato) return 'recibir';
  return row.tipo==='articulos'?'redaccion':'maquetacion';
}
