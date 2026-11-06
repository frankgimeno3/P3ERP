const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const { JSDOM } = require(process.env.P3_SELECTOR_TEST_MODULES ? path.join(process.env.P3_SELECTOR_TEST_MODULES, 'jsdom') : 'jsdom');
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/dashboard' });
Object.assign(global, { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
const React = require('react'), { createRoot } = require('react-dom/client'), cache = new Map();
const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
const year = Number(parts.find(p => p.type === 'year').value), month = Number(parts.find(p => p.type === 'month').value) - 1;
const monday = Array.from({ length: 7 }, (_, i) => i + 1).find(day => new Date(year, month, day).getDay() === 1);
const sunday = Array.from({ length: 7 }, (_, i) => i + 1).find(day => new Date(year, month, day).getDay() === 0);
const date = day => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const description = Array.from({ length: 60 }, (_, i) => 'palabra' + (i + 1)).join(' ');
const tasks = [{ id: 'one', nombre: 'Tarea actual', estado: 'pendiente', descripcion: description, fecha_inicio: date(monday) + 'T10:00:00' }, { id: 'done', nombre: 'Terminada', estado: 'completada', descripcion: 'Hecha', fecha_limite: date(monday) }, { id: 'sunday', nombre: 'Domingo pendiente', estado: 'pendiente', descripcion: 'Domingo', fecha_inicio: date(sunday) }, { id: 'undated', nombre: 'Sin fecha', estado: 'en_curso', descripcion: '' }];
const api = { get: async () => ({ data: tasks }), post: async () => ({ data: {} }) };
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const mod = { exports: {} }; cache.set(file, mod.exports);
  new Function('require', 'module', 'exports', compiled)(id => {
    if (id === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) };
    if (id === '@/app/apiClient') return { __esModule: true, default: api };
    if (id.startsWith('@/') || id.startsWith('.')) { const base = id.startsWith('@/') ? id.slice(2) : path.join(path.dirname(file), id); return load([base, base + '.tsx', base + '.ts', base + '.js'].find(p => fs.existsSync(p) && fs.statSync(p).isFile())); }
    return require(id);
  }, mod, mod.exports); cache.set(file, mod.exports); return mod.exports;
}
const root = createRoot(document.getElementById('root'));
const click = async text => { const node = [...document.querySelectorAll('button')].find(n => n.textContent === text); assert(node, text); await React.act(async () => node.click()); };
(async () => {
  const { calendarToday, taskCalendarMonth, taskCalendarDay } = load('app/lib/myTaskCalendar.js');
  assert.equal(taskCalendarDay({ fecha_limite: '05/11/2026' }), '2026-11-05');
  assert.equal(taskCalendarDay({ fecha_inicio: '2026-02-30' }), '');
  assert.equal(taskCalendarDay({fecha_inicio:'2026-02-30T00:00:00Z'}),'');
  assert.equal(taskCalendarDay({fecha_inicio:'2026-11-06T23:30:00Z'}),'2026-11-07');
  assert.equal(calendarToday(new Date('2026-06-30T22:30:00Z')),'2026-07-01');
  for(const y of [2000,2024,2026,2027,2100])for (let m = 0; m < 12; m++) {
    const weeks=taskCalendarMonth(y,m),days=weeks.flat().filter(Boolean),last=new Date(y,m+1,0).getDate();
    assert.deepEqual(days,Array.from({length:last},(_,i)=>i+1));
    for(const week of weeks)for(const [column,d] of week.entries())if(d)assert.equal(column,(new Date(y,m,d).getDay()+6)%7);
    assert.ok(weeks.every(week => week.length === 7 && week.some(Boolean)));
  }
  assert.deepEqual(taskCalendarMonth(2026,10)[0],[null,null,null,null,null,null,1]);
  const Panel = load('app/components/tasks/MyTasksPanel.tsx').default;
  await React.act(async () => root.render(React.createElement(Panel)));
  assert.deepEqual([...document.querySelectorAll('[role="tab"]')].map(n => n.textContent), ['Pendientes', 'Todas', 'Calendario']);
  assert(!document.querySelector('tbody').textContent.includes('Terminada'));
  const preview = document.querySelector('tbody tr td:last-child p').textContent;
  assert.equal(preview.split(/\s+/).length, 55); assert(!preview.includes('palabra56'));
  await click('Abrir'); assert(document.querySelector('[role="dialog"]').textContent.includes('palabra60'));
  await React.act(async () => window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape' }))); assert(!document.querySelector('[role="dialog"]'));
  await click('Todas'); assert(document.querySelector('tbody').textContent.includes('Terminada'));
  await click('Calendario');
  const title = document.querySelector('h2').textContent;
  assert(title.includes(String(year))); assert.equal(document.querySelectorAll('.grid-cols-7')[0].children.length, 7);
  assert(document.querySelector('[data-calendar-task="sunday"]')); assert(document.querySelector('[data-task-card="sunday"]'));
  assert(document.querySelector(`[data-calendar-date="${date(1)}"]`));
  assert.equal(document.querySelectorAll('[aria-current="date"]').length,1);
  assert.equal(document.querySelector('[aria-current="date"]').getAttribute('data-calendar-date'),calendarToday());
  assert(document.querySelector('[aria-current="date"]').textContent.includes('Hoy'));
  const label = document.querySelector('[data-calendar-task="one"]'), card = document.querySelector('[data-task-card="one"]');
  await React.act(async () => label.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body })));
  assert(label.classList.contains('border-blue-600')); assert(card.classList.contains('border-blue-600'));
  await React.act(async () => label.dispatchEvent(new dom.window.MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })));
  await React.act(async () => card.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body })));
  assert(card.classList.contains('border-blue-600')); assert(label.classList.contains('border-blue-600'));
  await React.act(async () => document.querySelector('[aria-label="Mes anterior"]').click()); assert.notEqual(document.querySelector('h2').textContent, title);
  assert(!document.querySelector('[aria-current="date"]'));
  await click('Hoy');assert.equal(document.querySelector('h2').textContent,title);assert(document.querySelector('[aria-current="date"]'));
  await React.act(async () => document.querySelector('[aria-label="Mes anterior"]').click());
  await React.act(async () => document.querySelector('[aria-label="Mes siguiente"]').click()); assert.equal(document.querySelector('h2').textContent, title);
  await React.act(async () => root.unmount()); dom.window.close();
  console.log('PASS: calendar includes every date and Sunday, weekday alignment, leap years, Madrid time, today marker and return, navigation and task hover.');
})().catch(error => { console.error(error); process.exitCode = 1; });
