// Default: preview only. --apply persists the user's confirmed management decisions.
import env from '@next/env';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { getPgPool } from '../server/database/pgClient.js';
import { closeOrderCollection, collectionClosed } from '../server/features/orden/OrderCollectionClosure.js';
import { lockIncome } from '../server/features/prevision/IncomeReconciliation.js';
import { insertRecurringCharge } from '../server/features/prevision/RecurringChargeRepository.js';
import { generateOccurrences } from '../server/features/banco/BankReviewAnalysis.js';

env.loadEnvConfig(process.cwd());
const apply = process.argv.includes('--apply'), pool = getPgPool(), db = await pool.connect();
const directory = path.join(process.env.USERPROFILE, 'Downloads', 'p3erp-cierre-bancos-20261009');
const report = { applied: apply, archived: [], fenzi: null, forecasts: [], sika: null, outstanding: {} };
try {
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
  await db.query("SET LOCAL lock_timeout='5s'");
  await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
  await lockIncome(db);
  const orders = (await db.query(`SELECT o.* FROM tesoreria_ordenes o
    LEFT JOIN administracion_facturas_clientes f ON f.id_factura_cliente=o.id_factura
    WHERE NOT o.cancelada AND (COALESCE(p3_income_date(o.fecha_teorica_cobro),p3_income_date(f.fecha_factura),p3_income_date(f.fecha_emision::text))<'2026-01-01'
      OR o.id_orden='C25.000.168-1/1') ORDER BY o.id_orden FOR UPDATE OF o`)).rows;
  const fenzi = (await db.query("SELECT * FROM tesoreria_ordenes WHERE id_orden='ord_rec_f5427c4ac244682b57b74d15' FOR UPDATE")).rows[0];
  assert(fenzi && Number(fenzi.cobro_total) === 22 && fenzi.datos_importacion?.saldo_pdf?.factura === '526102', 'El saldo de FENZI ha cambiado.');
  const sika = (await db.query(`SELECT o.*,f.numero_factura FROM tesoreria_ordenes o
    JOIN administracion_facturas_clientes f ON f.id_factura_cliente=o.id_factura WHERE f.numero_factura='526117' FOR UPDATE OF o`)).rows;
  assert.equal(sika.length, 1); assert.equal(Number(sika[0].cobro_total), 1210);
  const income = (await db.query(`SELECT m.id_linea_banco,m.concepto,m.importe,m.estado_revision,m.fecha_valor,
    COALESCE(jsonb_agg(a.id_orden) FILTER(WHERE a.id_orden IS NOT NULL),'[]'::jsonb) orders
    FROM tesoreria_movimientos_bancarios m LEFT JOIN tesoreria_aplicaciones_cobro a USING(id_linea_banco)
    WHERE m.banco='Santander' AND m.importe>0 AND (m.concepto ~* 'sika|526117|factoring' OR m.importe=1210)
    GROUP BY m.id_linea_banco ORDER BY p3_income_date(m.fecha_operativa)`)).rows;
  const paidSika = income.some(m => m.estado_revision && m.orders.includes(sika[0].id_orden));
  report.sika = { order: sika[0].id_orden, paid: paidSika, evidence: income };
  // Factoring is the payer's arrangement; our forecast is a bank transfer.
  const tables = ['tesoreria_ordenes','administracion_facturas_clientes','tesoreria_movimientos_bancarios',
    'tesoreria_cargos_recurrentes','tesoreria_cargos_vencimientos','tesoreria_vencimientos_aplicaciones',
    'tesoreria_prevision_juan','tesoreria_prevision_juan_asociaciones','tesoreria_prevision_juan_enlaces'];
  // Snapshot is prepared before any committed mutation and also used for invariants.
  const before = {};
  for (const table of tables) before[table] = (await db.query('SELECT * FROM ' + table)).rows;
  if (apply) {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, `before-${Date.now()}.json`), JSON.stringify(before), { flag: 'wx' });
    await db.query("UPDATE tesoreria_ordenes SET forma_cobro='transferencia',updated_at=now() WHERE id_orden=$1 AND forma_cobro='factoring'", [sika[0].id_orden]);
  }
  for (const order of orders) {
    if (!collectionClosed(order)) {
      report.archived.push(order.id_orden);
      if (apply) await closeOrderCollection(db, order, { type: 'historico_externo', reason: 'Histórico de 2025 o anterior gestionado fuera del ERP. No se requieren extractos, fecha ni conciliación; se conserva el histórico.', actor: '' });
    }
  }
  report.fenzi = { order: fenzi.id_orden, assumed: 22 };
  if (apply && !collectionClosed(fenzi)) await closeOrderCollection(db, fenzi, { reason: 'Diferencia de 22 EUR asumida expresamente. Factura 462 EUR, cobrado 440 EUR; no se reclamará ni se prevé cobrar el saldo.', actor: '' });
  for (const [rowId, pattern, amount, day, description] of [
    ['payments:24','^FINCAS SERRA$',89.02,2,'Comunidad parking Bruc - Fincas Serra'],
    ['payments:25','^TRADIS$',442.74,2,'Comunidad parkings Casp - Tradis'],
    ['payments:35','MUTUA',600,21,'Seguro Mini Countryman - Mutua Madrileña'],
  ]) {
    const providers = (await db.query('SELECT * FROM administracion_proveedores WHERE nombre_proveedor ~* $1', [pattern])).rows;
    assert.equal(providers.length, 1, `Proveedor ambiguo: ${pattern}`);
    const provider = providers[0];
    const association = (await db.query("SELECT * FROM tesoreria_prevision_juan_asociaciones WHERE workbook_id='juan-2026' AND bank='Sabadell' AND row_id=$1 FOR UPDATE", [rowId])).rows[0];
    assert(association, 'La fila de Juan ha cambiado.');
    let charge;
    if (association.charge_ids?.length) {
      assert.equal(association.charge_ids.length, 1);
      charge = (await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=$1', [association.charge_ids[0]])).rows[0];
      assert(charge && charge.id_proveedor === provider.id_proveedor, 'La asociación existente tiene otro proveedor.');
    } else {
      assert(!(await db.query("SELECT 1 FROM tesoreria_cargos_recurrentes WHERE id_proveedor=$1 AND activo AND programacion @> $2::jsonb", [provider.id_proveedor, JSON.stringify([{ descripcion: description }])])).rowCount, 'Existe un cargo sin enlazar: revisa antes de crear otro.');
      if (apply) charge = await insertRecurringCharge(db, { tipo_cargo: 'proveedor', id_proveedor: provider.id_proveedor,
        banco_pago: 'Sabadell', tipo_programacion: 'fechas', termina_planificacion: true,
        programacion: [{ dia: day, mes: 10, anio: 2026, descripcion: description, total_iva: amount, base_imponible: amount, contains_iva: false, tipo_iva: 0 }] });
    }
    report.forecasts.push({ rowId, provider: provider.nombre_proveedor, amount, day, charge: charge?.id_cargo_recurrente || 'new' });
    if (apply) {
      const ids = [String(charge.id_cargo_recurrente)];
      await db.query(`UPDATE tesoreria_prevision_juan_asociaciones SET provider_id=$2,charge_ids=$3::jsonb,status='matched',
        evidence=evidence||jsonb_build_object('reason',$4::text,'conflicts','[]'::jsonb),updated_at=now()
        WHERE workbook_id='juan-2026' AND bank='Sabadell' AND row_id=$1`, [rowId, provider.id_proveedor, JSON.stringify(ids), 'Proveedor confirmado por el usuario; sin IVA. Se conserva la fecha y el importe previsto de Juan, sin extender recurrencias no confirmadas.']);
      await db.query(`INSERT INTO tesoreria_prevision_juan_enlaces(workbook_id,cell_key,section,target_id,status)
        VALUES('juan-2026',$1,'payments',$2,'matched') ON CONFLICT(workbook_id,cell_key) DO UPDATE SET target_id=EXCLUDED.target_id,status='matched'`, [`Sabadell:${rowId}:10`, String(charge.id_cargo_recurrente)]);
      const due = generateOccurrences([charge], '2026-10-01', '2026-10-31').occurrences;
      assert.equal(due.length, 1); assert.equal(Math.round(due[0].importe * 100), Math.round(amount * 100));
      for (const o of due) await db.query(`INSERT INTO tesoreria_cargos_vencimientos(id,id_cargo_recurrente,id_regla,fecha,importe,descripcion,programacion)
        VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT DO NOTHING`, [o.id,o.id_cargo_recurrente,o.id_regla,o.fecha,o.importe,o.descripcion,JSON.stringify(o.programacion)]);
    }
  }
  if (apply) {
    await db.query("UPDATE tesoreria_prevision_juan SET version=version+1,updated_at=now() WHERE id='juan-2026'");
    const fenziInvoice = (await db.query("SELECT * FROM administracion_facturas_clientes WHERE numero_factura='526102'")).rows[0];
    assert.equal(Number(fenziInvoice.importe_total), 462); assert.equal(Number(fenziInvoice.importe_cobrado), 440);
    assert.equal(fenziInvoice.cobrada, false); assert.equal(fenziInvoice.datos_importacion.gestion_cobro_cerrada, true);
    assert.equal((await db.query('SELECT cobrada FROM tesoreria_ordenes WHERE id_orden=$1', [fenzi.id_orden])).rows[0].cobrada, false);
    const after = (await db.query('SELECT * FROM tesoreria_movimientos_bancarios')).rows;
    assert.deepEqual(JSON.parse(JSON.stringify(after)).sort((a,b)=>a.id_linea_banco.localeCompare(b.id_linea_banco)), JSON.parse(JSON.stringify(before.tesoreria_movimientos_bancarios)).sort((a,b)=>a.id_linea_banco.localeCompare(b.id_linea_banco)));
    assert.deepEqual((await db.query("SELECT id_orden,cobro_total,fecha_teorica_cobro,cobrada FROM tesoreria_ordenes WHERE id_orden IN ('C25.000.219-5/6','C25.000.219-6/6') ORDER BY id_orden")).rows,
      before.tesoreria_ordenes.filter(o=>['C25.000.219-5/6','C25.000.219-6/6'].includes(o.id_orden)).sort((a,b)=>a.id_orden.localeCompare(b.id_orden)).map(({id_orden,cobro_total,fecha_teorica_cobro,cobrada})=>({id_orden,cobro_total,fecha_teorica_cobro,cobrada})));
  }
  report.outstanding.movements = (await db.query("SELECT banco,count(*)::int pending FROM tesoreria_movimientos_bancarios WHERE NOT estado_revision AND NOT COALESCE(duplicado_descartado,false) GROUP BY banco")).rows;
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, apply ? 'result.json' : 'preview.json'), JSON.stringify(report, null, 2));
  await db.query(apply ? 'COMMIT' : 'ROLLBACK');
  console.log(JSON.stringify({ applied: apply, archived: report.archived.length, fenzi: report.fenzi, forecasts: report.forecasts, sika: report.sika, directory }));
} catch (error) { await db.query('ROLLBACK'); throw error; }
finally { db.release(); await pool.end(); }
