import {getPgPool} from '../../database/pgClient.js';
import {juanYear} from './JuanAnnual.js';
import {getJuanWorkbook} from './JuanRepository.js';
import {ProveedorError,findSupplier} from '../proveedor/SupplierAdminRepository.js';

// Selecting a supplier does not rewrite the supplier of an existing charge.
export async function associateJuanProvider(body,pool=getPgPool()) {
 const year=juanYear(body.year),id=`juan-${year}`,db=await pool.connect();
 try {
  await db.query('BEGIN');
  await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
  const book=(await db.query('SELECT * FROM tesoreria_prevision_juan WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!book)throw new ProveedorError('Hoja no encontrada.',404);
  if(book.version!==body.version)throw new ProveedorError('La hoja ha cambiado. Actualiza antes de guardar.',409);
  const sheet=book.sheets.find(s=>s.bank===body.bank),row=sheet?.payments.find(r=>r.id===body.rowId);
  if(!row||row.cardPart||/^(?:VISAS?\b|TARJETAS?\b|TRASPASOS?\b)|\bEFECTIVO\b/i.test(row.label))throw new ProveedorError('Esta fila es un presupuesto agrupado. Sus proveedores se gestionan en los cargos del desglose.');
  const old=(await db.query('SELECT * FROM tesoreria_prevision_juan_asociaciones WHERE workbook_id=$1 AND bank=$2 AND row_id=$3',[id,body.bank,body.rowId])).rows[0];
  if(old?.employee_id)throw new ProveedorError('Esta fila corresponde a una nómina, no a un proveedor.');
  const provider=await findSupplier(body.providerId,db);
  const chargeIds=old?.charge_ids||[];
  if(chargeIds.length) {
   const charges=(await db.query('SELECT tipo_cargo,id_proveedor FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente::text=ANY($1::text[])',[chargeIds.map(String)])).rows;
   if(charges.some(c=>c.tipo_cargo==='nomina'||c.id_proveedor!==provider.id_proveedor))throw new ProveedorError('El proveedor no coincide con el del cargo asociado. Revisa primero el destinatario del cargo; no se cambia una nómina ni otro cargo desde esta asociación.',409);
  }
  const status=chargeIds.length?(old.status||'matched'):'ready_to_create';
  const evidence={...(old?.evidence||{}),reason:`Proveedor seleccionado desde el desglose: ${provider.nombre_proveedor}. ${chargeIds.length?'Se conservan los cargos asociados.':'Falta vincular o preparar el cargo recurrente.'}`,conflicts:old?.evidence?.conflicts||[],candidates:[]};
  await db.query(`INSERT INTO tesoreria_prevision_juan_asociaciones(workbook_id,bank,row_id,status,provider_id,charge_ids,evidence)
   VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb) ON CONFLICT(workbook_id,bank,row_id) DO UPDATE SET provider_id=EXCLUDED.provider_id,status=EXCLUDED.status,evidence=EXCLUDED.evidence,updated_at=now()`,[id,body.bank,body.rowId,status,provider.id_proveedor,JSON.stringify(chargeIds),JSON.stringify(evidence)]);
  await db.query('UPDATE tesoreria_prevision_juan SET version=version+1,updated_at=now() WHERE id=$1',[id]);
  await db.query('COMMIT');
  return getJuanWorkbook(pool,year);
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
