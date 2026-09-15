// Isolated adapter: no connection to the application database.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('server/features/banco/BancoRepository.js', 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
const movement = (date, concept = 'Transferencia') => ({ fecha_operativa: date, fecha_valor: date, concepto: concept, importe: -100, saldo: 500 });
for (const [bank, code] of [['Sabadell', 'sab'], ['Santander', 'san']]) {
  const original = { ...movement('10/09/2026'), banco: bank, id_linea_banco: `banc_${code}_26_000.000.304`, estado_revision: true, id_agente: 'employee', nomina_revision: { tipo: 'completa' }, comentarios: 'Preservar' };
  let stored = [structuredClone(original)], transaction;
  let failInsert = false, released = false;
  const client = { release() { released = true; }, async query(sql, values) {
    if (sql === 'BEGIN') transaction = structuredClone(stored);
    else if (sql === 'ROLLBACK') stored = transaction;
    else if (sql.startsWith('SELECT *')) return { rows: structuredClone(stored) };
    else if (/^(DELETE|UPDATE)/.test(sql)) throw new Error('Existing movements must never be mutated');
    else if (sql.startsWith('INSERT')) {
      if (failInsert) throw new Error('Simulated insertion failure');
      assert(!stored.some(line => line.id_linea_banco === values[0]));
      stored.push(Object.fromEntries(['id_linea_banco', 'banco', 'fecha_operativa', 'fecha_valor', 'concepto', 'importe', 'saldo'].map((key, i) => [key, values[i]])));
    }
    return { rows: [] };
  } };
  const context = vm.createContext({ getPgPool: () => ({ connect: async () => client }) });
  vm.runInContext(source, context);
  const incoming = [movement('11/09/2026'), movement('10/09/2026'), movement('10/09/2026', 'Otro'), movement('09/09/2026'), movement('31/12/2025')];
  assert.equal((await context.reconcileLineasBanco(bank, incoming)).creadas, 4);
  assert.deepEqual(stored[0], original);
  assert(stored.some(line => line.id_linea_banco === `banc_${code}_25_000.000.001`));
  assert(stored.some(line => line.id_linea_banco === `banc_${code}_26_000.000.305`));
  assert.equal((await context.reconcileLineasBanco(bank, incoming.toReversed())).creadas, 0);
  assert.equal((await context.reconcileLineasBanco(bank, [movement('10/09/2026'), movement('10/09/2026')])).creadas, 1);
  assert.equal((await context.reconcileLineasBanco(bank, [movement('10/09/2026'), movement('10/09/2026')])).creadas, 0);
  const beforeFailure = structuredClone(stored);
  failInsert = true;
  await assert.rejects(context.reconcileLineasBanco(bank, [movement('12/09/2026')]), /Simulated/);
  assert.deepEqual(stored, beforeFailure);
  assert(released);
}
console.log('Bank import passed: stable IDs and payroll metadata, backfill, repeat imports, multiplicity, yearly counters and rollback for both banks.');
