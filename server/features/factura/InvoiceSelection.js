import {randomUUID} from 'node:crypto';
import {getPgPool} from '../../database/pgClient.js';
import {lockIncome,ensureOrderReceipt,syncInvoiceCollection} from '../prevision/IncomeReconciliation.js';
import {parseImportDate} from '../prevision/ReceiptExcel.js';
import {testIdentifier,isTestIdentifier} from '../identifiers/TestMode.js';
import {accountActivity} from '../comentario/AccountActivity.js';
import {calculateInvoicePricing} from '../../../app/config/invoicePricing.js';
import {paymentMethod,invoicePayment} from '../../../app/config/invoicePayments.js';
import {replaceOperationalIdentifiers} from '../identifiers/IdentifierNormalization.js';
const id=prefix=>prefix+'_'+randomUUID().slice(0,prefix==='tmp'?36:12),cents=value=>Math.round(Number(value||0)*100);
const chronological=value=>{if(!value)return Infinity;const [day,month,year]=parseImportDate(value).split('/').map(Number);return Date.UTC(year,month-1,day);};

export async function invoiceSourcePreview(source,sourceId){
 const db=getPgPool();
 const contractId=source==='contrato'?sourceId:(await db.query('SELECT id_contrato FROM tesoreria_ordenes WHERE id_orden=$1',[sourceId])).rows[0]?.id_contrato;
 const contract=contractId?(await db.query('SELECT * FROM comercial_contratos WHERE id_contrato=$1',[contractId])).rows[0]:null;
 const orders=(await db.query(`SELECT o.*,f.numero_factura FROM tesoreria_ordenes o LEFT JOIN administracion_facturas_clientes f ON f.id_factura_cliente=o.id_factura
  WHERE ${source==='contrato'?'o.id_contrato':'o.id_orden'}=$1 AND NOT o.cancelada ORDER BY to_date(NULLIF(o.fecha_teorica_cobro,''),'DD/MM/YYYY'),o.numero_cobro`,[sourceId])).rows;
 if(!orders.length)throw Error('No hay órdenes disponibles en este origen.');
 const account=(await db.query('SELECT * FROM comercial_cuentas WHERE id_cuenta=$1',[contract?.id_cuenta_contrato||orders[0].id_cuenta])).rows[0];
 return {source,contract,orders,account};
}

export async function createSelectedInvoiceDraft(contractId,orderIds,actorId,source='contrato'){
 if(!['contrato','orden'].includes(source)||source==='contrato'&&!contractId)throw Error('Selecciona el contrato de origen.');
 if(source==='orden'&&orderIds?.length!==1)throw Error('Una factura desde orden requiere exactamente una orden de origen.');
 if(!Array.isArray(orderIds)||!orderIds.length||new Set(orderIds).size!==orderIds.length)throw Error('Selecciona las órdenes que vas a facturar.');
 const db=await getPgPool().connect();
 try{await db.query('BEGIN');await lockIncome(db);
  const orders=(await db.query('SELECT * FROM tesoreria_ordenes WHERE id_orden=ANY($1::text[]) FOR UPDATE',[orderIds])).rows;
  if(orders.length!==orderIds.length||orders.some(o=>o.cancelada||o.id_factura||contractId&&o.id_contrato!==contractId))throw Error('Alguna orden ya está facturada o no pertenece al contrato.');
  if((await db.query('SELECT 1 FROM administracion_facturas_clientes WHERE id_orden_origen=ANY($1::text[]) LIMIT 1',[orderIds])).rowCount)throw Error('Alguna orden ya figura como origen de otra factura.');
  const accountId=orders[0].id_cuenta||(await db.query('SELECT id_cuenta_contrato FROM comercial_contratos WHERE id_contrato=$1',[orders[0].id_contrato])).rows[0]?.id_cuenta_contrato;
  const contract=contractId?(await db.query('SELECT * FROM comercial_contratos WHERE id_contrato=$1 FOR UPDATE',[contractId])).rows[0]:null;
  if(contractId&&(await db.query(`SELECT 1 FROM administracion_facturas_clientes f WHERE f.id_contrato=$1 AND NOT COALESCE((f.datos_importacion->>'facturacion_por_ordenes')::boolean,false)
    AND f.importe_total>COALESCE((SELECT sum(o.cobro_total) FROM tesoreria_ordenes o WHERE o.id_factura=f.id_factura_cliente AND NOT o.cancelada),0)+0.01 LIMIT 1`,[contractId])).rowCount)throw Error('El contrato tiene una factura anterior cuyo importe no cuadra con sus órdenes asociadas. Revisa sus vínculos antes de crear otra factura.');
  if(orders.some(o=>o.id_cuenta&&o.id_cuenta!==accountId))throw Error('Las órdenes deben pertenecer a la misma cuenta.');
  const account=(await db.query('SELECT * FROM comercial_cuentas WHERE id_cuenta=$1',[accountId])).rows[0];if(!account)throw Error('Falta la cuenta de las órdenes.');
  const invoiceId=testIdentifier(id('fac'),contract?.es_prueba||orders[0].es_prueba||isTestIdentifier(orders[0].id_orden));
  const base=orders.reduce((s,o)=>s+cents(o.base_imponible??o.cobro_total),0)/100,total=orders.reduce((s,o)=>s+cents(o.cobro_total),0)/100;
  const fiscal={nombre_fiscal:account.nombre_fiscal||account.nombre_empresa,vat_code:account.vat_code||'',pais:account.pais_facturacion||account.pais_cuenta||'',direccion:account.direccion_facturacion||'',poblacion:account.poblacion_facturacion||'',cp:account.cp_facturacion||'',email:account.mail_contabilidad||''};
  const methods=[...new Set(orders.map(order=>paymentMethod(order.forma_cobro)))];
  await db.query(`INSERT INTO administracion_facturas_clientes(id_factura_cliente,id_contrato,id_orden_origen,id_cuenta,base_imponible,importe_total,estado,datos_fiscales,datos_importacion,moneda,forma_cobro)
   VALUES($1,$2,$3,$4,$5,$6,'en proceso',$7::jsonb,$8::jsonb,$9,$10)`,[invoiceId,contractId||orders[0].id_contrato||null,source==='orden'?orders[0].id_orden:null,accountId,base,total,JSON.stringify(fiscal),JSON.stringify({facturacion_por_ordenes:true,ordenes_origen:orderIds,ajustes_importe:{modo_precio:'calculado'}}),contract?.moneda||'EUR',methods.length===1?methods[0]:'mixto']);
  const services=contractId?(await db.query('SELECT * FROM comercial_contratos_lineas WHERE id_contrato=$1 ORDER BY numero_linea_contrato',[contractId])).rows:[];
  const ratio=services.length&&Number(contract?.importe_total_bi_contrato)?base/Number(contract.importe_total_bi_contrato):1;
  const rows=services.length?services:[{producto:source==='orden'?'Orden '+orders[0].id_orden:'Servicios del contrato '+contractId,unidades:1,precio_unitario:base}];
  const plan=rows.map(l=>({id_linea_contrato:l.id_linea_contrato||null,concepto:l.producto||l.medio||'',descripcion:[l.descripcion_linea,l.especificaciones_linea].filter(Boolean).join('\n'),cantidad:Number(l.unidades)||1,precio_unitario:Number(l.precio_unitario??l.precio_producto??0)*ratio,descuento:Number(l.descuento_producto||0)*(l.tipo_descuento_producto==='importe'?ratio:1),tipo_descuento:l.tipo_descuento_producto||'porcentaje',modo_precio:l.modo_precio||'calculado',precio_total_personalizado:l.precio_total_personalizado==null?null:Number(l.precio_total_personalizado)*ratio,iva_porcentaje:base?Math.round((total/base-1)*10000)/100:0}));
  const discountType=contract?.propuesta_snapshot?.tipo_descuento_final||'porcentaje';
  const adjustments={modo_precio:'calculado',descuento:Number(contract?.descuento_final_contrato||0)*(discountType==='importe'?ratio:1),tipo_descuento:discountType};
  let calculated=calculateInvoicePricing(plan,adjustments);
  if(cents(calculated.base_imponible)!==cents(base)){adjustments.modo_precio='personalizado';adjustments.base_personalizada=base;calculated=calculateInvoicePricing(plan,adjustments);}
  const rounding=(cents(total)-cents(calculated.importe_total))/100;
  if(Math.abs(rounding)>0.02)throw Error('Revisa la base y el IVA de las ordenes: no coinciden con el total de origen.');
  if(rounding){adjustments.redondeo=rounding;adjustments.redondeo_automatico=true;calculated=calculateInvoicePricing(plan,adjustments);}
  await db.query(`UPDATE administracion_facturas_clientes SET datos_importacion=datos_importacion||jsonb_build_object('ajustes_importe',$2::jsonb) WHERE id_factura_cliente=$1`,[invoiceId,JSON.stringify(adjustments)]);
  for(let i=0;i<calculated.lineas.length;i++){const l=calculated.lineas[i];
   await db.query(`INSERT INTO administracion_lineas_factura(id_linea_factura,id_factura_cliente,id_linea_contrato,posicion,concepto,descripcion,cantidad,precio_unitario,descuento,tipo_descuento,base_imponible,iva_porcentaje,importe_total,modo_precio,precio_total_personalizado)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,[id('lfac'),invoiceId,l.id_linea_contrato,i+1,l.concepto,l.descripcion,l.cantidad,l.precio_unitario,l.descuento,l.tipo_descuento,l.base_imponible,l.iva_porcentaje,l.importe_total,l.modo_precio,l.precio_total_personalizado]);
  }
  await db.query('UPDATE tesoreria_ordenes SET id_factura=$1,updated_at=now() WHERE id_orden=ANY($2::text[])',[invoiceId,orderIds]);
  await syncSelectedInvoiceReceipts(db,invoiceId,actorId);
  if(contractId&&!contract.id_factura)await db.query('UPDATE comercial_contratos SET id_factura=$2 WHERE id_contrato=$1',[contractId,invoiceId]);
  await accountActivity(db,accountId,actorId,'ha creado la factura '+invoiceId+' únicamente para las órdenes '+orderIds.join(', ')+'.');
  await db.query('COMMIT');return invoiceId;
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}

export async function syncSelectedInvoiceReceipts(db,invoiceId,actorId){
 const invoice=(await db.query('SELECT * FROM administracion_facturas_clientes WHERE id_factura_cliente=$1',[invoiceId])).rows[0];
 const orders=(await db.query('SELECT id_orden FROM tesoreria_ordenes WHERE id_factura=$1 AND NOT cancelada',[invoiceId])).rows;
 for(const order of orders){const receipt=(await db.query('SELECT numero_factura FROM tesoreria_recibos_importados WHERE id_orden=$1',[order.id_orden])).rows[0];
  // A draft's opaque ID must never replace a number read from an actual receipt.
  if(!invoice.numero_factura&&receipt?.numero_factura&&!/^(?:PRUEBA-)?fac_/.test(receipt.numero_factura))continue;
  await ensureOrderReceipt(db,order.id_orden,actorId);
 }
 await syncInvoiceCollection(db,[invoiceId]);
}

export async function renumberContractOrders(db,contractId){
 if(!/^(?:PRUEBA-)?C\d{2}\.\d{3}\.\d{3}$/.test(contractId))throw Error('Normaliza el código del contrato antes de redistribuir sus órdenes.');
 const rows=(await db.query(`SELECT * FROM tesoreria_ordenes WHERE id_contrato=$1 ORDER BY numero_cobro,id_orden FOR UPDATE`,[contractId])).rows;
 const dates=new Map(rows.map(row=>[row.id_orden,chronological(row.fecha_teorica_cobro)]));
 rows.sort((a,b)=>(dates.get(a.id_orden)-dates.get(b.id_orden))||Number(a.numero_cobro)-Number(b.numero_cobro)||a.id_orden.localeCompare(b.id_orden));
 const changes=rows.map((o,i)=>({row:o,old:o.id_orden,next:contractId+'-'+(i+1)+'/'+rows.length,tmp:testIdentifier(id('tmp'),o.es_prueba||isTestIdentifier(o.id_orden)),number:i+1})).filter(o=>o.old!==o.next||Number(o.row.numero_cobro)!==o.number);
 const maximum=Number((await db.query('SELECT COALESCE(MAX(numero_cobro),0) n FROM comercial_contratos_cobros WHERE id_contrato=$1',[contractId])).rows[0].n);
 for(let i=0;i<rows.length;i++)if(rows[i].id_cobro_contrato)await db.query('UPDATE comercial_contratos_cobros SET numero_cobro=$2 WHERE id_cobro_contrato=$1',[rows[i].id_cobro_contrato,maximum+i+1]);
 for(const o of changes){
  await db.query('UPDATE tesoreria_ordenes SET id_orden=$2 WHERE id_orden=$1',[o.old,o.tmp]);
  await db.query('UPDATE administracion_facturas_clientes SET id_orden_origen=$2 WHERE id_orden_origen=$1',[o.old,o.tmp]);
  await db.query("UPDATE general_identificadores_alias SET id_actual=$2 WHERE entidad='orden' AND id_actual=$1",[o.old,o.tmp]);
 }
 for(const o of changes){
  await db.query('UPDATE tesoreria_ordenes SET id_orden=$2,numero_cobro=$3,etiqueta_cobro=$4,updated_at=now() WHERE id_orden=$1',[o.tmp,o.next,o.number,'Cobro '+o.number]);
  await db.query('UPDATE administracion_facturas_clientes SET id_orden_origen=$2 WHERE id_orden_origen=$1',[o.tmp,o.next]);
  await db.query("UPDATE general_identificadores_alias SET id_actual=$2 WHERE entidad='orden' AND id_actual=$1",[o.tmp,o.next]);
  if(o.row.id_cobro_contrato)await db.query('UPDATE comercial_contratos_cobros SET numero_cobro=$2 WHERE id_cobro_contrato=$1',[o.row.id_cobro_contrato,o.number]);
 }
 for(let i=0;i<rows.length;i++)if(rows[i].id_cobro_contrato)await db.query('UPDATE comercial_contratos_cobros SET numero_cobro=$2 WHERE id_cobro_contrato=$1',[rows[i].id_cobro_contrato,i+1]);
 const mapping=new Map(changes.map(o=>[o.old,o.next]));
 const invoices=(await db.query('SELECT id_factura_cliente,datos_importacion FROM administracion_facturas_clientes WHERE id_contrato=$1',[contractId])).rows;
 for(const invoice of invoices){const next=replaceOperationalIdentifiers(invoice.datos_importacion,mapping);if(JSON.stringify(next)!==JSON.stringify(invoice.datos_importacion))await db.query('UPDATE administracion_facturas_clientes SET datos_importacion=$2::jsonb WHERE id_factura_cliente=$1',[invoice.id_factura_cliente,JSON.stringify(next)]);}
 await db.query('UPDATE comercial_contratos SET array_id_ordenes=$2::jsonb,updated_at=now() WHERE id_contrato=$1',[contractId,JSON.stringify(rows.map((_,i)=>contractId+'-'+(i+1)+'/'+rows.length))]);
 return changes;
}

export async function replaceInvoiceOrders(db,invoice,payments,actorId){
 if(!Array.isArray(payments)||!payments.length)throw Error('Añade al menos un cobro a la factura.');
 const current=(await db.query('SELECT * FROM tesoreria_ordenes WHERE id_factura=$1 ORDER BY numero_cobro FOR UPDATE',[invoice.id_factura_cliente])).rows;
 const values=payments.map(p=>({fecha:parseImportDate(p.fecha_cobro||''),importe:Number(p.importe_cobro),forma_cobro:String(p.forma_cobro||'').toLowerCase(),banco_cobro:String(p.banco_cobro||'')}));
 if(values.some(v=>!/^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/.test(v.fecha)||!Number.isFinite(v.importe)||v.importe<0||v.importe===0&&Number(invoice.importe_total)!==0||!['transferencia','recibo','paypal'].includes(v.forma_cobro)||!['Sabadell','Santander','PayPal'].includes(v.banco_cobro)))throw Error('Completa fechas, importes, formas de cobro y bancos.');
 if(values.reduce((s,v)=>s+cents(v.importe),0)!==cents(invoice.importe_total))throw Error('Los cobros deben sumar exactamente el total de la factura.');
 if(current.length===values.length&&current.every((o,i)=>String(o.fecha_teorica_cobro||'')===values[i].fecha&&cents(o.cobro_total)===cents(values[i].importe)&&paymentMethod(o.forma_cobro)===values[i].forma_cobro&&invoicePayment(o,'').banco_cobro===values[i].banco_cobro))return;
 if(!current.length)throw Error('La factura no tiene órdenes asociadas.');
 if(current.some(o=>o.cobrada||o.cancelada||o.fecha_real_cobro||o.cobro_revision_bancaria||o.datos_importacion?.cierre_cobro?.activo))throw Error('No se pueden sustituir órdenes cobradas, revisadas o cerradas por acuerdo.');
 const orderIds=current.map(o=>o.id_orden);
 if((await db.query('SELECT 1 FROM administracion_facturas_clientes WHERE id_orden_origen=ANY($1::text[]) AND id_factura_cliente<>$2 LIMIT 1',[orderIds,invoice.id_factura_cliente])).rowCount)throw Error('Las órdenes también figuran como origen de otra factura.');
 if((await db.query('SELECT 1 FROM tesoreria_recibos_importados WHERE id_orden=ANY($1::text[]) AND id_remesa IS NOT NULL LIMIT 1',[orderIds])).rowCount)throw Error('Retira los recibos de su remesa antes de sustituir sus órdenes.');
 if((await db.query(`SELECT 1 FROM tesoreria_movimientos_bancarios WHERE id_orden=ANY($1::text[]) UNION ALL SELECT 1 FROM tesoreria_aplicaciones_cobro WHERE id_orden=ANY($1::text[]) LIMIT 1`,[orderIds])).rowCount)throw Error('Las órdenes tienen movimientos bancarios asociados.');
 const contractId=invoice.id_contrato||current[0].id_contrato;
 if(!contractId)throw Error('La redistribución requiere el contrato de origen de la orden.');
 await db.query('UPDATE administracion_facturas_clientes SET id_orden_origen=NULL WHERE id_factura_cliente=$1',[invoice.id_factura_cliente]);
 await db.query('DELETE FROM tesoreria_recibos_importados WHERE id_orden=ANY($1::text[])',[orderIds]);
 await db.query('DELETE FROM tesoreria_ordenes WHERE id_orden=ANY($1::text[])',[orderIds]);
 const paymentIds=current.map(o=>o.id_cobro_contrato).filter(Boolean);if(paymentIds.length)await db.query('DELETE FROM comercial_contratos_cobros WHERE id_cobro_contrato=ANY($1::text[])',[paymentIds]);
 let allocated=0;const created=[];
 for(let i=0;i<values.length;i++){const v=values[i],paymentId=id('cc'),orderId=testIdentifier(id('tmp'),invoice.es_prueba||isTestIdentifier(invoice.id_factura_cliente)),base=i===values.length-1?cents(invoice.base_imponible)-allocated:Number(invoice.importe_total)?Math.round(cents(invoice.base_imponible)*v.importe/Number(invoice.importe_total)):0;allocated+=base;
  await db.query('INSERT INTO comercial_contratos_cobros(id_cobro_contrato,id_contrato,numero_cobro,fecha_cobro,importe_cobro,forma_cobro,banco_cobro) VALUES($1,$2,$3,$4,$5,$6,$7)',[paymentId,contractId,100000+i,v.fecha,v.importe,v.forma_cobro,v.banco_cobro]);
  await db.query(`INSERT INTO tesoreria_ordenes(id_orden,id_contrato,id_factura,id_cuenta,id_cobro_contrato,numero_cobro,fecha_teorica_cobro,forma_cobro,banco_cobro,base_imponible,cobro_total,con_iva)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[orderId,contractId,invoice.id_factura_cliente,invoice.id_cuenta,paymentId,100000+i,v.fecha,v.forma_cobro,v.banco_cobro,base/100,v.importe,Number(invoice.importe_total)>Number(invoice.base_imponible)]);
  if(Number(invoice.importe_total)===0)await db.query(`UPDATE tesoreria_ordenes SET datos_importacion=COALESCE(datos_importacion,'{}'::jsonb)||'{"sin_cobro_monetario":true}'::jsonb WHERE id_orden=$1`,[orderId]);created.push(orderId);
 }
 const changes=await renumberContractOrders(db,contractId),mapping=new Map(changes.map(o=>[o.old,o.next]));
 const ids=created.map(value=>mapping.get(value)||value).sort((a,b)=>Number(a.split('-').at(-1).split('/')[0])-Number(b.split('-').at(-1).split('/')[0]));
 const methods=[...new Set(values.map(value=>value.forma_cobro))];
 await db.query('UPDATE administracion_facturas_clientes SET forma_cobro=$2 WHERE id_factura_cliente=$1',[invoice.id_factura_cliente,methods.length===1?methods[0]:'mixto']);
 if(invoice.id_orden_origen)await db.query('UPDATE administracion_facturas_clientes SET id_orden_origen=$2 WHERE id_factura_cliente=$1',[invoice.id_factura_cliente,ids[0]]);
 await db.query(`UPDATE administracion_facturas_clientes SET datos_importacion=COALESCE(datos_importacion,'{}'::jsonb)||$2::jsonb WHERE id_factura_cliente=$1`,[invoice.id_factura_cliente,JSON.stringify({facturacion_por_ordenes:true,ordenes_origen:ids})]);
 for(const orderId of ids)await ensureOrderReceipt(db,orderId,actorId);
 await accountActivity(db,invoice.id_cuenta,actorId,'ha redistribuido los cobros de la factura '+invoice.id_factura_cliente+'; órdenes retiradas: '+orderIds.join(', ')+'; nuevas órdenes: '+ids.join(', ')+'.');
}
