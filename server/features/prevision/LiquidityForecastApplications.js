import {incomeRowMode} from './JuanIncomeBudget.js';
// Derive realization from ordinary ERP reconciliation; no view-specific action.
export function projectLiquidityApplications(sheets,associations,lines,manual,year) {
 const result=[...manual],already=new Set(manual.map(a=>a.id_linea_banco));
 for(const line of lines){
 if(!line.estado_revision||line.duplicado_descartado||already.has(line.id_linea_banco))continue;
 const date=line.fecha_operativa||line.fecha_valor,parts=String(date||'').split('/'),month=Number(parts[1]);
 if(Number(parts[2])!==year||(year===2026&&month<10))continue;
 const sheet=sheets.find(s=>s.bank===line.banco);if(!sheet)continue;
 const section=Number(line.importe)>0?'income':'payments';let candidates=[];
 if(section==='income'){
 const mode=line.tipo_ingreso==='remesa'?'receipt':line.tipo_ingreso==='transferencia'?'transfer':null;
 if(mode)candidates=sheet.income.filter(r=>incomeRowMode(r.label)===mode);
 }else if(/TARJET|VISAS?/i.test(line.concepto))candidates=sheet.payments.filter(r=>r.cardPart==='variable');
 else if(/REINTEGRO.*ATM/i.test(line.concepto))candidates=sheet.payments.filter(r=>/^(EFECTIVO|DISPOSICIONES EN EFECTIVO)$/i.test(r.label));
 else {
 const linked=associations.filter(a=>a.bank===line.banco&&(line.id_cargo_recurrente?a.charge_ids?.map(String).includes(String(line.id_cargo_recurrente)):line.id_proveedor&&a.provider_id===line.id_proveedor));
 candidates=sheet.payments.filter(r=>linked.some(a=>a.row_id===r.id));
 }
 if(candidates.length!==1)continue;
 const row=candidates[0];result.push({workbook_id:`juan-${year}`,cell_key:`${sheet.bank}:${row.id}:${month}`,id_linea_banco:line.id_linea_banco,importe:Math.abs(Number(line.importe)),banco:line.banco,bank_amount:line.importe,concepto:line.concepto,estado_revision:true,duplicado_descartado:false,date,derived:true});
 }
 return result;
}
