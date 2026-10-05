import {incomeMode,incomeRowMode} from './JuanIncomeBudget.js';
export function projectOperationalForecast(sheets,associations,links,charges,orders,year){
  for(const sheet of sheets){
    for(const mode of new Set(orders.filter(o=>o.banco_cobro===sheet.bank).map(o=>incomeMode(o.forma_cobro))))if(!sheet.income.some(row=>incomeRowMode(row.label)===mode)){
      const row={id:`income:erp:${mode}`,label:mode==='receipt'?'REMESAS RECIBOS PREVISTAS DE COBRO':mode==='transfer'?'TRANSFERENCIAS PREVISTAS DE COBRO':'OTROS INGRESOS PREVISTAS DE COBRO',day:null,opening:false,values:sheet.columns.map(()=>null)};sheet.income.push(row);associations.push({bank:sheet.bank,row_id:row.id,status:'group',charge_ids:[],evidence:{reason:'Órdenes del ERP'}});
    }
    for(const charge of charges.filter(c=>c.banco_pago===sheet.bank&&!c.id_tarjeta&&!associations.some(a=>a.bank===sheet.bank&&a.charge_ids?.map(String).includes(String(c.id_cargo_recurrente))))){
      if(!charge.vencimientos?.some(d=>sheet.columns.some(c=>c.kind==='forecast'&&c.month===Number(d.fecha.slice(5,7)))))continue;
      const id=`payments:erp:${charge.id_cargo_recurrente}`;
      if(!sheet.payments.some(row=>row.id===id))sheet.payments.push({id,label:charge.programacion?.[0]?.descripcion||charge.nombre_proveedor||charge.nombre_agente||'Cargo previsto',day:Number(charge.programacion?.[0]?.inicio_dia||charge.programacion?.[0]?.dia)||null,opening:false,values:sheet.columns.map(()=>null)});
      associations.push({workbook_id:`juan-${year}`,bank:sheet.bank,row_id:id,status:'matched',provider_id:charge.id_proveedor,employee_id:charge.id_agente,charge_ids:[String(charge.id_cargo_recurrente)],evidence:{reason:'Cargo recurrente del ERP'}});
      for(const column of sheet.columns.filter(c=>c.kind==='forecast'))links.push({cell_key:`${sheet.bank}:${id}:${column.month}`,target_id:String(charge.id_cargo_recurrente),status:'matched'});
    }
  }
}
