import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());const pool=getPgPool(),db=await pool.connect();
try {
 await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
 for(const id of [52,30]) {
  const charge=(await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=$1 FOR UPDATE',[id])).rows[0];
  const evidence=id===52?'Presupuesto mixto: transferencias exentas, gestión de cobro de recibos/remesas no exenta. Falta desglose de liquidación Sabadell; no se infiere IVA de todo el presupuesto.':'Suministro de agua: IVA 10%; recibo con cánones/tasas adicionales. Falta desglose de factura; no se divide el total automáticamente entre 1,10.';
  const rules=charge.programacion.map(r=>{const next={...r,base_imponible:0,vat_review_required:true,fiscal_evidence:evidence};if(id===52){delete next.contains_iva;delete next.tipo_iva;delete next.importe_iva;delete next.bases_por_fecha;}else next.vat_supply_rate=10;return next;});
  await db.query('UPDATE tesoreria_cargos_recurrentes SET programacion=$2::jsonb,updated_at=now() WHERE id_cargo_recurrente=$1',[id,JSON.stringify(rules)]);
  const dues=(await db.query("SELECT id,programacion FROM tesoreria_cargos_vencimientos v WHERE id_cargo_recurrente=$1 AND fecha>='2026-10-01' AND NOT EXISTS(SELECT 1 FROM tesoreria_vencimientos_aplicaciones a WHERE a.id_vencimiento=v.id)",[id])).rows;
  for(const due of dues){const r={...due.programacion,base_imponible:0,vat_review_required:true,fiscal_evidence:evidence};delete r.contains_iva;delete r.tipo_iva;delete r.importe_iva;if(id===30)r.vat_supply_rate=10;await db.query('UPDATE tesoreria_cargos_vencimientos SET programacion=$2::jsonb WHERE id=$1',[due.id,JSON.stringify(r)]);}
 }
 await db.query('COMMIT');console.log('Sabadell mixed fees and Aigües: actual total preserved; fiscal split awaits supporting bill.');
}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();await pool.end();}
