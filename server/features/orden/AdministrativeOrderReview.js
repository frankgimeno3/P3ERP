import * as XLSX from 'xlsx/xlsx.mjs';
import {parseImportDate,parseImportAmount} from '../prevision/ReceiptExcel.js';
const text=value=>String(value??'').trim();
const code=value=>text(value).replace(/^0+/,'');
export const cents=value=>Math.round(Number(value||0)*100);
export function readControlWorkbook(bytes){
  const wb=XLSX.read(bytes,{type:'buffer'});
  const sheet=wb.SheetNames.find(name=>text(name).toUpperCase().startsWith('COBROS'));
  if(!sheet)throw Error('No hay hoja COBROS y CONTRATOS.');
  const matrix=XLSX.utils.sheet_to_json(wb.Sheets[sheet],{header:1,defval:'',blankrows:true});
  const headers=matrix[0].map(text);
  return {sheet,rows:matrix.slice(1).map((cells,i)=>({row:i+2,...Object.fromEntries(headers.map((h,j)=>[h,cells[j]]))})).filter(row=>text(row.ORDEN))};
}
export function controlDate(value){if(!text(value)||text(value)==='-')return '';try{return parseImportDate(value);}catch{return 'FECHA NO VÁLIDA: '+text(value);}}
export function controlPayment(value){
  const upper=text(value).toUpperCase();
  const forma=/RECIBO/.test(upper)?'recibo':/TRANSF/.test(upper)?'transferencia':/FACTO/.test(upper)?'factoring':/INTERCAMB/.test(upper)?'intercambio':text(value).toLowerCase();
  const banco=/SAB/.test(upper)?'Sabadell':/SAN/.test(upper)?'Santander':'';
  return {forma,banco};
}
export function planControlOrderNames(rows,orders,invoices,accounts){
  const rename=[],unmatched=[];
  for(const order of orders.filter(o=>/^ord_(rec|fac_reg)_/.test(o.id_orden))){
    const invoice=invoices.find(f=>f.id_factura_cliente===order.id_factura),account=accounts.find(a=>a.id_cuenta===order.id_cuenta);
    const candidates=rows.filter(row=>text(row.FACTURA)===text(invoice?.numero_factura||order.id_factura)&&(!account||code(row['CODIGO CRM'])===code(account.id_edisoft)));
    const exact=candidates.filter(row=>{
      const ordinal=text(row.ORDEN).match(/-(\d+)\/\d+$/)?.[1];
      return cents(parseImportAmount(row['IMPORTE CON IVA']))===cents(order.cobro_total)&&(!ordinal||Number(ordinal)===Number(order.numero_cobro||1));
    });
    const chosen=exact.length===1?exact[0]:null;
    const reason=!candidates.length?'Sin fila para esta factura y cliente en el Excel.':!chosen?'El importe corresponde a un saldo o vencimiento no desglosado en el Excel.':orders.some(o=>o.id_orden===text(chosen.ORDEN))?'El identificador ya está ocupado por otra orden.':!/^C\d{2}\.\d{3}\.\d{3}-\d+\/\d+$/.test(text(chosen.ORDEN))?'La referencia del Excel no es un identificador único de orden.':'';
    const item={oldId:order.id_orden,invoice:invoice?.numero_factura||order.id_factura,client:account?.nombre_empresa||'',amount:Number(order.cobro_total),candidate:chosen?.ORDEN||candidates.map(r=>r.ORDEN).join(', '),row:chosen?.row,reason};
    if(reason)unmatched.push(item);else rename.push({...item,newId:text(chosen.ORDEN)});
  }
  const targets=new Set();for(const item of rename){if(targets.has(item.newId))throw Error('Varias órdenes pretenden usar '+item.newId);targets.add(item.newId);}
  return {rename,unmatched};
}
