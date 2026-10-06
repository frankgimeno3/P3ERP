import assert from 'node:assert/strict';
import { cuentaOrderBy } from '../server/features/cuenta/CuentaSorting.js';

for (const column of ['nombre_empresa', 'id_cuenta', 'id_edisoft', 'id_agente', 'pais_cuenta', 'telefono']) {
  for (const direction of ['asc', 'desc']) {
    const order = cuentaOrderBy(column, direction);
    assert(order.includes(` ${direction.toUpperCase()} NULLS LAST`));
    if (column !== 'id_cuenta') assert(order.endsWith(', id_cuenta ASC'));
  }
}
assert(cuentaOrderBy('id_agente', 'asc').includes('nombre_completo_agente'));
assert(cuentaOrderBy('telefono', 'asc').includes("datos_comerciales->>'telefono_principal_cuenta'"));
for (const column of ['', 'constructor', 'nombre_empresa; DROP TABLE comercial_cuentas', undefined]) {
  assert.equal(cuentaOrderBy(column, 'desc'), 'created_at DESC, id_cuenta ASC');
}
assert.equal(cuentaOrderBy('id_cuenta', 'desc; DROP TABLE comercial_cuentas'), 'id_cuenta ASC NULLS LAST');
console.log('PASS account sorting: all six columns, direction, stable pagination and SQL allowlist.');
