/* eslint-disable @typescript-eslint/no-require-imports -- Isolated routing test with mocked authentication. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { NextRequest } = require('next/server');

function load(file) {
  const mod = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('require', 'module', 'exports', js)(id => {
    if (id.endsWith('/env.js')) return { COGNITO: { CLIENT_ID: 'test', REGION: 'test', USER_POOL_ID: 'test' } };
    if (id.includes('pgClient')) return { getPgPool: () => ({ query: async () => ({ rows: [{ id_agente: 'agent', rol_agente: 'superadmin' }] }) }) };
    if (id === 'jose') return { createRemoteJWKSet: () => ({}), jwtVerify: async token => ({ payload: token === 'id' ? { token_use: 'id', email: 'test@example.test' } : { token_use: 'access', client_id: 'test' } }) };
    if (id.includes('roleAccess')) return { normalizeRole: role => role, canAccessDashboardPath: () => true, canAccessApiPath: () => true };
    if (id.includes('TaskAccess')) return { managesTasks: () => true };
    if (id.includes('loginRedirect')) return load('app/config/loginRedirect.js');
    return require(id);
  }, mod, mod.exports);
  return mod.exports;
}

(async () => {
  const { middleware } = load('middleware.js');
  const base = '/dashboard/direccion/tesoreria/extractos';
  const canonical = `${base}/conciliacion`;
  const cookie = 'CognitoIdentityServiceProvider.test.LastAuthUser=user; CognitoIdentityServiceProvider.test.user.accessToken=access; CognitoIdentityServiceProvider.test.user.idToken=id';
  for (const legacy of ['conciliación', 'conciliaci%C3%B3n', 'conciliaci%c3%b3n']) {
    for (const suffix of ['', '/duplicados', '/banc_sab_26_000.000.314']) {
      for (const headers of [{}, { cookie }]) {
        const response = await middleware(new NextRequest(`http://localhost${base}/${legacy}${suffix}?banco=Sabadell`, { headers }));
        assert.equal(response.status, 308);
        assert.equal(response.headers.get('location'), `http://localhost${canonical}${suffix}?banco=Sabadell`);
      }
    }
  }
  for (const suffix of ['', '/duplicados', '/banc_sab_26_000.000.314']) {
    const url = `http://localhost${canonical}${suffix}?banco=Sabadell`;
    const authenticated = await middleware(new NextRequest(url, { headers: { cookie } }));
    assert.equal(authenticated.headers.get('location'), null, 'Canonical routes must not loop');
    const unauthenticated = await middleware(new NextRequest(url));
    const login = new URL(unauthenticated.headers.get('location'));
    assert.equal(login.pathname, '/');
    assert.equal(login.searchParams.get('next'), `${canonical}${suffix}?banco=Sabadell`);
    const previous = await middleware(new NextRequest(`http://localhost${base}/revision${suffix}?banco=Sabadell`, { headers: { cookie } }));
    assert.equal(previous.headers.get('location'), url);
  }
  for (const suffix of ['/page.tsx', '/duplicados/page.tsx', '/[id_linea_banco]/page.tsx']) {
    assert(fs.existsSync(`app${canonical}${suffix}`), `Missing canonical route ${suffix}`);
  }
  const guides = JSON.parse(fs.readFileSync('app/dashboard/comercial/documentacion/guias.json', 'utf8'));
  assert(guides[canonical], 'Canonical route must retain its user guide');
  console.log('PASS: accented and encoded legacy URLs, subroutes, query preservation, canonical authentication, no loops and route files.');
})().catch(error => { console.error(error); process.exitCode = 1; });
