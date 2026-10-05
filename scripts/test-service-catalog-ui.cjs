/* eslint-disable @typescript-eslint/no-require-imports -- Browser test harness for TSX. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {JSDOM}=require(process.env.P3_SELECTOR_TEST_MODULES ? path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom') : 'jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
Object.assign(global,{window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,FormData:dom.window.FormData,IS_REACT_ACT_ENVIRONMENT:true});
dom.window.HTMLElement.prototype.scrollIntoView=function(){};
const React=require('react'),{createRoot}=require('react-dom/client');
const calls=[],navigations=[],cache=new Map();
const channels=[{id_medio:"web",nombre_medio:"Web",servicios:1}],services=[{id_servicio:"S1",id_medio:"web",nombre_medio:"Web",nombre_servicio_es:"Banner",precio_tarifa:10,disponibilidad:"Ofrecible"}];
const api={get:async url=>({data:url.endsWith('/canales')?channels:channels[0]}),post:async(url,data)=>{calls.push({url,data});return {data};},put:async(url,data)=>{calls.push({url,data});return {data};}};
global.fetch=async()=>({ok:true,json:async()=>({role:'operaciones'})});
function load(file){
  if(cache.has(file))return cache.get(file);
  const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  const mod={exports:{}};
  new Function('require','module','exports',js)(id=>{
    if(id==='next/navigation')return {useRouter:()=>({push:url=>navigations.push(url)}),usePathname:()=>'/dashboard/operaciones/servicios'};
    if(id==='next/link')return {__esModule:true,default:props=>React.createElement('a',props)};
    if(id.includes('MiddleNav'))return {__esModule:true,default:()=>null};
    if(id==='@/app/apiClient')return {__esModule:true,default:api};
    if(id.includes('ServicioService'))return {ServicioService:{getServicios:async()=>services,getServicioById:async()=>services[0],createServicio:async data=>{calls.push({data});return data;},updateServicio:async(id,data)=>{calls.push({data});return data;}}};
    if(id.includes('CuentaService'))return {CuentaService:{getCuentas:async()=>[{id_cuenta:'client',nombre_empresa:'Cliente',id_agente:'agent'}]}};
    if(id.includes('AgenteService'))return {AgenteService:{getAgentes:async()=>[{id_agente:'agent',nombre_completo_agente:'Agente asignado'}]}};
    if(id.includes('ContactoService'))return {ContactoService:{getContactos:async()=>[]}};
    if(id.startsWith('@/')){const base=id.slice(2);return load(['.tsx','.ts','.js'].map(ext=>base+ext).find(fs.existsSync));}
    return require(id);
  },mod,mod.exports);cache.set(file,mod.exports);return mod.exports;
}
const root=createRoot(document.getElementById('root'));
const click=async text=>{const button=[...document.querySelectorAll('button')].find(node=>node.textContent===text);assert(button,text);assert(!button.disabled,text+' disabled');await React.act(async()=>button.click());};
const input=async(node,value)=>{assert(node);await React.act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(node,value);node.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});};
const label=text=>[...document.querySelectorAll('label')].find(node=>node.textContent.startsWith(text))?.querySelector('input,select');
(async()=>{
 const {CatalogList,ChannelPage,ServicePage}=load('app/dashboard/operaciones/servicios/Catalogo.tsx');
 await React.act(async()=>root.render(React.createElement(CatalogList)));
 assert.equal(document.querySelectorAll('[role="tab"]').length,2);
 assert([...document.querySelectorAll('a')].some(a=>a.textContent==='Crear canal'));
 await React.act(async()=>document.querySelector('tbody tr').click());assert(navigations.pop().endsWith('/S1'));
 await click('Canales');await React.act(async()=>document.querySelector('tbody tr').click());assert(navigations.pop().endsWith('/canales/web'));
 await React.act(async()=>root.render(React.createElement(ChannelPage,{id:'web'})));
 assert(document.querySelector('a[href$="/web/nuevo-servicio"]'));assert.match(document.querySelector('tbody').textContent,/Banner/);
 await React.act(async()=>root.render(React.createElement(ServicePage,{create:true,channelId:'web'})));
 assert.equal(document.querySelector('[aria-label="Canal"]').value,'Web · web');assert(document.querySelector('[aria-label="Canal"]').disabled);
 assert.equal(document.querySelectorAll('input[type="date"]').length,0);
 await input(label('Código único'),'S2');await input(label('Nombre del servicio'),'Nuevo');
 await React.act(async()=>document.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
 assert.equal(calls.at(-1).data.id_medio,'web');assert(navigations.pop().endsWith('/S2'));
 const Menu=load('app/general_components/componentes_recurrentes/loggedLeftMenu.tsx').default;
 await React.act(async()=>root.render(React.createElement(Menu)));
 const collapse=document.querySelector('[aria-label="Ocultar menú"]');assert(collapse);assert(document.querySelector('aside a'));
 await React.act(async()=>collapse.click());assert.equal(document.querySelector('aside a'),null);assert(document.querySelector('aside').className.includes('w-12'));
 await React.act(async()=>document.querySelector('[aria-label="Expandir menú"]').click());assert(document.querySelector('aside a'));
 const {canAccessApiPath}=load('app/config/roleAccess.ts');assert(!canAccessApiPath('base','/api/v1/produccion/servicios','POST'));assert(canAccessApiPath('base','/api/v1/produccion/servicios','GET'));assert(canAccessApiPath('operaciones','/api/v1/operaciones/canales','POST'));
 await React.act(async()=>root.unmount());dom.window.close();console.log('PASS: catalog tabs, service/channel navigation, associated service creation, date parts, collapsible menu and catalog permissions.');
})().catch(error=>{console.error(error);process.exitCode=1;});
