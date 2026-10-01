/* eslint-disable @typescript-eslint/no-require-imports -- Browser test harness for TSX. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {JSDOM}=require(path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom'));
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
Object.assign(global,{window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,FormData:dom.window.FormData,IS_REACT_ACT_ENVIRONMENT:true});
dom.window.HTMLElement.prototype.scrollIntoView=function(){};
const React=require('react'),{createRoot}=require('react-dom/client');
const calls=[],navigations=[],cache=new Map();
const api={post:async(url,data)=>{calls.push({url,data});return {data:{id:1,...data}};}};
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
    if(id.includes('CuentaService'))return {CuentaService:{getCuentas:async()=>[{id_cuenta:'client',nombre_empresa:'Cliente',id_agente:'agent'}]}};
    if(id.includes('AgenteService'))return {AgenteService:{getAgentes:async()=>[{id_agente:'agent',nombre_completo_agente:'Agente asignado'}]}};
    if(id.includes('ContactoService'))return {ContactoService:{getContactos:async()=>[]}};
    if(id.startsWith('@/')){const base=id.slice(2);return load(['.tsx','.ts','.js'].map(ext=>base+ext).find(fs.existsSync));}
    if(id.startsWith('.')){const base=path.join(path.dirname(file),id);return load(['.tsx','.ts','.js'].map(ext=>base+ext).find(fs.existsSync));}
    return require(id);
  },mod,mod.exports);cache.set(file,mod.exports);return mod.exports;
}
const root=createRoot(document.getElementById('root'));
const input=async(node,value)=>{assert(node);await React.act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(node,value);node.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});};
const label=text=>[...document.querySelectorAll('label')].find(node=>node.textContent.startsWith(text))?.querySelector('input,select');
const select=async(node,value)=>React.act(async()=>{node.value=value;node.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});
(async()=>{
 const Modal=load('app/dashboard/produccion/control_redaccion/NewArticleModal.tsx').default;let saved,closed=0;
 await React.act(async()=>root.render(React.createElement(Modal,{onCreated:row=>{saved=row;},onClose:()=>{closed++;}})));
 assert(document.querySelector('[role="dialog"]'));await input(label('Empresa'),'Empresa');await input(label('Título'),'Artículo');await input(label('Páginas'),'2');await select(label('Responsable corrección'),'Frank');
 const submit=async()=>React.act(async()=>document.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
 await submit();assert.equal(calls.length,0);assert.match(document.querySelector('[role="alert"]').textContent,/al menos/);
 await input(label('Nº Hueco previsto'),'12');await React.act(async()=>document.querySelector('input[type="checkbox"]').click());await submit();
 assert(saved);assert.equal(calls[0].data.estado_publicacion_vidrioperfil,true);assert.equal(calls[0].data.revista,'');assert.equal(calls[0].data.hueco_previsto,'12');
 await React.act(async()=>window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'})));assert.equal(closed,1);
 await React.act(async()=>document.querySelector('[aria-label="Cerrar nuevo artículo"]').click());assert.equal(closed,2);
 await React.act(async()=>root.unmount());dom.window.close();console.log('PASS: article modal fields, placement validation, checkbox submission, optional magazine, Escape and close button.');
})().catch(error=>{console.error(error);process.exitCode=1;});
