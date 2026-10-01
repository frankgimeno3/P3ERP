import {getPgPool} from '../../database/pgClient.js';
import {lockIncome,incomeError} from '../prevision/IncomeReconciliation.js';
import {accountActivity} from '../comentario/AccountActivity.js';

export async function deleteDraftInvoice(id,version,actorId=''){
  const db=await getPgPool().connect();
  try{
    await db.query('BEGIN');await lockIncome(db);
    const invoice=(await db.query('SELECT * FROM administracion_facturas_clientes WHERE id_factura_cliente=$1 FOR UPDATE',[id])).rows[0];
    if(!invoice){await db.query('COMMIT');return null;}
    if(!version || new Date(invoice.updated_at).toISOString()!==version)incomeError('La factura ha cambiado. Recarga su ficha antes de eliminarla.');
    if((invoice.verifactu_estado_envio||'borrador')!=='borrador'||invoice.ya_contabilizada)incomeError('Solo se pueden eliminar facturas en borrador, sin emitir ni contabilizar.');
    if((await db.query('SELECT 1 FROM fiscal_verifactu_registros WHERE invoice_id=$1 LIMIT 1',[id])).rowCount)incomeError('La factura tiene un registro de emisión y no se puede eliminar.');
    if((await db.query('SELECT 1 FROM administracion_facturas_clientes WHERE factura_origen_id=$1 LIMIT 1',[id])).rowCount)incomeError('La factura tiene documentos derivados. Revísalos antes de eliminarla.');
    const orders=(await db.query('SELECT * FROM tesoreria_ordenes WHERE id_factura=$1 ORDER BY id_orden FOR UPDATE',[id])).rows;
    const reviewed=(await db.query(`SELECT 1 FROM tesoreria_movimientos_bancarios b WHERE b.estado_revision AND
      (b.id_orden=ANY($1::text[]) OR EXISTS(SELECT 1 FROM tesoreria_aplicaciones_cobro a WHERE a.id_linea_banco=b.id_linea_banco AND a.id_orden=ANY($1::text[]))) LIMIT 1`,[orders.map(o=>o.id_orden)])).rowCount;
    if(invoice.cobrada||Number(invoice.importe_cobrado)>0||orders.some(o=>o.cobrada)||reviewed)incomeError('La factura tiene cobros confirmados. Resuélvelos antes de eliminarla.');
    const accounts=(await db.query(`SELECT id_cuenta FROM tesoreria_ordenes WHERE id_factura=$1 UNION SELECT id_cuenta_contrato FROM comercial_contratos WHERE id_factura=$1 UNION SELECT $2::text id_cuenta`,[id,invoice.id_cuenta])).rows;
    for(const {id_cuenta:account}of accounts)if(account)await accountActivity(db,account,actorId,`ha eliminado la factura borrador ${invoice.numero_factura||id} (${id}). Se conservan sus contratos, órdenes y recibos; las órdenes quedan sin factura asociada.`);
    await db.query('DELETE FROM administracion_lineas_factura WHERE id_factura_cliente=$1',[id]);
    await db.query('UPDATE tesoreria_ordenes SET id_factura=NULL,updated_at=now() WHERE id_factura=$1',[id]);
    await db.query('UPDATE comercial_contratos SET id_factura=NULL,updated_at=now() WHERE id_factura=$1',[id]);
    await db.query('DELETE FROM administracion_facturas_clientes WHERE id_factura_cliente=$1',[id]);
    await db.query('COMMIT');return {deleted:true,id_factura:id,ordenes_conservadas:orders.length};
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
