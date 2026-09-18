// Exercises the route with an isolated database adapter; never connects to a database.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('app/api/v1/direccion/bancos/revision/route.js', 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
const repository = fs.readFileSync('server/features/prevision/RecurringChargeRepository.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
async function run({ line = {}, linked = false, entity = true, action = 'assign', entityType = 'nomina', existingCharge = true, extra = {} } = {}) {
  const calls = [];
  const db = { release() {}, async query(sql, values) {
    calls.push({ sql, values });
    if (sql.startsWith('SELECT id_agente') || sql.startsWith('SELECT id_proveedor') || sql.startsWith('SELECT id_cuenta')) return { rowCount: entity ? 1 : 0 };
    if (sql.startsWith('SELECT * FROM tesoreria_movimientos_bancarios')) return { rows: [{ id_linea_banco: 'bank-1', importe: -1000, ...line }] };
    if (sql.startsWith('SELECT id_transferencia')) return { rows: linked ? [{ id_transferencia: 'bank-1' }] : [] };
    if (sql.startsWith('SELECT * FROM tesoreria_cargos_recurrentes')) return { rows: existingCharge ? [{ id_cargo_recurrente: 1 }] : [] };
    if (sql.startsWith('INSERT INTO tesoreria_cargos_recurrentes')) return { rows: [{ id_cargo_recurrente: 2 }] };
    return { rows: [] };
  } };
  const context = vm.createContext({ NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) }, getPgPool: () => ({ connect: async () => db }) });
  vm.runInContext(repository + '\n' + source, context);
  const response = await context.PUT({ json: async () => ({ ids: ['bank-1'], action, entityType, entityId: 'person-1', ...extra }) });
  return { response, calls };
}
let result = await run();
assert.equal(result.response.status, 200);
assert.deepEqual(Array.from(result.calls.find(c => c.sql.startsWith('UPDATE')).values).slice(0, 3), [null, null, 'person-1']);
assert(result.calls.some(c => c.sql === 'COMMIT'));
result = await run({ action: 'validate-assignment' });
assert.equal(result.response.body.ok, true);
assert(!result.calls.some(c => c.sql.startsWith('UPDATE')));
for (const scenario of [{ line: { importe: 100 } }, { entity: false }, { line: { id_agente: 'other' } }, { line: { id_proveedor: 'supplier' } }, { line: { id_pago: 'payment' } }, { linked: true }]) {
  result = await run(scenario);
  assert(result.response.status >= 400);
  assert(!result.calls.some(c => c.sql.startsWith('UPDATE')));
  assert(result.calls.some(c => c.sql === 'ROLLBACK'));
}
for (const entityType of ['proveedor', 'cliente']) {
  result = await run({ entityType });
  assert.equal(result.response.status, 200);
  const values = result.calls.find(c => c.sql.startsWith('UPDATE')).values;
  assert.equal(values[entityType === 'proveedor' ? 0 : 1], 'person-1');
  assert.equal(values[2], null);
}
assert.equal((await run({ action: 'validate-assignment' })).response.body.needsPayrollCharge, false);
assert.equal((await run({ action: 'validate-assignment', existingCharge: false })).response.body.needsPayrollCharge, true);
assert.equal((await run({ existingCharge: false })).response.status, 409);
assert.equal((await run({ existingCharge: false, extra: { skipPayrollCharge: true } })).response.status, 200);
const cargo_previsto = { tipo_programacion: 'periodicidad', programacion: [{ cada: 1, unidad: 'meses', total_iva: 1500 }] };
result = await run({ existingCharge: false, extra: { cargo_previsto } });
assert.equal(result.response.status, 200);
assert.equal(result.calls.filter(c => c.sql.startsWith('INSERT INTO tesoreria_cargos_recurrentes')).length, 1);
assert(result.calls.some(c => c.sql.startsWith('UPDATE')));
assert.equal((await run({ existingCharge: true, extra: { cargo_previsto } })).calls.filter(c => c.sql.startsWith('INSERT')).length, 0);
result = await run({ existingCharge: false, extra: { cargo_previsto: { ...cargo_previsto, programacion: [{ cada: 1, unidad: 'meses', total_iva: -1 }] } } });
assert.equal(result.response.status, 400);
assert(!result.calls.some(c => c.sql.startsWith('UPDATE')));
assert(result.calls.some(c => c.sql === 'ROLLBACK'));
console.log('17 common-assignment scenarios passed, including conditional payroll forecasts and atomic validation.');
