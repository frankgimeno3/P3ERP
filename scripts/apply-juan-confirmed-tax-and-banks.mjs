import env from '@next/env';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {getPgPool} from '../server/database/pgClient.js';
import {forecastRuleVat,forecastVat} from '../app/lib/forecastVat.js';
env.loadEnvConfig(process.cwd());const pool=getPgPool(),db=await pool.connect();
try {
 await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtext('ingresos:conciliacion'))");await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
 await db.query(fs.readFileSync('database/migrations/20261003_0004_receipt_default_bank.sql','utf8'));
 const assigned=(await db.query("UPDATE tesoreria_ordenes SET banco_cobro='Sabadell',updated_at=now() WHERE NOT cancelada AND NOT COALESCE(cobrada,false) AND forma_cobro ~* '(recibo|remesa)' AND banco_cobro IS DISTINCT FROM 'Sabadell' RETURNING id_orden,id_cobro_contrato,id_cobro_propuesta,fecha_teorica_cobro,cobro_total")).rows;
 for(const o of assigned) {
  if(o.id_cobro_contrato)await db.query("UPDATE comercial_contratos_cobros SET banco_cobro='Sabadell',updated_at=now() WHERE id_cobro_contrato=$1",[o.id_cobro_contrato]);
  if(o.id_cobro_propuesta)await db.query("UPDATE comercial_propuestas_cobros SET banco_cobro='Sabadell' WHERE id_cobro_propuesta=$1",[o.id_cobro_propuesta]);
 }
 const decisions=new Map([[5,false],[6,false],...[4,7,15,16,17,18,26,27,28,29,31,51].map(id=>[id,true]),[53,false]]);
 const changed=[];
 for(const [id,contains] of decisions) {
  const charge=(await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=$1 AND activo FOR UPDATE',[id])).rows[0];if(!charge)throw Error(`Falta cargo ${id}`);
  const rules=charge.programacion.map(r=>({...forecastRuleVat({...r,contains_iva:contains,tipo_iva:contains?21:0}),...(id===5||id===6?{requiere_factura:false}:{}),fiscal_evidence:id===53?'Comisión de cuenta: operación financiera exenta; AEAT Manual IVA 2026.':'Confirmado por el usuario el 03/10/2026.'}));
  await db.query('UPDATE tesoreria_cargos_recurrentes SET programacion=$2::jsonb,updated_at=now() WHERE id_cargo_recurrente=$1',[id,JSON.stringify(rules)]);
  const dues=(await db.query("SELECT * FROM tesoreria_cargos_vencimientos v WHERE id_cargo_recurrente=$1 AND fecha>='2026-10-01' AND NOT EXISTS(SELECT 1 FROM tesoreria_vencimientos_aplicaciones a WHERE a.id_vencimiento=v.id) AND NOT EXISTS(SELECT 1 FROM administracion_tickets t WHERE t.id_vencimiento_tarjeta=v.id)",[id])).rows;
  for(const due of dues)await db.query('UPDATE tesoreria_cargos_vencimientos SET programacion=$2::jsonb WHERE id=$1',[due.id,JSON.stringify({...due.programacion,...forecastVat(due.importe,contains,contains?21:0),fiscal_evidence:rules[0].fiscal_evidence,...(id===5||id===6?{requiere_factura:false}:{})})]);
  changed.push({id,rules:rules.length,contains_iva:contains,rate:contains?21:0});
 }
 const providers=[];
 for(const [name,pattern] of [['FINCAS SERRA','%FINCAS SERRA%'],['TRADIS','%TRADIS%'],['ENDESA','%LUZ %']]) {
  let provider=(await db.query('SELECT * FROM administracion_proveedores WHERE lower(btrim(nombre_proveedor))=lower($1)',[name])).rows;
  if(provider.length>1)throw Error(`Proveedor ambiguo ${name}`);
  provider=provider[0]||(await db.query("INSERT INTO administracion_proveedores(id_proveedor,nombre_proveedor,nombre_fiscal_proveedor,vat_code,pais_proveedor,moneda_proveedor) VALUES($1,$2,$2,'','','EUR') RETURNING *",[`prov_${randomUUID().replaceAll('-','')}`,name])).rows[0];
  const rows=(await db.query('UPDATE tesoreria_prevision_juan_asociaciones SET provider_id=$1,status=CASE WHEN jsonb_array_length(charge_ids)=0 THEN \'ready_to_create\' ELSE status END,evidence=jsonb_set(evidence,\'{reason}\',to_jsonb($2::text)),updated_at=now() WHERE evidence->>\'label\' ILIKE $3 RETURNING workbook_id,bank,row_id',[provider.id_proveedor,`Proveedor confirmado por el usuario: ${name}.`,pattern])).rows;
  for(const workbook of new Set(rows.map(r=>r.workbook_id)))await db.query('UPDATE tesoreria_prevision_juan SET version=version+1,updated_at=now() WHERE id=$1',[workbook]);
  providers.push({name,id:provider.id_proveedor,rows});
 }
 await db.query('COMMIT');console.log(JSON.stringify({assignedReceipts:assigned.length,vatUpdated:changed,providers},null,2));
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
