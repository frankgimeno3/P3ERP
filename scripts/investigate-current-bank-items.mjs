// Read-only evidence for the remaining movements. No proposed association is applied.
import env from '@next/env';
import fs from 'node:fs/promises';
import path from 'node:path';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());const pool=getPgPool();
const accounts={CRISTALMAX:'ACC1798',MAVHISA:'ACC1756',TECNOPERFILES:'ACC1759',HANJIANG:'ACC2475','DIAMON-FUSION':'ACC1727','FDS GLASS':'ACC145','TUNG CHANG':'ACC1773',MAZZAROPPI:'ACC1707'};
try {
 const lines=(await pool.query('SELECT * FROM tesoreria_movimientos_bancarios WHERE NOT estado_revision AND NOT duplicado_descartado ORDER BY id_linea_banco')).rows;
 const orders=(await pool.query(`SELECT o.id_orden,o.id_factura,f.numero_factura,o.fecha_teorica_cobro,o.fecha_real_cobro,o.cobro_total,o.cobrada,o.banco_cobro,o.forma_cobro,o.cancelada,o.datos_importacion,
  COALESCE(NULLIF(o.id_cuenta,''),c.id_cuenta_contrato,f.id_cuenta) AS account,
  (SELECT jsonb_agg(a.id_linea_banco) FROM tesoreria_aplicaciones_cobro a WHERE a.id_orden=o.id_orden) AS bankLines
  FROM tesoreria_ordenes o LEFT JOIN comercial_contratos c USING(id_contrato) LEFT JOIN administracion_facturas_clientes f ON f.id_factura_cliente=o.id_factura`)).rows;
 const findings=lines.map(line=>{
  const name=Object.keys(accounts).find(key=>line.concepto.toUpperCase().includes(key)),id=name?accounts[name]:null;
  const candidates=id?orders.filter(o=>o.account===id&&!o.cancelada):[];
  return {line,account:id,candidates:candidates.map(o=>({...o,exactAmount:Math.round(Number(o.cobro_total)*100)===Math.round(Number(line.importe)*100)}))};
 });
 const books=(await pool.query("SELECT id,sheets FROM tesoreria_prevision_juan WHERE id='juan-2026'")).rows;
 const expenses=books.flatMap(b=>b.sheets.flatMap(s=>s.payments.filter(r=>r.values.some(v=>[129869,138532,151207,16446,15598,14750,84458,561604].includes(v))).map(r=>({bank:s.bank,id:r.id,label:r.label,values:r.values}))));
 const directory=path.join(process.env.USERPROFILE,'Downloads','p3erp-cierre-bancos-20261009');
 await fs.mkdir(directory,{recursive:true});await fs.writeFile(path.join(directory,'remaining-evidence.json'),JSON.stringify({findings,expenses},null,2));
 console.log(JSON.stringify({counts:{pending:lines.length,income:lines.filter(l=>Number(l.importe)>0).length,expenses:lines.filter(l=>Number(l.importe)<0).length},expenses,collections:findings.filter(f=>f.account).map(f=>({id:f.line.id_linea_banco,date:f.line.fecha_operativa,amount:f.line.importe,account:f.account,candidates:f.candidates.filter(o=>o.exactAmount).map(o=>({order:o.id_orden,amount:o.cobro_total,due:o.fecha_teorica_cobro,paid:o.fecha_real_cobro,recordedPaid:o.cobrada,bank:o.banco_cobro,linked:o.bankLines,closed:o.datos_importacion?.cierre_cobro?.activo}))})),report:path.join(directory,'remaining-evidence.json')}));
}finally{await pool.end();}
