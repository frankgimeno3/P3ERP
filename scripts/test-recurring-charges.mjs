// Isolated schema and transaction: all test records and DDL are rolled back.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import nextEnv from '@next/env';
import { randomUUID } from 'node:crypto';
import { getPgPool } from '../server/database/pgClient.js';
import { insertRecurringCharge, findPayrollCharge, validateRecurringCharge } from '../server/features/prevision/RecurringChargeRepository.js';

nextEnv.loadEnvConfig(process.cwd());
const pool = getPgPool(), db = await pool.connect();
const schema = `recurring_test_${randomUUID().replaceAll('-', '')}`;
const draft = { tipo_cargo: 'nomina', id_agente: 'employee', tipo_programacion: 'periodicidad', programacion: [{ cada: 1, unidad: 'meses', total_iva: 1800 }] };
try {
  await db.query('BEGIN');
  await db.query(`CREATE SCHEMA ${schema}`);
  await db.query(`SET LOCAL search_path TO ${schema}`);
  await db.query(`CREATE TABLE agentes_db(id_agente TEXT PRIMARY KEY,is_empleado_account BOOLEAN);
    CREATE TABLE proveedores_db(id_proveedor TEXT PRIMARY KEY);
    CREATE TABLE cargos_recurrentes(id_cargo_recurrente BIGSERIAL PRIMARY KEY,id_proveedor TEXT REFERENCES proveedores_db(id_proveedor),tipo_programacion TEXT,programacion JSONB,activo BOOLEAN DEFAULT TRUE,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
    INSERT INTO agentes_db VALUES ('employee',true),('not-employee',false);
    INSERT INTO proveedores_db VALUES ('supplier');`);
  const migration = fs.readFileSync('database/migrations/20260907_0001_payroll_recurring_charges.sql', 'utf8');
  await db.query(migration);
  await db.query(migration);
  assert.equal(await findPayrollCharge(db, 'employee'), null);
  const created = await insertRecurringCharge(db, draft);
  assert.equal(created.id_agente, 'employee');
  assert.equal(created.id_proveedor, null);
  assert.equal(created.programacion[0].base_imponible, 0);
  assert.equal(created.programacion[0].total_iva, 1800);
  assert.equal((await findPayrollCharge(db, 'employee')).id_cargo_recurrente, created.id_cargo_recurrente);
  await assert.rejects(insertRecurringCharge(db, draft), error => error.status === 409);
  assert.equal((await insertRecurringCharge(db, draft, true)).id_cargo_recurrente, created.id_cargo_recurrente);
  await assert.rejects(insertRecurringCharge(db, { ...draft, id_agente: 'not-employee' }), /empleado/);
  await assert.rejects(insertRecurringCharge(db, { ...draft, id_agente: 'missing' }), /empleado/);
  for (const amount of [-1, 0, Infinity, 'invalid']) assert.throws(() => validateRecurringCharge({ ...draft, programacion: [{ cada: 1, unidad: 'meses', total_iva: amount }] }));
  assert.throws(() => validateRecurringCharge({ ...draft, id_proveedor: 'supplier' }));
  assert.throws(() => validateRecurringCharge({ ...draft, tipo_programacion: 'fechas', programacion: [{ dia: 31, mes: 2, anio: 2026, total_iva: 100 }] }));
  const supplier = await insertRecurringCharge(db, { tipo_programacion: 'fechas', id_proveedor: 'supplier', programacion: [{ dia: 7, mes: 9, anio: 2026, base_imponible: 100, total_iva: 121 }] });
  assert.equal(supplier.tipo_cargo, 'proveedor');
  assert.equal(supplier.id_agente, null);
  assert.equal(supplier.programacion[0].base_imponible, 100);
  await db.query('UPDATE cargos_recurrentes SET activo=false WHERE id_agente=$1', ['employee']);
  assert.equal(await findPayrollCharge(db, 'employee'), null);
  assert.notEqual((await insertRecurringCharge(db, draft)).id_cargo_recurrente, created.id_cargo_recurrente);
  console.log('Database checks passed: migration, payroll ownership, amounts, duplicate prevention, suppliers, dates and inactive charges.');
} finally { await db.query('ROLLBACK'); db.release(); await pool.end(); }
