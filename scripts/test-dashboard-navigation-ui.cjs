const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {JSDOM}=require(process.env.P3_SELECTOR_TEST_MODULES?path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom'):'jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/dashboard'});
Object.assign(global,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(global,'navigator',{configurable:true,value:dom.window.navigator});
const React=require('react'),{createRoot}=require('react-dom/client'),root=createRoot(document.getElementById('root')),cache=new Map();
let pathname='/dashboard/produccion/repositorio',role='superadmin';
function load(file){
 file=path.resolve(file);
 if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
 if(cache.has(file))return cache.get(file);const mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id==='next/navigation')return {usePathname:()=>pathname};
  if(id==='next/link')return {__esModule:true,default:({children,...props})=>React.createElement('a',props,children)};
  if(id.includes('loggedNav'))return {__esModule:true,default:()=>null};
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
 assert.equal(document.querySelectorAll('aside a').length,0,'El menú empieza contraído');
 pathname='/dashboard/comercial/cuentas';await render('Cuentas');assert.equal(document.querySelectorAll('aside a').length,0,'Navegar no despliega el menú');
 pathname='/dashboard/produccion/repositorio';await render('Almacenamiento');await click('Expandir menú');
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
 const Layout=load('app/dashboard/layout.tsx').default,MiddleNav=load('app/general_components/componentes_recurrentes/MiddleNav.tsx').default;
 const {dashboardPathExists}=load('app/config/dashboardNavigation.ts');
 role='superadmin';
 const patterns=load('app/config/dashboardRoutePatterns.json').filter(route=>route.startsWith('/dashboard')||route.startsWith('/tareas'));
 for(const pattern of patterns){
  pathname=pattern.replace(/\[([^\]]+)\]/g,'registro');
  await React.act(async()=>root.render(React.createElement(Layout,null,React.createElement('main',null,React.createElement('h1',null,'Ficha de prueba')))));
  const bars=document.querySelectorAll('[data-dashboard-midnav]');assert.equal(bars.length,1,pattern);
  for(const link of bars[0].querySelectorAll('a'))assert(dashboardPathExists(link.getAttribute('href')),`${pattern}: enlace sin página ${link.getAttribute('href')}`);
 }
 pathname='/dashboard/comercial/cuentas/registro';
 const page=label=>React.createElement(React.Fragment,null,React.createElement(MiddleNav,{tituloprincipal:'Cuentas'}),React.createElement('main',null,React.createElement(MiddleNav,{tituloprincipal:label,currentLabel:label})));
 await React.act(async()=>root.render(React.createElement(Layout,null,page('Empresa concreta'))));
 assert.equal(document.querySelectorAll('[data-dashboard-midnav]').length,1);assert.equal(document.querySelector('[data-page-title]').textContent,'Empresa concreta');
 await React.act(async()=>root.render(React.createElement(Layout,null,page('Empresa actualizada'))));
 assert.equal(document.querySelector('[data-page-title]').textContent,'Empresa actualizada');
 assert(document.querySelector('[data-dashboard-midnav]').textContent.includes('Empresa actualizada'));
 await React.act(async()=>root.render(React.createElement(Layout,null,React.createElement('main',null,'Sin barra propia'))));
 assert.equal(document.querySelectorAll('[data-dashboard-midnav]').length,1);assert.equal(document.querySelector('[data-page-title]').textContent,'Cuentas');
 const embeddedStyle=document.createElement('style'),css=fs.readFileSync('app/globals.css','utf8');
 const start=css.indexOf('.embedded-forecast > div > :first-child');embeddedStyle.textContent=css.slice(start,css.indexOf('}',start)+1);document.head.append(embeddedStyle);
 const embedded=React.createElement('div',{className:'embedded-forecast'},React.createElement('div',null,React.createElement(MiddleNav,{tituloprincipal:'Previsión incrustada'}),React.createElement('main',{'data-embedded-content':true},'Formulario incrustado')));
 await React.act(async()=>root.render(React.createElement(Layout,null,React.createElement(MiddleNav,{tituloprincipal:'Cuentas'}),embedded)));
 assert.equal(document.querySelectorAll('[data-dashboard-midnav]').length,1);assert.equal(document.querySelector('[data-page-title]').textContent,'Cuentas');
 assert.notEqual(dom.window.getComputedStyle(document.querySelector('[data-embedded-content]')).display,'none','Las vistas incrustadas conservan su contenido visible');
 await React.act(async()=>root.unmount());dom.window.close();
 console.log('PASS: jerarquia, seis iconos, modulo activo, apertura desde iconos, permisos, seleccion unica y titulos al navegar, volver y cargar fichas.');
})().catch(error=>{console.error(error);process.exitCode=1;});
