import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {getLiquidityForecast,forecastPayroll} from '../server/features/prevision/LiquidityRepository.js';
env.loadEnvConfig(process.cwd());
const salary={id_cargo_recurrente:1,tipo_cargo:'nomina',id_agente:'employee',activo:true,created_at:'2026-09-11',tipo_programacion:'periodicidad',programacion:[{cada:1,unidad:'meses',total_iva:1000}]};
const actual={id_empleado:'employee',anio:2026,mes:9,estado:'pendiente',importe_neto:1200};
const advance={...actual,estado:'pagado',importe_neto:200};
assert.equal(forecastPayroll([salary],[actual],[advance],'2026-09-22','2026-09-29').length,0);
assert.deepEqual(forecastPayroll([salary],[actual],[advance],'2026-09-22','2026-10-31').map(p=>p.amount),[1000,1000]);
assert.equal(forecastPayroll([salary],[{...actual,estado:'pagado'}],[advance],'2026-09-22','2026-09-30')[0].amount,0);
assert.equal(forecastPayroll([salary],[],[],'2026-10-31','2026-10-31')[0].amount,1000);
const pool=getPgPool(),db=await pool.connect();
try {
  await db.query('BEGIN');
  const schema='test_liquidity_'+randomUUID().replaceAll('-','');
  await db.query('CREATE SCHEMA '+schema);
  await db.query('SET LOCAL search_path TO '+schema+',public');
  for(const table of ['tesoreria_movimientos_bancarios','tesoreria_ordenes','tesoreria_aplicaciones_cobro','tesoreria_pagos_previstos','tesoreria_cargos_recurrentes','tesoreria_cargos_vencimientos','tesoreria_vencimientos_aplicaciones','laboral_nominas','laboral_anticipos']) await db.query('CREATE TABLE '+schema+'.'+table+' (LIKE public.'+table+' INCLUDING ALL)');
  const {today,until}=(await db.query("SELECT to_char((now() AT TIME ZONE 'Europe/Madrid')::date,'YYYY-MM-DD') today,to_char((now() AT TIME ZONE 'Europe/Madrid')::date+1,'DD/MM/YYYY') until")).rows[0];
  await db.query(`INSERT INTO tesoreria_movimientos_bancarios(id_linea_banco,banco,saldo,importe,fecha_valor) VALUES
    ('banc_sab_26_000.999.999','Sabadell',5,0,'01/01/2000'),('banc_sab_26_000.000.001','Sabadell',1000,0,$1),('banc_san_26_000.000.001','Santander',500,0,$1)`,[today]);
  await db.query("INSERT INTO tesoreria_ordenes(id_orden,cobro_total,banco_cobro,fecha_teorica_cobro) VALUES('income',100,'Sabadell',$1)",[today]);
  await db.query("INSERT INTO tesoreria_pagos_previstos(id_pago,total_pago,cuenta_pago,fecha_pago) VALUES('payment',200,'Santander',$1)",[today]);
  await db.query("INSERT INTO tesoreria_cargos_recurrentes(id_cargo_recurrente,tipo_cargo,banco_pago,tipo_programacion,programacion) VALUES(991,'proveedor','Sabadell','fechas','[]'),(992,'otro',NULL,'fechas','[]')");
  await db.query("INSERT INTO tesoreria_cargos_vencimientos(id,id_cargo_recurrente,id_regla,fecha,importe,programacion) VALUES('due1',991,'rule1',$1,100,'{}'),('due2',992,'rule2',$1,40,'{}')",[today]);
  await db.query(`INSERT INTO tesoreria_movimientos_bancarios(id_linea_banco,importe,id_pago,id_cargo_recurrente,estado_revision,banco) VALUES('banc_san_26_000.000.002',-80,'payment',NULL,true,'Santander'),('banc_sab_26_000.000.002',-30,NULL,991,true,'Sabadell'),('banc_sab_26_000.000.003',20,NULL,NULL,true,'Sabadell')`);
  await db.query("INSERT INTO tesoreria_vencimientos_aplicaciones(id_linea_banco,id_vencimiento,importe) VALUES('banc_sab_26_000.000.002','due1',30)");
  await db.query("INSERT INTO tesoreria_aplicaciones_cobro(id_linea_banco,id_orden,importe) VALUES('banc_sab_26_000.000.003','income',20)");
  const adapter={query:(...args)=>db.query(...args)};
  const result=await getLiquidityForecast(until,adapter);
  assert.equal(result.Sabadell,1010);assert.equal(result.Santander,380);assert.equal(result['Sin asignar'],-40);assert.equal(result.total,1350);
  await db.query("UPDATE tesoreria_vencimientos_aplicaciones SET importe=100 WHERE id_vencimiento='due1'; UPDATE tesoreria_movimientos_bancarios SET importe=-100 WHERE id_linea_banco='banc_sab_26_000.000.002'");
  assert.equal((await getLiquidityForecast(until,adapter)).Sabadell,1080);
  await db.query('UPDATE tesoreria_cargos_recurrentes SET activo=false WHERE id_cargo_recurrente=992');
  assert.equal((await getLiquidityForecast(until,adapter))['Sin asignar'],0);
  console.log('PASS: chronological balances, partial receipts/payments, recurring due applications, Other, inactive charges, unassigned banks, payroll/advance deduplication and month-end estimates.');
} finally {await db.query('ROLLBACK');db.release();await pool.end();}
