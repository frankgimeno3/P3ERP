import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function load(path) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const compiledModule = { exports: {} };
  new Function('exports', 'module', code)(compiledModule.exports, compiledModule);
  return compiledModule.exports;
}

const { isCommercialAgent } = load('app/config/commercialAgents.js');
const { normalizeRole, roleRank, canAccessApiPath, canViewModule } = load('app/config/roleAccess.ts');
for (const rol_agente of ['comercial', 'direccion', 'administracion', 'operaciones', 'superadmin', ' Comercial ']) {
  assert(isCommercialAgent({ rol_agente }), rol_agente);
}
for (const rol_agente of ['base', '', null, 'desconocido']) assert(!isCommercialAgent({ rol_agente }));
assert(!isCommercialAgent(null));
assert.equal(normalizeRole('COMERCIAL'), 'comercial');
assert(roleRank.base < roleRank.comercial && roleRank.comercial < roleRank.administracion);
assert(canViewModule('comercial', 'comercial'));
for (const moduleId of ['administracion', 'operaciones', 'direccion']) assert(!canViewModule('comercial', moduleId));
assert(canAccessApiPath('comercial', '/api/v1/admin/agentes', 'GET'));
assert(!canAccessApiPath('comercial', '/api/v1/admin/agentes/123', 'PUT'));
assert(!canAccessApiPath('comercial', '/api/v1/admin/roles', 'PUT'));

async function main() {
  const { assertCommercialAgent } = await import('../server/features/agente/CommercialAgent.js');
  let calls = 0;
  const rejected = { query: async () => { calls++; return { rowCount: 0 }; } };
  await assert.rejects(assertCommercialAgent(rejected, 'base-agent'), { status: 400 });
  assert.equal(calls, 1);
  await assertCommercialAgent(rejected, 'base-agent', 'base-agent');
  await assertCommercialAgent(rejected, '');
  assert.equal(calls, 1, 'Historical and empty assignments must not trigger validation');
  await assertCommercialAgent({ query: async (_sql, params) => {
    assert.equal(params[0], 'commercial-agent');
    assert(params[1].includes('comercial'));
    assert(!params[1].includes('base'));
    return { rowCount: 1 };
  } }, 'commercial-agent');
  console.log('PASS commercial agents: selection, role hierarchy, API access and assignment validation.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
