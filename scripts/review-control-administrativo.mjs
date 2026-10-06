import env from '@next/env';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {getPgPool} from '../server/database/pgClient.js';
import {lockIncome} from '../server/features/prevision/IncomeReconciliation.js';
import {orderActivity} from '../server/features/comentario/AccountActivity.js';
import {readControlWorkbook,planControlOrderNames,controlDate,controlPayment,cents} from '../server/features/orden/AdministrativeOrderReview.js';
const text=v=>String(v??'').trim(),escape=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
env.loadEnvConfig(process.cwd());
const source=resolve(process.argv[2]),directory=resolve(process.argv[3]),apply=process.argv.includes('--apply'),pool=getPgPool(),db=await pool.connect();
try{
  const {rows,sheet}=readControlWorkbook(await readFile(source));await mkdir(directory,{recursive:true});
  let history=[];try{history=JSON.parse(await readFile(join(directory,'report.json'),'utf8')).renamed||[];}catch{}
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ');await lockIncome(db);
  let orders=(await db.query('SELECT * FROM tesoreria_ordenes ORDER BY id_orden')).rows;
  const invoices=(await db.query('SELECT * FROM administracion_facturas_clientes')).rows,accounts=(await db.query('SELECT id_cuenta,id_edisoft,nombre_empresa FROM comercial_cuentas')).rows;
  const plan=planControlOrderNames(rows,orders,invoices,accounts);
  if(apply&&plan.rename.length){
    const snapshot={orders,plan};
    for(const table of ['tesoreria_recibos_importados','tesoreria_aplicaciones_cobro','tesoreria_movimientos_bancarios','comercial_contratos','general_comentarios','general_eventos'])snapshot[table]=(await db.query('SELECT * FROM '+table)).rows;
    await writeFile(join(directory,'before-renaming-'+Date.now()+'.json'),JSON.stringify(snapshot));
    for(const item of plan.rename){
      // Move references between two identical rows inside one transaction; FK constraints remain valid.
      await db.query(`INSERT INTO tesoreria_ordenes SELECT (jsonb_populate_record(NULL::tesoreria_ordenes,to_jsonb(o)||jsonb_build_object('id_orden',$2::text,'datos_importacion',COALESCE(o.datos_importacion,'{}'::jsonb)||jsonb_build_object('id_orden_anterior',o.id_orden)))).* FROM tesoreria_ordenes o WHERE id_orden=$1`,[item.oldId,item.newId]);
      for(const table of ['tesoreria_recibos_importados','tesoreria_aplicaciones_cobro','tesoreria_movimientos_bancarios'])await db.query('UPDATE '+table+' SET id_orden=$2 WHERE id_orden=$1',[item.oldId,item.newId]);
      await db.query('UPDATE administracion_facturas_clientes SET id_orden_origen=$2 WHERE id_orden_origen=$1',[item.oldId,item.newId]);
      for(const table of ['general_comentarios','general_eventos'])await db.query("UPDATE "+table+" SET id_entidad=$2 WHERE tipo_entidad='orden' AND id_entidad=$1",[item.oldId,item.newId]);
      await db.query(`UPDATE comercial_contratos c SET array_id_ordenes=(SELECT jsonb_agg(CASE WHEN value=to_jsonb($1::text) THEN to_jsonb($2::text) ELSE value END) FROM jsonb_array_elements(c.array_id_ordenes)) WHERE array_id_ordenes @> jsonb_build_array($1::text)`,[item.oldId,item.newId]);
      await db.query('DELETE FROM tesoreria_ordenes WHERE id_orden=$1',[item.oldId]);
      await orderActivity(db,item.newId,'','ha actualizado el identificador '+item.oldId+' a '+item.newId+' según el control administrativo, conservando importes, fechas, recibos y conciliaciones.');
    }
    orders=(await db.query('SELECT * FROM tesoreria_ordenes ORDER BY id_orden')).rows;
  }
  const matched=new Set(),missing=[],ambiguous=[],differences=[],counts={};
  for(const row of rows){
    let candidates=orders.filter(o=>o.id_orden===text(row.ORDEN));
    const byRow=orders.filter(o=>Number(o.datos_importacion?.fila)===row.row&&(text(o.datos_importacion?.original?.ORDEN).replace(/^\./,'')===text(row.ORDEN).replace(/^\./,''))&&(text(o.datos_importacion?.original?.['CODIGO CRM'])===text(row['CODIGO CRM'])||text(accounts.find(a=>a.id_cuenta===o.id_cuenta)?.id_edisoft)===text(row['CODIGO CRM'])));
    if(byRow.length===1)candidates=byRow;
    if(!candidates.length&&/^\.?ANTERIOR|^\.?SIN CONTRATO/.test(text(row.ORDEN)))candidates=orders.filter(o=>/^\.?ANTERIOR|^\.?SIN CONTRATO/.test(o.id_orden)&&text(accounts.find(a=>a.id_cuenta===o.id_cuenta)?.id_edisoft)===text(row['CODIGO CRM'])&&text(invoices.find(f=>f.id_factura_cliente===o.id_factura)?.numero_factura||o.id_factura)===text(row.FACTURA));
    if(candidates.length!==1){(candidates.length?ambiguous:missing).push(row);continue;}
    const order=candidates[0];matched.add(order.id_orden);
    const account=accounts.find(a=>a.id_cuenta===order.id_cuenta),invoice=invoices.find(f=>f.id_factura_cliente===order.id_factura),payment=controlPayment(row['FORMA DE COBRO']);
    const checks=[['Contrato',/^C\d{2}\.\d{3}\.\d{3}$/.test(text(row['CONTRATO ASOCIADO']))?text(row['CONTRATO ASOCIADO']):'',text(order.id_contrato)],
      ['Importe',text(row['IMPORTE CON IVA']),text(order.cobro_total)],['Fecha prevista',controlDate(row['FECHA DE COBRO ORDEN segun factura']),text(order.fecha_teorica_cobro)],
      ['Forma de cobro',payment.forma,text(order.forma_cobro)],['Banco',payment.banco,text(order.banco_cobro)],
      ['Factura',/ANULAD/i.test(text(row.FACTURA))?'':text(row.FACTURA),text(invoice?.numero_factura||order.id_factura)],['Estado',/ANULAD|CANCELAD/i.test(text(row.ESTADO))?'Cancelada':/cobrada/i.test(text(row.ESTADO))?'Cobrada':'Pendiente',order.cancelada?'Cancelada':order.cobrada?'Cobrada':'Pendiente'],
      ['Código cliente',text(row['CODIGO CRM']),text(account?.id_edisoft)]];
    for(const [field,excel,erp]of checks){
      if(field==='Banco'&&!excel)continue;
      if(field==='Importe'?(Number.isFinite(Number(excel))&&cents(excel)===cents(erp)):excel===erp)continue;
      const known=order.cancelada?'Cancelación/abono registrado.':invoice?.datos_importacion?.publicidad_pdf?'Factura revisada con PDF original.':'';
      differences.push({row:row.row,order:order.id_orden,client:text(row.CLIENTE),field,excel,erp,context:known});counts[field]=(counts[field]||0)+1;
    }
  }
  const extras=orders.filter(o=>!matched.has(o.id_orden));
  const duplicated=Object.entries(rows.reduce((map,r)=>{(map[text(r.ORDEN)]??=[]).push(r);return map;},{})).filter(([,values])=>values.length>1);
  const renamed=[...new Map([...history,...(apply?plan.rename:[])].map(item=>[item.oldId,item])).values()];
  const report={source,sheet,excelRows:rows.length,erpOrders:orders.length,applied:apply,renamed,unmatched:plan.unmatched,counts,differences,missing,ambiguous,extras,duplicated};
  await writeFile(join(directory,'report.json'),JSON.stringify(report,null,2));
  const table=(headers,data)=>`<div class="scroll"><table><thead><tr>${headers.map(h=>'<th>'+escape(h)+'</th>').join('')}</tr></thead><tbody>${data.map(row=>'<tr>'+row.map(v=>'<td>'+escape(v)+'</td>').join('')+'</tr>').join('')}</tbody></table></div>`;
  const html=`<!doctype html><html lang="es"><meta charset="utf-8"><title>Revisión del control administrativo</title><style>body{font:15px system-ui;color:#172554;background:#f3f4f6;margin:30px}section{background:white;padding:22px;margin:20px 0;border-radius:12px}h1,h2{margin-top:0}.scroll{overflow:auto}table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:9px;text-align:left;border-bottom:1px solid #e5e7eb;vertical-align:top}th{background:#172554;color:white}code{font-size:12px}p{line-height:1.5}</style><h1>Control administrativo · revisión del 6 de octubre de 2026</h1><p>${rows.length} filas del Excel · ${orders.length} órdenes ERP · ${renamed.length} identificadores actualizados. Las diferencias se han analizado sin sobrescribir importes, fechas ni cobros.</p>
  <section><h2>Identificadores actualizados</h2>${table(['Anterior','Actual','Factura','Cliente'],renamed.map(r=>[r.oldId,r.newId,r.invoice,r.client]))}</section>
  <section><h2>Identificadores sin actualizar (${plan.unmatched.length})</h2>${table(['Identificador','Factura','Cliente','Importe','Referencia Excel','Motivo'],plan.unmatched.map(r=>[r.oldId,r.invoice,r.client,r.amount,r.candidate,r.reason]))}</section>
  <section><h2>Diferencias por campo</h2><p>Las cifras cuentan discrepancias de campos, no órdenes distintas. Las revisiones de PDF, abonos y conciliaciones explican parte de las diferencias; no deben revertirse sin revisar.</p>${table(['Campo','Diferencias'],Object.entries(counts))}</section>
  <section><h2>Diferencias detalladas (${differences.length})</h2>${table(['Fila Excel','Orden','Cliente','Campo','Excel','ERP','Contexto'],differences.map(r=>[r.row,r.order,r.client,r.field,r.excel,r.erp,r.context]))}</section>
  <section><h2>Filas del Excel sin orden identificada (${missing.length})</h2>${table(['Fila','Orden','Cliente','Factura','Importe'],missing.map(r=>[r.row,r.ORDEN,r.CLIENTE,r.FACTURA,r['IMPORTE CON IVA']]))}</section>
  <section><h2>Órdenes ERP sin fila identificada (${extras.length})</h2>${table(['Orden','Factura','Contrato','Importe','Cancelada'],extras.map(o=>[o.id_orden,invoices.find(f=>f.id_factura_cliente===o.id_factura)?.numero_factura||o.id_factura,o.id_contrato,o.cobro_total,o.cancelada?'Sí':'No']))}</section>
  <section><h2>Referencias repetidas en el Excel (${duplicated.length})</h2>${table(['Referencia','Filas','Clientes'],duplicated.map(([id,rs])=>[id,rs.map(r=>r.row).join(', '),[...new Set(rs.map(r=>r.CLIENTE))].join(', ')]))}</section></html>`;
  await writeFile(join(directory,'revision-control-administrativo.html'),html);
  if(apply)await db.query('COMMIT');else await db.query('ROLLBACK');
  console.log(JSON.stringify({excelRows:rows.length,erpOrders:orders.length,renamed:apply?plan.rename.length:0,ready:plan.rename.length,unmatched:plan.unmatched.length,counts,missing:missing.length,extras:extras.length,duplicates:duplicated.length,report:join(directory,'revision-control-administrativo.html')}));
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
