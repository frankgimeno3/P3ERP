import { getPgPool } from '../../database/pgClient.js';
import { orderActivity } from '../comentario/AccountActivity.js';
import { ensureOrderReceipt, lockIncome, syncOrderCollections, incomeError } from '../prevision/IncomeReconciliation.js';

export async function importAdministrativeOrders(rows, actorId='', pool=getPgPool()) {
  const db=await pool.connect();let created=0,updated=0,unchanged=0;
  try {
    await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'");await lockIncome(db);
    for(const incoming of [...rows].sort((a,b)=>a.id_orden.localeCompare(b.id_orden))){
      const row={...incoming};
      const before=(await db.query('SELECT * FROM tesoreria_ordenes WHERE id_orden=$1 FOR UPDATE',[row.id_orden])).rows[0];
      if(!row.id_cuenta && row.datos_importacion?.cliente){
        const matches=(await db.query('SELECT id_cuenta FROM comercial_cuentas WHERE id_cuenta=$1 OR lower(btrim(nombre_empresa))=lower($1) OR lower(btrim(nombre_fiscal))=lower($1)',[row.datos_importacion.cliente])).rows;
        if(matches.length===1)row.id_cuenta=matches[0].id_cuenta;
      }
      if(row.id_cuenta && !(await db.query('SELECT 1 FROM comercial_cuentas WHERE id_cuenta=$1',[row.id_cuenta])).rowCount)incomeError('La cuenta '+row.id_cuenta+' de la orden '+row.id_orden+' no existe.');
      if(row.id_factura){
        const found=(await db.query('SELECT * FROM administracion_facturas_clientes WHERE id_factura_cliente=$1 OR numero_factura=$1',[row.id_factura])).rows;
        if(found.length>1)incomeError('Varias facturas coinciden con '+row.id_factura+'.');
        if(found.length)row.id_factura=found[0].id_factura_cliente;
        else row.id_factura=(await db.query("INSERT INTO administracion_facturas_clientes(id_factura_cliente,numero_factura,id_cuenta,estado) VALUES($1,$2,$3,'en proceso') RETURNING id_factura_cliente",['fac_excel_'+row.id_factura,row.id_factura,row.id_cuenta || before?.id_cuenta || null])).rows[0].id_factura_cliente;
      }
      row.datos_importacion={...(before?.datos_importacion || {}),...row.datos_importacion};
      const changed=Object.keys(row).filter(k=>k!=='id_orden' && (k==='datos_importacion'?JSON.stringify(row[k])!==JSON.stringify(before?.[k] || {}):String(row[k] ?? '')!==String(before?.[k] ?? '')));
      if(before?.cobro_revision_bancaria && changed.some(k=>['cobrada','fecha_real_cobro'].includes(k)))incomeError('El estado y la fecha de la orden '+row.id_orden+' provienen de una revisión bancaria. Modifica esa revisión para cambiarlos.');
      if(before && changed.includes('forma_cobro') && !/recibo/i.test(row.forma_cobro) && (await db.query('SELECT 1 FROM tesoreria_recibos_importados WHERE id_orden=$1 AND id_remesa IS NOT NULL',[row.id_orden])).rowCount)incomeError('La orden '+row.id_orden+' tiene un recibo en remesa; revisa esa asociación antes de cambiar la forma de cobro.');
      const encode=k=>k==='datos_importacion'?JSON.stringify(row[k]):row[k];
      if(!before){const fields=Object.keys(row);await db.query('INSERT INTO tesoreria_ordenes('+fields.join(',')+') VALUES('+fields.map((_,i)=>'$'+(i+1)).join(',')+')',fields.map(encode));created++;}
      else if(changed.length){await db.query('UPDATE tesoreria_ordenes SET '+changed.map((k,i)=>k+'=$'+(i+1)).join(',')+',updated_at=now() WHERE id_orden=$'+(changed.length+1),[...changed.map(encode),row.id_orden]);updated++;}
      else unchanged++;
      if(!before || changed.length)await orderActivity(db,row.id_orden,actorId,(before?'ha modificado':'ha creado')+' la orden mediante Excel de control administrativo'+(changed.length?' ('+changed.join(', ')+')':'')+'.');
      await ensureOrderReceipt(db,row.id_orden,actorId);
      await syncOrderCollections(db,[row.id_orden],actorId);
    }
    await db.query('COMMIT');return {created,updated,unchanged,total:rows.length};
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
