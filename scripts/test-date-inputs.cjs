/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const cache = new Map();
function load(filename) {
  const file = path.resolve(filename);
  if (cache.has(file)) return cache.get(file);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const result = { exports: {} };
  const localRequire = name => {
    if (!name.startsWith('.') && !name.startsWith('@/')) return require(name);
    const base = name.startsWith('@/') ? path.resolve(name.slice(2)) : path.resolve(path.dirname(file), name);
    const target = ['.tsx', '.ts', '.js'].map(ext => base + ext).find(candidate => fs.existsSync(candidate));
    return load(target || base);
  };
  new Function('require', 'exports', 'module', compiled)(localRequire, result.exports, result);
  cache.set(file, result.exports);
  return result.exports;
}
const { matchesTableFilter, isDateFilterField } = load('app/lib/dateFilters.ts');
for (const date of ['03/06/2025', '2025-06-03', '2025-06-03T12:00:00Z']) {
  for (const filter of ['3//', '/6/', '//2025', '03/06/2025', '', '//']) assert(matchesTableFilter(date, filter), `${date}: ${filter}`);
  for (const filter of ['4//', '/7/', '//2026']) assert(!matchesTableFilter(date, filter), `${date}: ${filter}`);
}
assert(matchesTableFilter('Cliente Barcelona', 'BARCELONA'));
assert(!matchesTableFilter('', '//2025'));
for (const field of ['Fecha de cobro', 'deadline_materiales', 'invoice_date', 'generated_at']) assert(isDateFilterField(field));
assert(!isDateFilterField('Fecha / periodicidad'));
assert(!isDateFilterField('Cliente'));

const DatePartsInput = load('app/components/DatePartsInput.tsx').default;
const TableColumnFilter = load('app/components/TableColumnFilter.tsx').default;
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const html = render(DatePartsInput, { label: 'Fecha', value: '2025-06-03', onChange() {} });
assert.equal((html.match(/<input /g) || []).length, 3);
assert.equal((html.match(/aria-hidden="true"/g) || []).length, 2);
for (const value of ['03', '06', '2025']) assert(html.includes(`value="${value}"`));
assert(html.includes('placeholder="dd"') && html.includes('placeholder="mm"') && html.includes('placeholder="yyyy"'));
const disabled = render(DatePartsInput, { label: 'Fecha', value: '', disabled: true, onChange() {} });
assert.equal((disabled.match(/<input [^>]*disabled=""/g) || []).length, 3);
assert.equal((render(TableColumnFilter, { label: 'Fecha de cobro', value: '//2025', onChange() {} }).match(/<input /g) || []).length, 3);
assert.equal((render(TableColumnFilter, { label: 'Cliente', value: 'Barcelona', onChange() {} }).match(/<input /g) || []).length, 1);
let changed = '';
const dateTree = DatePartsInput({ label: 'Fecha', value: '03/06/2025', onChange: value => { changed = value; } });
const inputs = dateTree.props.children[1].props.children;
inputs[0].props.onChange({ target: { value: 'a34x5' } });
assert.equal(changed, '34/06/2025');
inputs[2].props.onChange({ target: { value: '202612' } });
assert.equal(changed, '03/06/2026');
const emptyTree = DatePartsInput({ label: 'Fecha', value: '//2025', onChange: value => { changed = value; } });
emptyTree.props.children[1].props.children[2].props.onChange({ target: { value: '' } });
assert.equal(changed, '');
console.log('PASS dates: fixed separators, dd/mm/yyyy, ISO values, disabled fields and partial date filters.');
