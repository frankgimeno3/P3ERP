const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {JSDOM}=require(process.env.P3_SELECTOR_TEST_MODULES?path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom'):'jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/dashboard'});
Object.assign(global,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(global,'navigator',{configurable:true,value:dom.window.navigator});
const React=require('react'),{createRoot}=require('react-dom/client'),root=createRoot(document.getElementById('root')),cache=new Map();
let pathname='/dashboard/produccion/repositorio',role='superadmin';
function load(file){
 if(cache.has(file))return cache.get(file);const mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id==='next/navigation')return {usePathname:()=>pathname};
  if(id==='next/link')return {__esModule:true,default:({children,...props})=>React.createElement('a',props,children)};
  if(id==='@/app/lib/currentUser')return {useCurrentUser:()=>({user:{role}})};
  if(id.startsWith('@/')||id.startsWith('.')){const base=id.startsWith('@/')?id.slice(2):path.join(path.dirname(file),id);return load([base,base+'.tsx',base+'.ts',base+'.js'].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile()));}
  return require(id);
 },mod,mod.exports);cache.set(file,mod.exports);return mod.exports;
}
const Menu=load('app/general_components/componentes_recurrentes/loggedLeftMenu.tsx').default;
const Title=load('app/components/DashboardPageTitle.tsx').default;
async function render(heading,modal=false){
 await React.act(async()=>root.render(React.createElement(React.Fragment,null,
  React.createElement(Menu),React.createElement(Title),
  React.createElement('div',{'data-dashboard-content':true},React.createElement('main',null,React.createElement('h1',null,heading)),modal&&React.createElement('div',{role:'dialog'},React.createElement('h1',null,'Título del modal'))))));
}
async function click(label){const button=[...document.querySelectorAll('button')].find(node=>node.getAttribute('aria-label')===label);assert(button,label);await React.act(async()=>button.click());}
(async()=>{
 await render('Almacenamiento');
 assert.equal(document.title,'Almacenamiento | Producción | P3ERP');
 assert.equal(document.querySelector('aside [aria-current=location]').getAttribute('aria-label'),'Producción');
 const active=document.querySelector('aside [aria-current=page]');assert.equal(active.textContent,'Almacenamiento');
 const sheet=document.querySelector('a[href="/dashboard/produccion/hoja_produccion"]');assert.equal(active.parentElement,sheet.parentElement,'Las páginas del mismo módulo comparten nivel');
 await click('Ocultar menú');
 const modules=[...document.querySelectorAll('[data-module]')];
 assert.equal(modules.length,6);assert.equal(document.querySelectorAll('aside a').length,0);
 for(const entry of modules){const button=entry.querySelector('button');assert(button.getAttribute('title'));assert(button.querySelector('svg'));}
 assert.equal(document.querySelector('aside [aria-current=location]').getAttribute('aria-label'),'Producción');
 await click('Comercial');assert(document.querySelector('a[href="/dashboard/comercial/cuentas"]'));
 pathname='/dashboard/comercial/cuentas';await render('Cuentas');assert.equal(document.title,'Cuentas | Comercial | P3ERP');
 pathname='/dashboard/produccion/gestion-contenidos/revista/rev_216';await render('Vidrio · Iberia · 216');
 assert.equal(document.title,'Vidrio · Iberia · 216 | Producción | P3ERP');
 assert.equal(document.querySelector('aside [aria-current=page]').textContent,'Contenido revista');
 pathname='/dashboard/produccion/repositorio/contenidos/alpha';await render('Contenido Alpha',true);
 assert.equal(document.title,'Contenido Alpha | Producción | P3ERP');
 await React.act(async()=>{document.title='P3ERP';});assert.equal(document.title,'Contenido Alpha | Producción | P3ERP','Los metadatos heredados tardíos no sustituyen el título de la ficha');
 await render('Contenido actualizado',true);assert.equal(document.title,'Contenido actualizado | Producción | P3ERP','Se actualiza tras cargar o editar el nombre, sin tomar el título del modal');
 pathname='/dashboard/produccion/repositorio';await render('Almacenamiento');assert.equal(document.title,'Almacenamiento | Producción | P3ERP','Volver restaura el título de la ruta');
 pathname='/dashboard/contabilidad/extractos/conciliacion';await render('Conciliación');assert.equal(document.querySelectorAll('aside [aria-current=page]').length,1);
 await click('Ocultar menú');role='contabilidad';await render('Conciliación');
 assert(!document.querySelector('[data-module=produccion]'));assert(!document.querySelector('[data-module=direccion]'));assert(document.querySelector('[data-module=contabilidad]'));
 pathname='/dashboard';await render('Nombre del usuario');assert.equal(document.title,'Mi panel | P3ERP');
 await React.act(async()=>root.unmount());dom.window.close();
 console.log('PASS: jerarquia, seis iconos, modulo activo, apertura desde iconos, permisos, seleccion unica y titulos al navegar, volver y cargar fichas.');
})().catch(error=>{console.error(error);process.exitCode=1;});
