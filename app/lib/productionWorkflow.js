import {contentPending} from './productionManagement.js';
const clean = value => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export const productionStages = [
  {value:'recibir',label:'Fase 1',title:'Contratado pendiente de recibir'},
  {value:'redaccion',label:'Fase 2',title:'Pendiente redacción'},
  {value:'maquetacion',label:'Fase 3',title:'Pendiente maquetación'},
  {value:'correccion',label:'Fase 4',title:'Pendiente corrección'},
  {value:'revision',label:'Fase 5',title:'Pendiente revisión cliente'},
  {value:'publicacion',label:'Fase 6',title:'Material OK - pendiente de publicar'},
  {value:'todo',label:'Todo',title:'Todo'},
];
export const versionLabel = number => `V${String(number).padStart(2,'0')}`;
export function productionPhaseName(row){const stage=productionStages.find(item=>item.value===productionStage(row));return stage?`${stage.label} · ${stage.title}`:'';}
export function productionStage(row) {
  if (!contentPending(row)) return '';
  const state=clean(row.estado_contenido || row.estado);
  if (/^material\s+ok\b/.test(state.trim())) return 'publicacion';
  if (/pendiente.*recibir|contratado pendiente|no pedido|pedido,/.test(state)) return 'recibir';
  if (/redaccion/.test(state)) return 'redaccion';
  if (/corregido|revision/.test(state)) return 'revision';
  if (/correccion/.test(state)) return 'correccion';
  if (/maquetacion|pasar produccion/.test(state)) return 'maquetacion';
  if (/pendiente.*recibir|no recibid|no aportad/.test(clean(row.estado_material_contenido))) return 'recibir';
  if ((row.materiales || []).some(m=>m.es_version_acabada)) return 'revision';
  const received=(row.materiales || []).length || /recibido|ok|maquet/.test(clean(row.tipo==='articulos'?row.articulo_hoja:row.anuncio_hoja));
  if (!received && row.id_contrato) return 'recibir';
  return row.tipo==='articulos'?'redaccion':'maquetacion';
}
