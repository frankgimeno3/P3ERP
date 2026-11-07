import {contentPending} from './productionManagement.js';
export const sheetHasContract = row => Boolean(String(row.contrato || '').trim()) && !/^(?:-|0|null|undefined|no aplica|sin contrato)$/i.test(String(row.contrato).trim());
export const sheetPending = row => contentPending({estado:row.estado});
export function filterSheetVisibility(rows,{outside=false,published=false}={}) {
  return rows.filter(row=>(outside||sheetHasContract(row))&&(published||sheetPending(row)));
}
