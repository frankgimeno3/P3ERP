import env from '@next/env';
import fs from 'node:fs/promises';
import path from 'node:path';
import {getPgPool} from '../server/database/pgClient.js';
import {saveWorkflowExpense} from '../server/features/banco/BankWorkflowExpense.js';
env.loadEnvConfig(process.cwd());const pool=getPgPool(),db=await pool.connect(),apply=process.argv.includes('--apply');
const items=[['banc_sab_26_000.000.183','O26.0080','prov_excel_rapid_envios'],['banc_sab_26_000.000.400','O26.T2.0070','prov_excel_rapid_envios'],['banc_sab_26_000.000.270','O26.0094','prov_excel_correos'],['banc_sab_26_000.000.440','O26.T2.0076','prov_excel_correos'],['banc_sab_26_000.000.527','O26.T3.0049','prov_excel_correos'],['banc_sab_26_000.000.316','O26.T2.0052','prov_excel_ivan_zabara'],['banc_san_26_000.000.011','O26.T3.0007','prov_messe_duesseldorf'],['banc_san_26_000.000.012','O26.T3.0006','prov_messe_duesseldorf'],['banc_san_26_000.000.013','O26.T3.0005','prov_messe_duesseldorf']];
try {
 await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'");await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
 const lines=(await db.query('SELECT * FROM tesoreria_movimientos_bancarios WHERE id_linea_banco=ANY($1::text[]) ORDER BY id_linea_banco FOR UPDATE',[items.map(i=>i[0])])).rows;
 const invoices=(await db.query('SELECT * FROM administracion_facturas_proveedores WHERE id_factura_proveedor=ANY($1::text[]) ORDER BY id_factura_proveedor FOR UPDATE',[items.map(i=>i[1])])).rows;
 const plan=[];
 for(const [id,invoiceId,provider] of items) {
  const line=lines.find(l=>l.id_linea_banco===id),invoice=invoices.find(f=>f.id_factura_proveedor===invoiceId);
  if(!line||!invoice||Math.round(-Number(line.importe)*100)!==Math.round(Number(invoice.importe_total)*100)||line.duplicado_descartado)throw Error(`Importe o documento modificado: ${id}`);
  if(provider==='prov_messe_duesseldorf'&&(!line.concepto.includes(invoice.numero_factura_proveedor)||!/Messe D.sseldorf/i.test(line.concepto)))throw Error('Referencia Messe no coincidente');
  if(invoice.id_proveedor&&invoice.id_proveedor!==provider)throw Error('Proveedor de factura distinto');
  if(line.estado_revision){if(line.id_proveedor!==provider||!line.id_pago)throw Error('Revisión previa distinta');continue;}
  if(line.id_pago||line.id_proveedor||line.id_cargo_recurrente||line.id_cuenta||line.id_agente)throw Error('Movimiento asociado previamente');
  if((await db.query('SELECT 1 FROM tesoreria_pagos_previstos WHERE id_factura_proveedor=$1',[invoiceId])).rowCount)throw Error('La factura ya tiene pagos; revisar antes de crear otro');
  plan.push({line:line.id_linea_banco,invoice:invoiceId,number:invoice.numero_factura_proveedor,provider,amount:invoice.importe_total,date:line.fecha_operativa});
 }
 const directory=path.join(process.env.USERPROFILE,'Downloads','p3erp-cierre-bancos-20261009');await fs.mkdir(directory,{recursive:true});await fs.writeFile(path.join(directory,'documented-expenses-plan.json'),JSON.stringify(plan,null,2));
 if(!apply||!plan.length){await db.query('ROLLBACK');console.log(JSON.stringify({applied:false,plan}));}
 else {
  await fs.writeFile(path.join(directory,`before-documented-expenses-${Date.now()}.json`),JSON.stringify({lines,invoices},null,2),{flag:'wx'});
  const messe=plan.filter(p=>p.provider==='prov_messe_duesseldorf');
  if(messe.length){
   const candidates=(await db.query("SELECT id_proveedor FROM administracion_proveedores WHERE nombre_proveedor ~* '^MESSE D[ÜU]?SSELDORF' OR id_proveedor='prov_messe_duesseldorf'")).rows;
   if(candidates.length>1)throw Error('Proveedor Messe ambiguo');
   const provider=candidates[0]?.id_proveedor||'prov_messe_duesseldorf';
   if(!candidates.length)await db.query("INSERT INTO administracion_proveedores(id_proveedor,nombre_proveedor,nombre_fiscal_proveedor,vat_code,pais_proveedor,moneda_proveedor) VALUES($1,'MESSE DÜSSELDORF GMBH','MESSE DÜSSELDORF GMBH','','','EUR')",[provider]);
   for(const p of messe){p.provider=provider;await db.query('UPDATE administracion_facturas_proveedores SET id_proveedor=$2,updated_at=now() WHERE id_factura_proveedor=$1 AND id_proveedor IS NULL',[p.invoice,provider]);}
  }
  for(const p of plan) {
   const invoice=invoices.find(f=>f.id_factura_proveedor===p.invoice),line=lines.find(l=>l.id_linea_banco===p.line),paymentId=`payment_documented_${p.invoice}`;
   const method=/ADEUDO RECIBO/i.test(line.concepto)?'recibo':'transferencia';
   await db.query(`INSERT INTO tesoreria_pagos_previstos(id_pago,id_factura_proveedor,id_proveedor,cuenta_pago,fecha_pago,bi_pago,total_pago,forma_pago,nombre_planificacion,comentarios) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[paymentId,p.invoice,p.provider,line.banco,p.date,invoice.base_imponible,invoice.importe_total,method,'Pago documentado de factura registrada',`Revisión 09/10/2026: factura ${p.number}; importe exacto y contraste con Juan o referencia bancaria.`]);
   await saveWorkflowExpense(db,{mode:'review'},line,{entityType:'proveedor',entityId:p.provider,paymentId,commentsEdited:true,comments:[line.comentarios,`Revisión documental 09/10/2026: factura ${p.number} (${p.invoice}), importe exacto ${p.amount} €. Pago único; no genera recurrencia.`].filter(Boolean).join('\n')},new Map());
  }
  await db.query('COMMIT');console.log(JSON.stringify({applied:true,plan}));
 }
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
