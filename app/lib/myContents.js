import {productionStage} from './productionWorkflow.js';
import {contentPending} from './productionManagement.js';
import {normalizeProductionDeadline} from './productionContentFields.js';
import {calendarToday} from './myTaskCalendar.js';
const clean=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
export function contentAttentionReason(row,today=calendarToday()) {
 if(!contentPending(row))return '';
 const state=clean([row.estado_contenido,row.estado_material_contenido].join(' '));
 if(/invalido|incidencia|requiere atencion|rechazad|bloquead/.test(state)||(row.materiales||[]).some(material=>material.material_valido===false||/incidencia|rechazad/.test(clean(material.validacion_produccion))))return 'Incidencia pendiente de resolver';
 try {const date=normalizeProductionDeadline(row.deadline_contenido);if(date&&date.split('/').reverse().join('-')<today)return 'Fecha límite vencida';} catch { /* Fechas históricas incompletas no se interpretan como vencimientos. */ }
 return '';
}
export function matchesMyContentTab(row,tab) {
 if(!contentPending(row))return false;
 if(tab==='atencion')return Boolean(row.motivo_atencion||contentAttentionReason(row));
 const stage=row.fase||productionStage(row);
 return tab==='pendiente'?stage==='recibir':stage!==''&&stage!=='recibir';
}
