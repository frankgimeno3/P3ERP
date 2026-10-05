/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
const { JSDOM } = require(process.env.P3_SELECTOR_TEST_MODULES ? path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom') : 'jsdom');
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
Object.assign(global, { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, IS_REACT_ACT_ENVIRONMENT: true });
const React = require('react'), { act } = React, { createRoot } = require('react-dom/client');
function load(file) {
  const filename = path.resolve(file), m = new Module(filename, module); m.filename = filename; m.paths = module.paths;
  const original = m.require.bind(m);
  m.require = id => id.startsWith('@/') ? load(id.slice(2) + '.tsx') : original(id);
  m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, filename);
  return m.exports;
}
const Pending = load('app/dashboard/administracion/proveedores/SupplierPendingCharges.tsx').default;
const root = createRoot(document.getElementById('root'));
const charge = { id_cargo_recurrente: 'quarterly', tipo_programacion: 'intervalo', programacion: [{ descripcion: 'COSVA', total_iva: 24.75, cada: 3, unidad: 'meses' }] };
let edited;
const render = recurring => root.render(React.createElement(Pending, { pending: [{ id_cargo_pendiente: 'payment', concepto: 'Factura', importe_cargo: 50, estado: 'pendiente', fecha_cargo: '01/06/2026' }], recurring, onEdit: id => { edited = id; } }));
async function main() {
  await act(async () => render([charge]));
  assert.equal(document.querySelectorAll('tbody tr').length, 2);
  assert.match(document.body.textContent, /Cada 3 meses/);
  assert.equal(document.querySelectorAll('th details').length, 4);
  assert.equal(document.querySelectorAll('details[open]').length, 0);
  await act(async () => document.querySelector('tbody button').click());
  assert.equal(edited, 'quarterly');
  const input = document.querySelector('input');
  await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'COSVA'); input.dispatchEvent(new window.Event('input', { bubbles: true })); });
  assert.equal(document.querySelectorAll('tbody tr').length, 1);
  assert.match(document.querySelector('tbody').textContent, /COSVA/);
  await act(async () => render([{ ...charge, programacion: [{ ...charge.programacion[0], total_iva: 30 }] }]));
  assert.match(document.querySelector('tbody').textContent, /30,00/);
  assert.doesNotMatch(document.querySelector('tbody').textContent, /24,75/);
  await act(async () => root.unmount());
  console.log('OK: pending and recurring rows, collapsed column filters, edit target and refreshed values');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
