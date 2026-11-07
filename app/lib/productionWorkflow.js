import {contentPending,contentProductionState,contentTypes,materialType} from './productionManagement.js';
const clean = value => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export const productionStages = [
  {value:'recibir',label:'Fase 1',title:'Contratado pendiente de recibir'},
  {value:'redaccion',label:'Fase 2',title:'Pendiente redacción'},
  {value:'maquetacion',label:'Fase 3',title:'Pendiente de gestionar Charly'},
  {value:'correccion',label:'Fase 4',title:'Pendiente corrección'},
  {value:'revision',label:'Fase 5',title:'Pendiente revisión cliente'},
  {value:'publicacion',label:'Fase 6',title:'Material OK - pendiente de publicar'},
  {value:'todo',label:'Todo',title:'Todo'},
];
export const versionLabel = number => `V${String(number).padStart(2,'0')}`;
export function productionPhaseName(row){const stage=productionStages.find(item=>item.value===productionStage(row));const sub=productionSubstage(row);return stage?`${stage.label} · ${stage.title}${sub==='3.1'?' · Contenido no descargado':sub==='3.2'?' · Pendiente enviar corrección':stage.value==='correccion'?` · Corrección ${sub==='gm'?'GM':'otros'}`:''}`:'Sin estado';}
export function productionStage(row) {
  if (!contentPending(row)) return '';
  const state=clean(normalizeProductionState(contentProductionState(row)));
  if(!state.trim())return '';
  if (/^material\s+ok\b/.test(state.trim())) return 'publicacion';
  if (/invalido|pendiente.*recibir|contratado pendiente|no pedido|pedido,/.test(state)) return 'recibir';
  if(row.tipo==='anuncios')return 'maquetacion';
  if (/redaccion/.test(state)) return 'redaccion';
  if (/corregido|revision/.test(state)) return 'revision';
  if (/correccion/.test(state)) return 'correccion';
  if (/charly|maquetacion|pasar produccion/.test(state)) return 'maquetacion';
  if (/pendiente.*recibir|no recibid|no aportad/.test(clean(row.estado_material_contenido))) return 'recibir';
  if ((row.materiales || []).some(m=>m.es_version_acabada)) return 'revision';
  const received=(row.materiales || []).length || /recibido|ok|maquet/.test(clean(row.tipo==='articulos'?row.articulo_hoja:row.anuncio_hoja));
  if (!received && row.id_contrato) return 'recibir';
  return row.tipo==='articulos'?'redaccion':'maquetacion';
}
export function normalizeProductionState(value){
 const state=clean(value).trim();
 if(/^(anulado|no sale|no se publica|cancelad[oa])$/.test(state))return 'Anulado';
 if(/^(pendiente publicar|pendiente de publicar|no publicado|pte\. publicar gratis)$/.test(state))return 'Material OK - pendiente de publicar';
 if(/^publicado(?: gratis)?$/.test(state))return 'Publicado';
 if(/^(no pedido|pedido, envia viernes|pendiente de recibir materiales)$/.test(state))return productionStages[0].title;
 if(/^(maquetacion|pendiente maquetacion|pasado a paco|pasado a carlos|pendiente pasar produccion)$/.test(state))return productionStages[2].title;
 if(/^(corregido|pendiente revision)$/.test(state))return productionStages[4].title;
 if(/^(a escoger|sin estado)$/.test(state))return '';
 return String(value||'').trim();
}
export function materialNeedsDownload(row){return !row.eliminado_at&&!row.es_version_acabada&&row.material_valido!==false&&!row.descargado_produccion;}
export function productionSubstage(row){
 const stage=productionStage(row);
 if(stage==='correccion')return row.correccion_destino==='gm'?'gm':'otros';
 if(stage!=='maquetacion')return '';
 if(row.tipo==='anuncios')return '3.1';
 const files=(row.materiales||[]).filter(m=>!m.eliminado_at&&!m.es_version_acabada&&m.material_valido!==false);
 const text=Boolean(row.titulo_articulo||row.entradilla_articulo||row.texto_articulo);
 return files.some(materialNeedsDownload)||(text&&Number(row.texto_revision_descargada)<Number(row.texto_revision))||(!files.length&&!text)?'3.1':'3.2';
}
export function productionStatesByType(content){return Object.fromEntries(contentTypes(content).map(type=>{const key=materialType(type);let state=normalizeProductionState(contentProductionState({...content,tipo:key}));if(key==='anuncios'&&/redacci[oó]n|correcci[oó]n|revisi[oó]n/i.test(state))state='Pendiente de gestionar Charly';return [key,state];}));}
export function aggregateProductionState(states){
 const entries=Object.entries(states),pending=entries.filter(([tipo,estado_contenido])=>contentPending({tipo,estado_contenido}));
 if(!pending.length)return entries.some(([,value])=>value==='Publicado')?'Publicado':'Anulado';
 if(pending.some(([,value])=>/inv[aá]lido/i.test(value)))return 'Material inválido';
 const stages=pending.map(([tipo,estado_contenido])=>productionStages.findIndex(stage=>stage.value===productionStage({tipo,estado_contenido}))).filter(index=>index>=0).sort((a,b)=>a-b);
 return stages.length?productionStages[stages[0]].title:'';
}
export function contentDisplayName(row){
 const title=row.titulo_articulo||row.nombre_contenido||row.especificaciones_contenido||row.id_contenido;
 return String(title).replace(/^(?:(?:VIDRIO|VENTANAS)\s+(?:ESPAÑA|ESPANA|LATAM|IBERIA)|QQ\s+(?:VIDRIO|VENTANAS)|QUI[EÉ]N\s+ES\s+QUI[EÉ]N\s*(?:DE(?:L)?\s+)?(?:VIDRIO|VENTANAS)?|HUECO(?:\s+ARQUITECTURA)?)\s*(?:N[º°O]?\s*)?\d+\s*[-·:|]?\s*/i,'').trim()||row.especificaciones_contenido||row.id_contenido;
}
