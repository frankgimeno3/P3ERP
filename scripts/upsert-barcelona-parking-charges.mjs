// Operational data update. Inspect by default; write only with --apply.
import assert from 'node:assert/strict';
import env from '@next/env';
import { getPgPool } from '../server/database/pgClient.js';
import { insertRecurringCharge, validateRecurringCharge } from '../server/features/prevision/RecurringChargeRepository.js';
import { extendCharge } from '../server/features/prevision/RecurringChargePlanning.js';

env.loadEnvConfig(process.cwd());
const parking = [
  ['BRUC 1PP23A', '0926606DF3802F0003JP', 19.45, 6, 'Bruc,0029, 1PP23A Q.IBI 18,28/Q.TM 1,17/07602196H'],
  ['BRUC 3PP25C', '0926606DF3802F0041BD', 20.21, 3, 'Bruc,0029, 3PP25C Q.IBI 18,91/Q.TM 1,30/07602234Q'],
  ['3PP47C', '0926606DF3802F0053YX', 5.27, 3, 'Bruc,0029, 3PP47C Q.IBI 4,18/Q.TM 1,09/07602246K'],
  ['2PP15B', '0926606DF3802F0112EL', 20.28, 3, 'Bruc,0029, 2PP15B Q.IBI 18,93/Q.TM 1,35/07940322R'],
  ['3PP15C', '0926606DF3802F0120IQ', 20.39, 3, 'Bruc,0029, 3PP15C Q.IBI 19,03/Q.TM 1,36/07940330C'],
  ['3PP16C', '0926606DF3802F0121OW', 20.39, 3, 'Bruc,0029, 3PP16C Q.IBI 19,03/Q.TM 1,36/07940331K'],
  ['PP41', '0928618DF3802H0092OZ', 20.89, 3, 'Bruc,0042, PP41 Q.IBI 19,29/Q.TM 1,60/07928430C'],
  ['- CASP 50 PP5B', '0926605DF3802F0033YI', 12.31, 3, 'Casp,0050, 2PP5 B Q.IBI 11,43/Q.TM 0,88/07602331A'],
  ['-CASP 50, PP6B', '0926605DF3802F0034UO', 11.85, 3, 'Casp,0050, 2PP6 B Q.IBI 10,97/Q.TM 0,88/07602332Y'],
];
const matchesParking = (charge, item) => {
  const text = JSON.stringify(charge.programacion).toUpperCase();
  const plaza = item[0].match(/(?:\dPP\d+[A-Z]|PP\d+[A-Z]?)/)?.[0];
  return text.includes(item[1]) || !!plaza && (text.includes(plaza) || plaza.startsWith('PP') && text.includes(`2${plaza}`));
};
const pool = getPgPool(), db = await pool.connect();
try {
  await db.query('BEGIN');
  await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
  const providers = (await db.query("SELECT id_proveedor FROM administracion_proveedores WHERE lower(btrim(nombre_proveedor))='ajuntament de barcelona'")).rows;
  assert.equal(providers.length, 1, 'Must have exactly one Barcelona supplier');
  const supplier = providers[0].id_proveedor;
  const charges = (await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_proveedor=$1 FOR UPDATE', [supplier])).rows;
  const plan = parking.map(item => {
    const matches = charges.filter(charge => matchesParking(charge, item));
    assert(matches.length <= 1, `Multiple existing charges for ${item[0]}; inspect before changing linked records`);
    return { item, existing: matches[0] };
  });
  const generic = charges.filter(c => c.activo && /IBI PLAZAS DE PARKING/i.test(JSON.stringify(c.programacion)) && !parking.some(item => matchesParking(c, item)));
  for (const charge of generic) {
    const linked = (await db.query(`SELECT EXISTS(SELECT 1 FROM tesoreria_movimientos_bancarios WHERE id_cargo_recurrente=$1)
      OR EXISTS(SELECT 1 FROM tesoreria_vencimientos_aplicaciones a JOIN tesoreria_cargos_vencimientos v ON v.id=a.id_vencimiento WHERE v.id_cargo_recurrente=$1)
      OR EXISTS(SELECT 1 FROM tesoreria_pagos_previstos p JOIN tesoreria_cargos_vencimientos v ON v.id=p.id_vencimiento WHERE v.id_cargo_recurrente=$1)
      OR EXISTS(SELECT 1 FROM administracion_tickets t JOIN tesoreria_cargos_vencimientos v ON v.id=t.id_vencimiento_tarjeta WHERE v.id_cargo_recurrente=$1) AS linked`, [charge.id_cargo_recurrente])).rows[0].linked;
    assert(!linked, 'Generic parking forecast has linked history; cannot replace automatically');
  }
  console.log(JSON.stringify({ parkingCharges: plan.map(({ item, existing }) => ({ name: item[0], amount: item[2], action: existing ? 'update' : 'create', id: existing?.id_cargo_recurrente })), supersededGeneric: generic.map(c => c.id_cargo_recurrente) }));
  if (!process.argv.includes('--apply')) {
    await db.query('ROLLBACK');
  } else {
    for (const charge of generic) {
      // Keep the original record for traceability, but remove its unused forecast.
      await db.query('DELETE FROM tesoreria_cargos_vencimientos WHERE id_cargo_recurrente=$1', [charge.id_cargo_recurrente]);
      await db.query('UPDATE tesoreria_cargos_recurrentes SET activo=false,termina_planificacion=true,updated_at=now() WHERE id_cargo_recurrente=$1', [charge.id_cargo_recurrente]);
    }
    const saved = [];
    for (const { item: [name, rcad, amount, startMonth, detail], existing } of plan) {
      const rule = {
        ...(existing?.programacion?.length === 1 ? { id_regla: existing.programacion[0].id_regla } : {}),
        cada: 3, unidad: 'meses', inicio_dia: 3, inicio_mes: startMonth, inicio_anio: 2025,
        descripcion: `IMPUESTOS AJUNTAMENT DE BARCELONA - IBI PARKING ${name}`,
        comentarios: `IBI+TM{año}-{trimestre}/RCAD:${rcad}/${detail}/TIT: A46449005`,
        referencia_catastral: rcad, contains_iva: false, tipo_iva: 0,
        base_imponible: amount, total_iva: amount,
      };
      const body = { tipo_cargo: 'proveedor', id_proveedor: supplier, tipo_programacion: 'periodicidad', programacion: [rule], termina_planificacion: false, banco_pago: existing?.banco_pago || generic[0]?.banco_pago || null };
      let charge;
      if (existing) {
        const data = validateRecurringCharge(body);
        charge = (await db.query('UPDATE tesoreria_cargos_recurrentes SET activo=true,tipo_programacion=$2,programacion=$3::jsonb,termina_planificacion=false,banco_pago=$4,updated_at=now() WHERE id_cargo_recurrente=$1 RETURNING *', [existing.id_cargo_recurrente, data.tipo_programacion, JSON.stringify(data.programacion), data.banco_pago])).rows[0];
        await db.query(`DELETE FROM tesoreria_cargos_vencimientos v WHERE id_cargo_recurrente=$1
          AND NOT EXISTS(SELECT 1 FROM tesoreria_vencimientos_aplicaciones a WHERE a.id_vencimiento=v.id)
          AND NOT EXISTS(SELECT 1 FROM tesoreria_pagos_previstos p WHERE p.id_vencimiento=v.id)
          AND NOT EXISTS(SELECT 1 FROM administracion_tickets t WHERE t.id_vencimiento_tarjeta=v.id)`, [charge.id_cargo_recurrente]);
        await extendCharge(db, { ...charge, planificado_hasta: null }, undefined, true);
      } else charge = await insertRecurringCharge(db, body);
      saved.push(charge.id_cargo_recurrente);
    }
    const actual = (await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_proveedor=$1 AND activo=true', [supplier])).rows;
    for (const item of parking) assert.equal(actual.filter(c => matchesParking(c, item)).length, 1);
    assert.equal(actual.filter(c => parking.some(item => matchesParking(c, item))).length, 9);
    const year = (await db.query("SELECT sum(importe) total,count(*)::int n FROM tesoreria_cargos_vencimientos WHERE id_cargo_recurrente=ANY($1::bigint[]) AND fecha BETWEEN '2025-01-01' AND '2025-12-31'", [saved])).rows[0];
    assert.equal(Number(year.total), 584.71);
    assert.equal(year.n, 35);
    assert.equal((await db.query('SELECT 1 FROM tesoreria_cargos_vencimientos WHERE id_cargo_recurrente=ANY($1::bigint[]) GROUP BY id_cargo_recurrente,fecha HAVING count(*)>1', [saved])).rowCount, 0);
    await db.query('COMMIT');
    console.log(JSON.stringify({ saved, year2025: year, duplicateCharges: 0, duplicateDueDates: 0 }));
  }
} catch (error) { await db.query('ROLLBACK'); throw error; }
finally { db.release(); await pool.end(); }
