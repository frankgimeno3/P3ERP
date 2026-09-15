/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS test harness for TSX module mocks. */
// Run with P3_SELECTOR_TEST_MODULES pointing to the isolated jsdom node_modules.
// No application server or database is used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { JSDOM } = require(path.join(process.env.P3_SELECTOR_TEST_MODULES, 'jsdom'));
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
Object.assign(global, { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, IS_REACT_ACT_ENVIRONMENT: true });
const React = require('react');
const { createRoot } = require('react-dom/client');
const requests = [], uploads = [], consoleErrors = [];
const service = {
  getOrdenes: tab => new Promise((resolve, reject) => requests.push({ tab, resolve, reject })),
  importRecibos: (file, action) => new Promise((resolve, reject) => uploads.push({ file, action, resolve, reject })),
};
function load(file) {
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', js)(id => {
    if (id === 'next/navigation') return { useRouter: () => ({ push() {} }) };
    if (id.includes('PrevisionIngresosService')) return { PrevisionIngresosService: service };
    if (id.includes('MiddleNav') || id.includes('AdditionalIncomeWizard')) return { __esModule: true, default: () => null };
    if (id === './ReceiptExcelModal') return load(path.join(path.dirname(file), 'ReceiptExcelModal.tsx'));
    return require(id);
  }, mod, mod.exports);
  return mod.exports;
}
const Page = load('app/dashboard/direccion/previsiones/prevision-ingresos/page.tsx').default;
const root = createRoot(document.getElementById('root'));
const originalError = console.error;
console.error = (...args) => consoleErrors.push(args.join(' '));
const click = label => React.act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === label).click());
const settle = (index, data) => React.act(async () => requests[index].resolve(data));
const type = (input, text) => React.act(async () => {
  Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, text);
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
});
const body = () => document.querySelector('tbody').textContent;
const selectFile = async name => {
  const input = document.querySelector('input[type="file"]');
  Object.defineProperty(input, 'files', { configurable: true, value: [new dom.window.File(['excel'], name)] });
  await React.act(async () => input.dispatchEvent(new dom.window.Event('change', { bubbles: true })));
};
(async () => {
  await React.act(async () => root.render(React.createElement(Page)));
  assert.deepEqual([...document.querySelectorAll('[role="tab"]')].map(tab => tab.textContent), ['Todos', 'Recibos', 'Transfers', 'Remesas']);
  assert.equal(requests[0].tab, 'todos');
  assert.equal(document.querySelector('[role="tab"][aria-selected="true"]').textContent, 'Todos');
  const rows = [{ id_orden: 'REC-1', cliente: 'Álvaro', id_factura: '526058', fecha_teorica_cobro: '14/09/2026' }, { id_orden: 'TRANSFER-1', cliente: 'Otro cliente', id_factura: '999', fecha_teorica_cobro: '15/09/2026' }];
  await settle(0, rows);
  assert.equal(document.querySelectorAll('tbody tr').length, 2);
  assert.equal(document.querySelectorAll('input[type="date"]').length, 0);
  assert.equal(document.querySelectorAll('input[type="search"]').length + document.querySelectorAll('fieldset').length, document.querySelectorAll('thead th').length);
  assert.equal(document.querySelector('div[style]').style.gridTemplateRows, 'repeat(2, auto)');
  await type(document.querySelector('input[placeholder="Filtrar cliente"]'), 'alvaro');
  assert.match(body(), /REC-1/); assert.ok(!body().includes('TRANSFER-1'));
  await type(document.querySelector('input[placeholder="Filtrar factura"]'), '999');
  assert.match(body(), /No hay resultados/);
  await click('Limpiar filtros');
  await type(document.querySelector('input[aria-label="Fecha teórica: dd"]'), '15');
  assert.match(body(), /TRANSFER-1/); assert.ok(!body().includes('REC-1'));
  await click('Remesas');
  assert.match(body(), /Cargando remesas/);
  assert.ok(![...document.querySelectorAll('button')].some(button => button.textContent === 'Agregar ingreso sin contrato'));
  await click('Transfers'); await settle(2, [rows[1]]); await settle(1, [{ id_remesa: 'LATE' }]);
  assert.match(body(), /TRANSFER-1/); assert.ok(!body().includes('LATE'));
  await click('Remesas'); await settle(3, [{ id_remesa: 'REM-1', created_at: null, updated_at: 'bad date' }]);
  assert.match(body(), /REM-1/);
  await click('Todos'); await settle(4, rows);
  await click('Agregar excel de recibos');
  assert(document.querySelector('[role="dialog"]'));
  assert.equal(document.activeElement.getAttribute('aria-label'), 'Cerrar');
  assert.match(document.querySelector('[role="dialog"]').textContent, /526058-004/);
  await selectFile('recibos.xlsx'); await click('Revisar Excel');
  assert.equal(uploads[0].action, 'preview');
  const preview = { total: 1, rows: [{ numero_recibo: '526058-004', numero_factura: '526058', numero_cobro: 4 }] };
  await React.act(async () => uploads[0].resolve(preview));
  assert.match(document.querySelector('[role="dialog"]').textContent, /Factura detectada/);
  await selectFile('otro.xlsx');
  assert.ok(![...document.querySelectorAll('button')].some(button => button.textContent === 'Confirmar importación'));
  await click('Revisar Excel'); await React.act(async () => uploads[1].reject({ message: 'Fila 2: Número de recibo obligatorio' }));
  assert.match(document.querySelector('[role="alert"]').textContent, /Fila 2/);
  await click('Revisar Excel'); await React.act(async () => uploads[2].resolve(preview));
  await click('Confirmar importación'); assert.equal(uploads[3].action, 'import');
  await React.act(async () => uploads[3].resolve({ imported: 1 }));
  assert.equal(document.querySelector('[role="dialog"]'), null);
  assert.match(document.querySelector('[role="status"]').textContent, /1 recibos importados/);
  assert.equal(requests[5].tab, 'todos');
  await settle(5, rows);
  await click('Agregar excel de recibos');
  await React.act(async () => window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape' })));
  assert.equal(document.querySelector('[role="dialog"]'), null);
  await click('Agregar excel de recibos');
  await React.act(async () => document.querySelector('button[aria-label="Cerrar"]').click());
  assert.equal(document.querySelector('[role="dialog"]'), null);
  assert.equal(consoleErrors.length, 0, consoleErrors.join('\n'));
  await React.act(async () => root.unmount());
  console.error = originalError; dom.window.close();
  console.log('PASS: Todos, per-field filters in two rows, separate dates, tab races, button visibility, Excel preview, errors, file replacement, confirm/reload, Escape and close button.');
})().catch(error => { console.error = originalError; console.error(error); process.exitCode = 1; });
