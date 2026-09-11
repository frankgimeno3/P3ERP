// Uses an isolated database adapter; never connects to a database.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Joi from 'joi';
import { randomUUID } from 'node:crypto';

const source = fs.readFileSync('server/features/proveedor/SupplierAdminRepository.js', 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
const names = fs.readFileSync('server/features/proveedor/supplierNames.js', 'utf8').replace(/export /g, '');
const countries = fs.readFileSync('app/data/supplierCountries.js', 'utf8').replace(/export /g, '');
async function create(body, duplicate = false) {
  const calls = [];
  const db = { release() {}, async query(sql, values) {
    calls.push({ sql, values });
    if (sql.startsWith('SELECT id_proveedor')) return { rows: duplicate ? [{ id_proveedor: 'existing' }] : [] };
    if (sql.startsWith('INSERT')) return { rows: [{ id_proveedor: values[0], vat_code: values[3] }] };
    return { rows: [] };
  } };
  const createSupplier = new Function('Joi', 'randomUUID', 'getPgPool', names + '\n' + countries + '\n' + source + '\nreturn createSupplier;')(Joi, randomUUID, () => ({ connect: async () => db }));
  try { return { result: await createSupplier(body), calls }; }
  catch (error) { return { error, calls }; }
}
const draft = { nombre_proveedor: ' New supplier ', nombre_fiscal_proveedor: 'Legal name', vat_code: '', pais_proveedor: 'España', moneda_proveedor: 'eur' };
let result = await create(draft);
assert(!result.error, result.error?.stack);
assert(result.result.id_proveedor.startsWith('prov_'));
assert.equal(result.result.vat_code, '');
assert.equal(result.calls.find(c => c.sql.startsWith('INSERT')).values[5], 'EUR');
assert(result.calls.some(c => c.sql === 'COMMIT'));
result = await create({ ...draft, vat_code: 'es-b 123' }, true);
assert.equal(result.error.status, 409);
assert.equal(result.calls.find(c => c.sql.startsWith('SELECT')).values[1], 'ESB123');
assert(!result.calls.some(c => c.sql.startsWith('INSERT')));
assert(result.calls.some(c => c.sql === 'ROLLBACK'));
for (const invalid of [{ nombre_proveedor: ' ' }, { moneda_proveedor: 'EURO' }, { moneda_proveedor: '' }, { vat_code: 'x'.repeat(301) }, { pais_proveedor: '' }, { pais_proveedor: 'Un país inventado' }]) {
  result = await create({ ...draft, ...invalid });
  assert(result.error);
  assert(!result.calls.some(c => c.sql.startsWith('INSERT')));
}
console.log('8 supplier-creation scenarios passed (optional VAT, duplicate rollback, required catalog country and invalid fields).');
