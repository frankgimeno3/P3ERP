/* eslint-disable @typescript-eslint/no-require-imports -- Browser test harness for TSX. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {JSDOM}=require(process.env.P3_SELECTOR_TEST_MODULES ? path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom') : 'jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
Object.assign(global,{window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,FormData:dom.window.FormData,IS_REACT_ACT_ENVIRONMENT:true});
dom.window.HTMLElement.prototype.scrollIntoView=function(){};
const React=require('react'),{createRoot}=require('react-dom/client');
const calls=[],navigations=[],cache=new Map();
const api={put:async(url,data)=>{calls.push({url,data});return {data};}};
function load(file){
  if(cache.has(file))return cache.get(file);
  const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  const mod={exports:{}};
  new Function('require','module','exports',js)(id=>{
    if(id==='next/navigation')return {useRouter:()=>({push:url=>navigations.push(url)})};
    if(id==='next/link')return {__esModule:true,default:props=>React.createElement('a',props)};
    if(id.includes('MiddleNav'))return {__esModule:true,default:()=>null};
    if(id==='@/app/apiClient')return {__esModule:true,default:api};
    if(id.includes('ServicioService'))return {ServicioService:{getServicios:async()=>[{id_servicio:'srv',id_medio:'web',nombre_medio:'Web',nombre_servicio_es:'Servicio',precio_tarifa:100}]}};
    if(id.includes('RevistaService'))return {RevistaService:{getRevistas:async()=>[]}};
    if(id.includes('CuentaService'))return {CuentaService:{getCuentaById:async()=>({id_cuenta:'client',nombre_empresa:'Cliente',id_agente:'agent'}),getCuentas:async(filters={})=>{const rows=[{id_cuenta:'client',nombre_empresa:'Cliente',id_agente:'agent'}].filter(row=>!filters.clienteFiltro||row.nombre_empresa.toLowerCase().includes(filters.clienteFiltro.toLowerCase()));return filters.limit?{rows,total:rows.length}:rows;}}};
    if(id.includes('AgenteService'))return {AgenteService:{getAgentes:async()=>[{id_agente:'agent',nombre_completo_agente:'Agente asignado'}]}};
    if(id.includes('ContactoService'))return {ContactoService:{getContactos:async()=>[{id_contacto:'first',id_cuenta:'client',nombre_completo_contacto:'Principal',es_principal:true},{id_contacto:'second',id_cuenta:'client',nombre_completo_contacto:'Segundo',es_principal:false}]}};
    if(id.includes('PropuestaPreview'))return {__esModule:true,default:()=>null};
    if(id.includes('OrdenService'))return {OrdenService:{getOrdenAdministrativa:async()=>({id_orden:'C25.000.036-1/1',id_contrato:'C1',id_factura:'F1',factura:{id_factura_cliente:'F1',lineas:[],otras_ordenes:[]},tipo_factura:'Previa',forma_cobro:'recibo',banco_cobro:'Sabadell',cobro_total:100,base_imponible:100,id_remesa:'R1'}),updateOrdenAdministrativa:async(id,data)=>data}};
    if(id.includes('PropuestaService'))return {PropuestaService:{}};
    if(id.startsWith('@/')){const base=id.slice(2);return load(['.tsx','.ts','.js'].map(ext=>base+ext).find(fs.existsSync));}
    if(id.startsWith('.')){const base=path.join(path.dirname(file),id);return load(['.tsx','.ts','.js'].map(ext=>base+ext).find(fs.existsSync));}
    return require(id);
  },mod,mod.exports);cache.set(file,mod.exports);return mod.exports;
}
const root=createRoot(document.getElementById('root'));
const click=async text=>{const button=[...document.querySelectorAll('button')].find(node=>node.textContent===text);assert(button,text);assert(!button.disabled,text+' disabled');await React.act(async()=>button.click());};
const input=async(node,value)=>{assert(node);await React.act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(node,value);node.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});};
const label=text=>[...document.querySelectorAll('label')].find(node=>node.textContent.startsWith(text))?.querySelector('input,select');
(async()=>{
const Editor=load('app/dashboard/comercial/propuestas/componentesPropuestas/PropuestaEditor.tsx').default;
await React.act(async()=>root.render(React.createElement(Editor,{mode:'create'})));
await click('Buscar y seleccionar cuenta');assert(document.querySelector('[role="dialog"]'));
await input(label('Empresa'),'no existe');assert.match(document.querySelector('[role="dialog"]').textContent,/0 cuentas/);
await input(label('Empresa'),'Cliente');
await React.act(async()=>new Promise(resolve=>setTimeout(resolve,300)));
await React.act(async()=>document.querySelector('input[aria-label="Seleccionar Cliente"]').click());await click('Seleccionar cuenta');
assert.equal(document.querySelector('[role="dialog"]'),null);
assert([...document.querySelectorAll('tbody tr')].some(row=>row.className.includes('bg-green-50')&&row.textContent.includes('Principal')));
const Contacts=load('app/dashboard/comercial/cuentas/[id_cuenta]/componentesFicha/cards/ContenidoContactosEmpresa.tsx').default;
await React.act(async()=>root.render(React.createElement(Contacts,{id_cuenta:'client'})));
assert.equal(document.querySelectorAll('svg[aria-label="Contacto principal"]').length,1);
await React.act(async()=>document.querySelector('input[aria-label="Marcar como principal a Segundo"]').click());assert.equal(calls.length,0);
await React.act(async()=>window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'})));assert.equal(document.querySelector('[role="dialog"]'),null);
await React.act(async()=>document.querySelector('input[aria-label="Marcar como principal a Segundo"]').click());await click('Confirmar cambio');assert.equal(calls[0].data.id_contacto,'second');assert(document.querySelector('svg[aria-label="Contacto principal"]').closest('tr').textContent.includes('Segundo'));
const Filters=load('app/dashboard/comercial/propuestas/componentesPropuestas/FiltrosPropuestas.tsx').default;
for(const pestana of ['todasporcliente','miasenproceso']){await React.act(async()=>root.render(React.createElement(Filters,{pestana,agenteActual:'agent',agentes:[],clienteFiltro:'',codigoCRMFiltro:'',agenteFiltro:'',estadoFiltro:'',fechaInicio:'',fechaFin:'',setClienteFiltro(){},setCodigoCRMFiltro(){},setAgenteFiltro(){},setEstadoFiltro(){},setFechaInicio(){},setFechaFin(){}})));assert(document.querySelector('details'));assert.equal(document.querySelectorAll('fieldset input').length,6);assert(!document.querySelector('fieldset').disabled);assert.equal(document.querySelector('details').open,false);}
const {proposalDate}=load('app/config/proposalDate.js');assert.equal(proposalDate('16/09/2026'),proposalDate('2026-09-16'));assert.equal(proposalDate('31/02/2026'),null);
const Order=load('app/dashboard/administracion/control-administrativo/[...id_orden]/page.tsx').default;
const params=Promise.resolve({id_orden:['C25.000.036-1','1']});await React.act(async()=>root.render(React.createElement(React.Suspense,{fallback:'Cargando'},React.createElement(Order,{params}))));
assert(document.querySelector('a[href="/dashboard/comercial/contratos/C1"]'));assert.match(document.querySelector('a[href="/dashboard/administracion/facturas-clientes/F1"]').textContent,/Previa/);assert(document.querySelector('select[aria-label="Otras \u00f3rdenes de la factura"]')); assert.match(document.body.textContent,/Fecha teórica de cobro/);assert.match(document.body.textContent,/Fecha real de cobro/);assert.match(document.body.textContent,/Remesa\s*:?\s*R1/);
await React.act(async()=>root.unmount());dom.window.close();console.log('PASS: filtered account modal, automatic primary contact, confirmation/cancel/crown, date filters stacked and enabled in both proposal tabs.');
})().catch(error=>{console.error(error);process.exitCode=1;});
