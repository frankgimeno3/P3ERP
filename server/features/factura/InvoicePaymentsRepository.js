import {getPgPool} from '../../database/pgClient.js';
import {validInvoiceDate} from './SupplierInvoiceValidation.js';
import {randomUUID,createHash} from 'node:crypto';
const paymentVersion=rows=>createHash('sha256').update(JSON.stringify(rows)).digest('hex');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export async function getInvoicePayments(paymentId,pool=getPgPool()){
  const payment=(await pool.query('SELECT * FROM tesoreria_pagos_previstos WHERE id_pago=$1',[paymentId])).rows[0];if(!payment)fail('Pago no encontrado.',404);
  const invoice=payment.id_factura_proveedor?(await pool.query('SELECT * FROM administracion_facturas_proveedores WHERE id_factura_proveedor=$1',[payment.id_factura_proveedor])).rows[0]:null;
  const payments=invoice?(await pool.query('SELECT * FROM tesoreria_pagos_previstos WHERE id_factura_proveedor=$1 ORDER BY fecha_pago,id_pago',[invoice.id_factura_proveedor])).rows:[payment];
  return {invoice,provider:payment.id_proveedor,total:Number(invoice?.importe_total??payment.total_pago),payments,version:paymentVersion(payments)};
}
export async function saveInvoicePayments(paymentId,body,pool=getPgPool()){
  const db=await pool.connect();try{
    await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
    const payment=(await db.query('SELECT * FROM tesoreria_pagos_previstos WHERE id_pago=$1 FOR UPDATE',[paymentId])).rows[0];if(!payment)fail('Pago no encontrado.',404);
    const invoice=payment.id_factura_proveedor?(await db.query('SELECT * FROM administracion_facturas_proveedores WHERE id_factura_proveedor=$1 FOR UPDATE',[payment.id_factura_proveedor])).rows[0]:null;
    const original=invoice?(await db.query('SELECT * FROM tesoreria_pagos_previstos WHERE id_factura_proveedor=$1 ORDER BY fecha_pago,id_pago FOR UPDATE',[invoice.id_factura_proveedor])).rows:[payment];
    if(paymentVersion(original)!==body.version)fail('Los vencimientos han cambiado. Vuelve a abrirlos.',409);
    const payments=body.payments;if(!Array.isArray(payments)||!payments.length||payments.length>100)fail('Añade entre 1 y 100 vencimientos.');
    if(!invoice&&(payments.length!==1||payments[0].id_pago!==paymentId))fail('Este pago independiente no se puede dividir sin una factura.');
    const seen=new Set();for(const p of payments){
      p.forma=String(p.forma||'').trim().toLowerCase().replace(/^pagare$/,'pagaré');
      if(!['recibo','transferencia','pagaré'].includes(p.forma))fail('Selecciona una forma de pago válida.');
      if(!['Sabadell','Santander'].includes(p.banco)||!validInvoiceDate(p.fecha)||!String(p.forma||'').trim()||!Number.isFinite(Number(p.importe))||Number(p.importe)<=0)fail('Completa banco, fecha válida, forma e importe de cada vencimiento.');
      if(p.id_pago&&(!original.some(o=>o.id_pago===p.id_pago)||seen.has(p.id_pago)))fail('La identidad del pago no es válida.');if(p.id_pago)seen.add(p.id_pago);
      if(p.id_vencimiento){const due=(await db.query('SELECT v.id FROM tesoreria_cargos_vencimientos v JOIN tesoreria_cargos_recurrentes c ON c.id_cargo_recurrente=v.id_cargo_recurrente WHERE v.id=$1 AND c.id_proveedor=$2 AND c.banco_pago=$3 FOR UPDATE OF v',[p.id_vencimiento,payment.id_proveedor,p.banco])).rows[0];if(!due)fail('El vencimiento estimado debe pertenecer al mismo proveedor y banco.');}
    }
    const total=Number(invoice?.importe_total??payment.total_pago);if(payments.reduce((n,p)=>n+Math.round(Number(p.importe)*100),0)!==Math.round(total*100))fail('Los vencimientos deben sumar el total de la factura.');
    for(const old of original){const updated=payments.find(p=>p.id_pago===old.id_pago);const linked=(await db.query('SELECT 1 FROM tesoreria_movimientos_bancarios WHERE id_pago=$1 LIMIT 1',[old.id_pago])).rowCount;if(linked&&(!updated||updated.banco!==old.cuenta_pago||Number(updated.importe)!==Number(old.total_pago)||updated.fecha!==old.fecha_pago||(updated.id_vencimiento||null)!==(old.id_vencimiento||null)))fail('Un pago con movimientos bancarios asociados conserva su banco, fecha e importe. Revisa primero su conciliación.',409);if(!updated)await db.query('DELETE FROM tesoreria_pagos_previstos WHERE id_pago=$1',[old.id_pago]);}
    for(const p of payments){if(p.id_pago)await db.query('UPDATE tesoreria_pagos_previstos SET cuenta_pago=$2,fecha_pago=$3,total_pago=$4,forma_pago=$5,id_vencimiento=$6,updated_at=now() WHERE id_pago=$1',[p.id_pago,p.banco,p.fecha,p.importe,p.forma,p.id_vencimiento||null]);else await db.query('INSERT INTO tesoreria_pagos_previstos(id_pago,id_factura_proveedor,id_proveedor,cuenta_pago,fecha_pago,total_pago,forma_pago,id_vencimiento,nombre_planificacion) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[`payment_${randomUUID()}`,payment.id_factura_proveedor,payment.id_proveedor,p.banco,p.fecha,p.importe,p.forma,p.id_vencimiento||null,payment.nombre_planificacion]);}
    await db.query('COMMIT');return {saved:true};
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
