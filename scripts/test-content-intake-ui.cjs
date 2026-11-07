const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const { JSDOM } = require(process.env.P3_SELECTOR_TEST_MODULES ? path.join(process.env.P3_SELECTOR_TEST_MODULES, 'jsdom') : 'jsdom');
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/dashboard/produccion/gestion' });
Object.assign(global, { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
const React = require('react'), { createRoot } = require('react-dom/client'), cache = new Map(), calls = [], navigations = [];
global.fetch = async (...args) => { calls.push({ method: 'PUT', url: args[0] }); return { ok: true }; };
const magazines = [
  ['vidrio-espana', 'Vidrio Plano', 'Iberia', 'España', 'Vidrio'],
  ['ventanas-espana', 'Ventanas, Puertas, Cerramientos y Protección Solar', 'Iberia', 'España', 'Ventanas'],
  ['vidrio-latam', 'Revista del Vidrio Plano', 'América Latina', 'América', 'Vidrio'],
  ['ventanas-latam', 'Revista Ventanas', 'América Latina', 'América', 'Ventanas'],
  ['qq-vidrio', 'Revista Quién es Quién', 'Edición Vidrio', 'Otro', 'Vidrio'],
  ['qq-ventanas', 'Quién es Quién', 'Ventanas, Puertas, Cerramientos y Protección solar', 'Otro', 'Ventanas'],
  ['hueco', 'Hueco Arquitectura', '2026', 'Otro', 'Hueco'],
].map(([id_revista, revista, edicion, region, sector]) => ({ id_revista, revista, edicion, region, sector, numero_publicacion: id_revista }));
const api = {
  get: async url => { calls.push({ method: 'GET', url }); return { data: url.includes('opciones') ? { contracts: [{id_contrato:'contract',nombre_contrato:'Contrato existente'}], contents: [{id_contenido:'contracted',nombre_contenido:'Contenido firmado'}], magazines: [] } : url.includes('/comercial/cuentas')?[{id_cuenta:'account',nombre_empresa:'Empresa'}]:url.includes('gestiones-produccion') ? magazines : url.endsWith('/produccion/contenidos') ? [{ id_contenido: 'article_new', nombre_contenido: 'Artículo nuevo', categorias_gestion: ['articulo'], estado_contenido: 'Pendiente' }] : url.includes('/gestion') ? [{ id_contenido: 'test', nombre_contenido: 'Contenido pendiente', nombre_servicio: 'Newsletter profesional', estado: 'Pendiente' }] : [] }; },
  post: async (url, data) => { calls.push({ method: 'POST', url, data }); return { data: url.endsWith('/validar') ? { ok: true, nombre: data.nombre, cuenta: 'Sin empresa' } : url.endsWith('/presign') ? { files: [{ uploadUrl: 'https://upload.invalid/file', mediaId: 'media', s3Key: 'key' }] } : { id_contenido: data.id_contenido||'created' } }; }
};
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const mod = { exports: {} }; cache.set(file, mod.exports);
  new Function('require', 'module', 'exports', compiled)(id => {
    if (id === 'next/navigation') return { useRouter: () => ({ push: value => navigations.push(value) }) };
    if (id === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) };
    if (id === '@/app/apiClient') return { __esModule: true, default: api };
    if (id === '@/app/lib/useUrlState') return { useUrlState: (_, initial) => React.useState(initial) };
    if (id.startsWith('@/') || id.startsWith('.')) { const base = id.startsWith('@/') ? id.slice(2) : path.join(path.dirname(file), id); return load([base, base + '.tsx', base + '.ts', base + '.js'].find(p => fs.existsSync(p) && fs.statSync(p).isFile())); }
    return require(id);
  }, mod, mod.exports); cache.set(file, mod.exports); return mod.exports;
}
const root = createRoot(document.getElementById('root'));
const click = async text => { const node = [...document.querySelectorAll('button')].find(n => n.textContent === text); assert(node, text); await React.act(async () => node.click()); };
const submit = () => React.act(async () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
const input = (node, value) => React.act(async () => { Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new dom.window.Event('input', { bubbles: true })); });
(async () => {
  const { productionMagazineFamily, productionMagazineSector } = load('app/config/productionMagazineFilters.js');
  for (const magazine of magazines) {
    assert.equal(productionMagazineFamily(magazine), magazine.id_revista);
    assert.equal(productionMagazineSector(magazine), magazine.sector);
  }
  assert.equal(productionMagazineFamily({ revista: 'Revista desconocida', edicion: 'Iberia' }), '');
  const { canonicalProductionPath } = load('app/config/productionRoutes.js');
  assert.equal(canonicalProductionPath('/dashboard/produccion/contenidos/content'), '/dashboard/produccion/repositorio/contenidos/content');
  assert.equal(canonicalProductionPath('/dashboard/administracion/ferias/one'), '/dashboard/operaciones/ferias/one');
  assert.equal(canonicalProductionPath('/dashboard/produccion/contenidos-extra'), '/dashboard/produccion/contenidos-extra');
  const Modal=load('app/dashboard/produccion/gestion/ContentIntakeModal.tsx').default;
  await React.act(async()=>root.render(React.createElement(Modal,{contracted:false,magazine:false,onClose:()=>{}})));
 await React.act(async () => new Promise(resolve => setTimeout(resolve, 250)));
  await submit(); assert(document.querySelector('[role="alert"]').textContent.includes('tipo'));
  await click('Otro'); await submit();assert(!document.body.textContent.includes('¿Está asociado a algo contratado?'));
  await React.act(async () => document.querySelector('input[type="checkbox"]').click());
  const name = [...document.querySelectorAll('label')].find(n => n.textContent.startsWith('Nombre *')).querySelector('input'); await input(name, 'Contenido sin empresa');
  await submit(); await click('Archivo ZIP');
  const upload = document.querySelector('input[type="file"]');
  Object.defineProperty(upload, 'files', { configurable: true, value: [new dom.window.File(['zip'], 'material.zip', { type: 'application/zip' })] });
  await React.act(async () => upload.dispatchEvent(new dom.window.Event('change', { bubbles: true })));
  await submit(); assert(document.body.textContent.includes('Todo está correcto'));
  assert.equal(calls.filter(c => c.method === 'PUT').length, 0);
  assert.equal(calls.filter(c => c.url.endsWith('/presign')).length, 0);
  await submit(); assert.equal(calls.filter(c => c.method === 'PUT').length, 1); assert.deepEqual(navigations, ['/dashboard/produccion/repositorio/contenidos/created']);
  const saved = calls.find(c => c.method === 'POST' && c.url === '/api/v1/produccion/gestion').data;
  assert.equal(saved.tipo, 'otro'); assert.equal(saved.materiales.length, 1); assert.equal(saved.materiales[0].nombre_material, 'material.zip');
  assert.equal(saved.ambito,'otros');assert.equal(saved.contratado,false);
  await React.act(async()=>root.render(React.createElement(Modal,{key:'contract',contracted:true,magazine:false,onClose:()=>{}})));
  await React.act(async()=>new Promise(resolve=>setTimeout(resolve,250)));
  await click('Otro');await submit();assert(!document.querySelector('input[type=checkbox]'));
  const chooseOption=async(label,text)=>{await React.act(async()=>document.querySelector(`[aria-label="${label}"]`).click());const option=[...document.querySelectorAll('[role=option]')].find(n=>n.textContent.includes(text));assert(option,text);await React.act(async()=>option.click());};
  await chooseOption('Empresa / cuenta','Empresa');await chooseOption('Contrato','contract');await chooseOption('Contenido contratado','Contenido firmado');await submit();
  const contractedFile=document.querySelector('input[type=file]');Object.defineProperty(contractedFile,'files',{value:[new dom.window.File(['pdf'],'contratado.pdf')]});await React.act(async()=>contractedFile.dispatchEvent(new dom.window.Event('change',{bubbles:true})));
  await submit();await submit();const linked=calls.filter(c=>c.method==='POST'&&c.url==='/api/v1/produccion/gestion').at(-1).data;
  assert.equal(linked.contratado,true);assert.equal(linked.id_contrato,'contract');assert.equal(linked.id_contenido,'contracted');assert.equal(navigations.at(-1),'/dashboard/produccion/repositorio/contenidos/contracted');
  await React.act(async()=>root.render(React.createElement(Modal,{key:'magazine',contracted:false,magazine:true,onClose:()=>{}})));
  await React.act(async()=>new Promise(resolve=>setTimeout(resolve,250)));
  assert(![...document.querySelectorAll('button')].some(button=>button.textContent==='Otro'));await click('Artículo');await submit();
  await React.act(async()=>document.querySelector('input[type=checkbox]').click());await input([...document.querySelectorAll('label')].find(label=>label.textContent.startsWith('Nombre *')).querySelector('input'),'Artículo libre');await submit();assert(document.querySelector('[role=alert]').textContent.includes('revista'));
  const Editorial = load('app/dashboard/produccion/control_redaccion/ControlRedaccionTable.tsx').default;
  await React.act(async () => root.render(React.createElement(Editorial)));
  assert(document.querySelector('tbody').textContent.includes('Artículo nuevo'));
  assert(!document.body.textContent.includes('Añadir artículo'));
  await React.act(async () => document.querySelector('tbody tr').click());
  assert.equal(navigations.at(-1), '/dashboard/produccion/repositorio/contenidos/article_new');
  await React.act(async () => root.unmount()); dom.window.close();
  console.log('PASS: alta sin contrato en cuatro pasos, validacion, ZIP, subida tras confirmar y navegacion al almacenamiento.');
})().catch(error => { console.error(error); process.exitCode = 1; });
