import fs from 'node:fs';
import env from '@next/env';
import { getPgPool } from '../server/database/pgClient.js';
import { withRuleIds } from '../server/features/banco/BankReviewAnalysis.js';
import { extendCharge, withStart, todayInSpain } from '../server/features/prevision/RecurringChargePlanning.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect();
try {
  if (!process.argv.includes('--apply')) {
    console.log((await db.query("SELECT tipo_cargo,tipo_programacion,count(*)::int FROM tesoreria_cargos_recurrentes WHERE activo GROUP BY 1,2")).rows);
  } else {
    await db.query('BEGIN');
    await db.query("SET LOCAL lock_timeout='3s'");
    await db.query("SET LOCAL statement_timeout='60s'");
    await db.query(fs.readFileSync('database/migrations/20260920_0002_recurring_charge_horizon.sql','utf8'));
    const charges=(await db.query("SELECT * FROM tesoreria_cargos_recurrentes WHERE activo AND tipo_cargo='proveedor' AND planificado_hasta IS NULL ORDER BY id_cargo_recurrente FOR UPDATE")).rows;
    let inserted=0;
    for(const original of charges){
      const charge=withRuleIds(original);
      if(charge.tipo_programacion==='periodicidad')charge.programacion=charge.programacion.map(rule=>withStart(rule,todayInSpain()));
      await db.query('UPDATE tesoreria_cargos_recurrentes SET programacion=$2::jsonb WHERE id_cargo_recurrente=$1',[charge.id_cargo_recurrente,JSON.stringify(charge.programacion)]);
      inserted+=await extendCharge(db,charge);
    }
    await db.query('COMMIT');console.log(JSON.stringify({charges:charges.length,planned:inserted}));
  }
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
