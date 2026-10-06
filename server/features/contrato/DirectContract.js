import { assertCommercialAgent } from "../agente/CommercialAgent.js";
import { randomUUID } from 'node:crypto';
import { getPgPool } from '../../database/pgClient.js';
import { accountActivity } from '../comentario/AccountActivity.js';
import { ensureOrderReceipt, incomeCents, lockIncome, syncOrderCollections } from '../prevision/IncomeReconciliation.js';
import { parseImportDate } from '../prevision/ReceiptExcel.js';
import { serviceLineBase } from '../../../app/config/serviceLine.js';
import { ensureProductionContentFolders } from '../produccion/GestionesProduccionRepository.js';

const id = prefix => `${prefix}_${randomUUID().replaceAll('-', '').slice(0,24)}`;
const fail = message => { throw Object.assign(new Error(message), {status:400}); };
const date = value => { try {return parseImportDate(value);} catch(error){fail(error.message);} };
export const paymentMethods = ['transferencia','recibo','tarjeta','efectivo','pagaré'];
export function validateDirectContract(data) {
  if (!data?.id_cuenta_contrato || !String(data.nombre_contrato || '').trim()) fail('Selecciona una cuenta e indica el nombre del contrato.');
  const signature=date(data.fecha_firma_contrato),end=date(data.fecha_fin_contrato);
  if(signature&&end&&end.split('/').reverse().join('-')<signature.split('/').reverse().join('-'))fail('La fecha fin no puede ser anterior a la firma.');
  const lines = Array.isArray(data.lineas) ? data.lineas : [];
  const payments = Array.isArray(data.cobros) ? data.cobros : [];
  const exchange = data.es_intercambio === true;
  if (exchange && (payments.length || !String(data.condiciones_intercambio || '').trim())) fail('Describe las condiciones del intercambio y no añadas cobros monetarios.');
  if (!lines.length || !exchange && !payments.length || lines.length>200 || payments.length>200) fail('Introduce entre 1 y 200 servicios y cobros.');
  const prepared = lines.map(line => {
    const units=Number(line.unidades), price=Number(line.precio_unitario), vat=Number(line.iva_porcentaje);
    if (!String(line.producto || '').trim() || !Number.isFinite(units) || units<=0 || !Number.isFinite(price) || price<0 || ![0,4,10,21].includes(vat)) fail('Revisa concepto, unidades, precio e IVA de cada servicio.');
    const discount=Number(line.descuento_producto || 0),custom=Number(line.precio_total_personalizado || 0);
    if(!Number.isFinite(discount)||discount<0||(line.tipo_descuento_producto!=='importe'&&discount>100)||!Number.isFinite(custom)||custom<0)fail('Revisa el descuento y el importe personalizado.');
    if(line.modo_precio&&!['calculado','gratis','tachado','personalizado'].includes(line.modo_precio))fail('Modo de precio no válido.');
    const base=Math.round(serviceLineBase({...line,unidades:units,precio_unitario:price})*100)/100;
    return {...line,producto:String(line.producto).trim(),descripcion_linea:String(line.descripcion_linea || ''),unidades:units,precio_unitario:price,base,iva_porcentaje:vat,total:Math.round(base*(1+vat/100)*100)/100};
  });
  const total=prepared.reduce((sum,line)=>sum+incomeCents(line.total),0);
  if (total<=0) fail('El total del contrato debe ser positivo.');
  const cobros=payments.map(payment=>{
    const amount=Number(payment.importe_cobro);
    const paymentDate=date(payment.fecha_cobro);
    if (!paymentDate || !Number.isFinite(amount) || amount<=0 || !paymentMethods.includes(payment.forma_cobro) || !['Sabadell','Santander'].includes(payment.banco_cobro)) fail('Cada cobro necesita fecha válida, importe positivo, forma de pago y banco.');
    return {...payment,fecha_cobro:paymentDate,importe_cobro:incomeCents(amount)/100};
  });
  if (!exchange && cobros.reduce((sum,payment)=>sum+incomeCents(payment.importe_cobro),0)!==total) fail('La suma de los cobros debe coincidir exactamente con el total del contrato.');
  return {lineas:prepared,cobros,total:total/100,base:prepared.reduce((sum,line)=>sum+incomeCents(line.base),0)/100};
}

export async function createDirectContract(data, actorId='', pool=getPgPool()) {
  const prepared=validateDirectContract(data), db=await pool.connect();
  try {
    await db.query('BEGIN');await lockIncome(db);
    if (!(await db.query('SELECT 1 FROM comercial_cuentas WHERE id_cuenta=$1',[data.id_cuenta_contrato])).rowCount) fail('La cuenta no existe.');
    await assertCommercialAgent(db, data.id_agente_contrato);
    if (data.id_contacto_contrato && !(await db.query('SELECT 1 FROM comercial_contactos WHERE id_contacto=$1 AND id_cuenta=$2',[data.id_contacto_contrato,data.id_cuenta_contrato])).rowCount) fail('El contacto no pertenece a la cuenta.');
    const contractId=id('con');
    await db.query(`INSERT INTO comercial_contratos(id_contrato,nombre_contrato,id_cuenta_contrato,id_agente_contrato,id_contacto_contrato,
      fecha_firma_contrato,fecha_fin_contrato,fecha_cobro_prevista_contrato,forma_cobro_contrato,importe_total_bi_contrato,importe_contrato_con_iva,iva_aplicable,comentarios_adicionales)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [contractId,String(data.nombre_contrato).trim(),data.id_cuenta_contrato,data.id_agente_contrato || null,data.id_contacto_contrato || null,
      date(data.fecha_firma_contrato),date(data.fecha_fin_contrato),prepared.cobros[0]?.fecha_cobro || null,data.es_intercambio === true ? 'intercambio' : prepared.cobros[0].forma_cobro,
      prepared.base,data.es_intercambio === true ? 0 : prepared.total,prepared.lineas.some(line=>line.iva_porcentaje>0),String(data.comentarios_adicionales || '')]);
    if (data.es_intercambio === true) await db.query('UPDATE comercial_contratos SET es_intercambio=TRUE,importe_intercambio=$2,condiciones_intercambio=$3 WHERE id_contrato=$1',[contractId,prepared.total,String(data.condiciones_intercambio).trim()]);
    const contentIds=[];
    for (const [index,line] of prepared.lineas.entries()) { const lineId=id('lcon'); await db.query(`INSERT INTO comercial_contratos_lineas
      (id_linea_contrato,id_contrato,numero_linea_contrato,producto,descripcion_linea,unidades,precio_unitario,precio_producto,precio_total_personalizado,linea_snapshot)
      VALUES($1,$2,$3,$4,$5,$6,$7,$7,$8,$9::jsonb)`,[lineId,contractId,index+1,line.producto,line.descripcion_linea,line.unidades,line.precio_unitario,line.base,JSON.stringify(line)]);
      await db.query(`UPDATE comercial_contratos_lineas SET id_servicio=$2,id_publicacion=$3,medio=$4,publicacion=$5,especificaciones_linea=$6,descuento_producto=$7,tipo_descuento_producto=$8,modo_precio=$9,precio_tarifa=$10,deadline_publicacion=$11,fecha_publicacion_publicacion=$12,id_pagina_publicacion=$13 WHERE id_linea_contrato=$1`,[lineId,line.id_servicio || null,line.id_publicacion || null,line.medio || '',line.publicacion || '',line.especificaciones_linea || '',Number(line.descuento_producto || 0),line.tipo_descuento_producto || 'porcentaje',line.modo_precio || 'calculado',Number(line.precio_tarifa || 0),line.deadline_publicacion || '',line.fecha_publicacion_publicacion || '',line.id_pagina_publicacion || '']);
      const contentId=id('cont');
      await db.query(`INSERT INTO produccion_contenidos(id_contenido,id_publicacion,id_cuenta,especificaciones_contenido,id_agente,estado_contenido,deadline_contenido,hoja_prod,id_contrato,id_linea_contrato,nombre_contenido,tipo_contenido,fecha_publicacion,ano_publicacion,servicio,contenido_especifico_id)
        VALUES($1,$2,$3,$4,$5,'pendiente de recibir materiales',$6,TRUE,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [contentId,line.id_publicacion || null,data.id_cuenta_contrato,line.especificaciones_linea || line.descripcion_linea || '',data.id_agente_contrato || '',line.deadline_publicacion || '',contractId,lineId,line.producto,line.medio || line.producto,line.fecha_publicacion_publicacion || '',String(line.fecha_publicacion_publicacion || '').match(/\d{4}/)?.[0] || '',line.id_servicio || '',line.id_publicacion || '']);
      await db.query('UPDATE comercial_contratos_lineas SET array_id_contenidos=$2::jsonb WHERE id_linea_contrato=$1',[lineId,JSON.stringify([contentId])]);
      await ensureProductionContentFolders(db,contentId,line.id_publicacion || '');
      contentIds.push({id_contenido:contentId});
    }
    const orderIds=[];
    let allocatedBase=0;
    for (const [index,payment] of prepared.cobros.entries()) {
      const orderId=id('ord'),paymentId=id('ccon');orderIds.push(orderId);
      const base=index===prepared.cobros.length-1 ? prepared.base-allocatedBase : Math.round(payment.importe_cobro*prepared.base/prepared.total*100)/100;
      allocatedBase+=base;
      await db.query(`INSERT INTO comercial_contratos_cobros(id_cobro_contrato,id_contrato,numero_cobro,fecha_cobro,importe_cobro,forma_cobro,banco_cobro)
        VALUES($1,$2,$3,$4,$5,$6,$7)`,[paymentId,contractId,index+1,payment.fecha_cobro,payment.importe_cobro,payment.forma_cobro,payment.banco_cobro]);
      await db.query(`INSERT INTO tesoreria_ordenes(id_orden,id_contrato,id_cuenta,id_cobro_contrato,numero_cobro,etiqueta_cobro,fecha_teorica_cobro,forma_cobro,banco_cobro,base_imponible,cobro_total)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[orderId,contractId,data.id_cuenta_contrato,paymentId,index+1,'Cobro '+(index+1),payment.fecha_cobro,payment.forma_cobro,payment.banco_cobro,base,payment.importe_cobro]);
      await ensureOrderReceipt(db,orderId,actorId);
    }
    await db.query('UPDATE comercial_contratos SET array_id_ordenes=$2::jsonb,array_contenidos=$3::jsonb WHERE id_contrato=$1',[contractId,JSON.stringify(orderIds),JSON.stringify(contentIds)]);
    await syncOrderCollections(db,orderIds,actorId);
    await accountActivity(db,data.id_cuenta_contrato,actorId,`ha creado el contrato independiente ${contractId}, sin propuesta ni factura, con las órdenes ${orderIds.join(', ')}.`);
    await db.query('COMMIT');return {id_contrato:contractId,ordenes:orderIds};
  } catch(error) { await db.query('ROLLBACK');throw error; } finally {db.release();}
}
