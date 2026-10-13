import assert from 'node:assert/strict';
import fs from 'node:fs';

for (const kind of ['empleados', 'nominas', 'anticipos']) {
  const source = fs.readFileSync(`app/api/v1/contabilidad/revision/${kind}/route.js`, 'utf8');
  const match = source.match(/import \{ GET as laboralGet \} from '([^']+)'/);
  assert.ok(match);
  assert.ok(fs.existsSync(match[1].replace('@/', '')));
  const stub = 'async function laboralGet(request, {params}) { return {method: request.method, path: (await params).path}; }';
  const module = await import(`data:text/javascript;base64,${Buffer.from(source.replace(match[0], stub)).toString('base64')}`);
  assert.deepEqual(await module.GET(new Request('https://erp.test/api')), {method: 'GET', path: [kind]});
  for (const method of ['POST', 'PUT', 'DELETE']) assert.equal(module[method], undefined);
}
console.log('PASS: recursos de revisión contable reutilizan la ruta laboral existente, fijan sus parámetros y solo permiten lectura.');
