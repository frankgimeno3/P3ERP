import fs from 'node:fs/promises';import env from '@next/env';import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());const pool=getPgPool();
const data=JSON.parse(await fs.readFile('C:/Users/frank/Downloads/p3erp-cierre-bancos-20261009/income-and-casp-evidence.json','utf8'));
try {
const invoices=(await pool.query('SELECT * FROM administracion_facturas_clientes')).rows;
const contracts=(await pool.query("SELECT * FROM comercial_contratos WHERE id_contrato='C25.000.162' OR id_cuenta_contrato IN ('ACC2968','ACC1929')")).rows;
const allLines=(await pool.query('SELECT * FROM tesoreria_movimientos_bancarios WHERE importe>0')).rows;
const remesas=(await pool.query('SELECT * FROM prevision_remesas_resumen')).rows;
const findings=data.pending.map(line=>({line:line.id_linea_banco,amount:line.importe,concept:line.concepto,
 invoices:invoices.filter(f=>Math.abs(Number(f.importe_total)-Number(line.importe))<0.03).map(f=>({id:f.id_factura_cliente,number:f.numero_factura,account:f.id_cuenta,amount:f.importe_total,date:f.fecha_factura,paid:f.cobrada})),
 duplicates:allLines.filter(m=>m.id_linea_banco!==line.id_linea_banco&&m.banco===line.banco&&m.fecha_operativa===line.fecha_operativa&&Number(m.importe)===Number(line.importe)).map(m=>({id:m.id_linea_banco,reviewed:m.estado_revision,concept:m.concepto})),
 remesas:remesas.filter(r=>Math.abs(Number(r.importe_total??r.total)-Number(line.importe))<0.03)}));
console.log(JSON.stringify({findings,contracts,remesas}));
await fs.writeFile('C:/Users/frank/Downloads/p3erp-cierre-bancos-20261009/income-matching-second-pass.json',JSON.stringify({findings,contracts,remesas},null,2));
}finally{await pool.end();}
