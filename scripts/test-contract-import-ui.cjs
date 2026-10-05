/* eslint-disable @typescript-eslint/no-require-imports -- Browser test harness for TSX. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {JSDOM}=require(process.env.P3_SELECTOR_TEST_MODULES ? path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom') : 'jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
Object.assign(global,{window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,FormData:dom.window.FormData,IS_REACT_ACT_ENVIRONMENT:true});
dom.window.HTMLElement.prototype.scrollIntoView=function(){};
const React=require('react'),{createRoot}=require('react-dom/client');
const calls=[],navigations=[],cache=new Map();let template;
const api={post:async(url,data)=>{
  calls.push({url,data});
  if(url.endsWith('/contratos'))return {data:{id_contrato:'C-CREATED'}};
  if(data.get('action')==='commit')return {data:{summary:{create:0,update:0,unchanged:0,skip:1},ids:[]}};
  const skip=JSON.parse(data.get('choices'))[2]==='skip';
  return {data:{token:'validated',summary:{create:0,update:skip?0:1,unchanged:0,skip:skip?1:0,errors:skip?0:1},rows:[{row:2,id:'C-EXISTING',action:skip?'skip':'update',errors:skip?[]:['El contrato ya existe.'],changes:[{field:'nombre_contrato',before:'Anterior',after:'Nuevo'}]}]}};
}};
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
    if(id.includes('CuentaService'))return {CuentaService:{getCuentas:async()=>({rows:[{id_cuenta:'client',nombre_empresa:'Cliente',id_agente:'agent'}],total:1})}};
    if(id.includes('AgenteService'))return {AgenteService:{getAgentes:async()=>[{id_agente:'agent',nombre_completo_agente:'Agente asignado'}]}};
    if(id.includes('ContactoService'))return {ContactoService:{getContactos:async()=>[]}};
    if(id==='xlsx')return {...require('xlsx'),writeFile:book=>{template=book;}};
    if(id.startsWith('@/')){const base=id.slice(2);return load(['.tsx','.ts','.js'].map(ext=>base+ext).find(fs.existsSync));}
    if(id.startsWith('.')){const base=path.join(path.dirname(file),id);return load(['.tsx','.ts','.js'].map(ext=>base+ext).find(fs.existsSync));}
    return require(id);
  },mod,mod.exports);cache.set(file,mod.exports);return mod.exports;
}
const root=createRoot(document.getElementById('root'));
const click=async text=>{const button=[...document.querySelectorAll('button')].find(node=>node.textContent===text);assert(button,text);assert(!button.disabled,text+' disabled');await React.act(async()=>button.click());};
const input=async(node,value)=>{assert(node);await React.act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(node,value);node.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});};
const label=text=>[...document.querySelectorAll('label')].find(node=>node.textContent.startsWith(text))?.querySelector('input,select');
const select=async(node,value)=>React.act(async()=>{node.value=value;node.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});
(async()=>{
  const Direct=load('app/dashboard/administracion/control-administrativo/nuevo-contrato/page.tsx').default;
  await React.act(async()=>root.render(React.createElement(Direct)));
  await React.act(async()=>await new Promise(resolve=>setTimeout(resolve,300)));
  await click('Continuar');assert.match(document.querySelector('[role="alert"]').textContent,/cuenta/);
  await React.act(async()=>document.querySelector('[aria-label="Cuenta"]').focus());await React.act(async()=>document.querySelector('[role="option"]').click());
  assert.equal(document.querySelector('[aria-label="Agente"]').value,'Agente asignado');
  assert(document.querySelector('[aria-label="Fecha fin (opcional): dd"]'));
  await input(label('Nombre del contrato'),'Contrato prueba');await click('Continuar');
  await click('+ Agregar servicio aquí');
  await React.act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Webweb').click());
  await React.act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Servicio')&&b.textContent.includes('100.00')).click());
  await click('Confirmar');assert(document.querySelector('tbody tr input'));await click('Continuar');
  for(const [part,value] of [['dd','30'],['mm','12'],['yyyy','2099']])await input(document.querySelector(`[aria-label="Fecha del cobro 1: ${part}"]`),value);
  await input(label('Importe EUR'),'120');await click('Continuar');assert.match(document.querySelector('[role="alert"]').textContent,/suma/);
  await input(label('Importe EUR'),'121');await click('Continuar');assert.equal(calls.length,0);
  await click('Crear contrato');assert.equal(calls.length,1);assert(!calls[0].data.id_factura);assert.equal(calls[0].data.cobros[0].fecha_cobro,'30/12/2099');assert.equal(navigations[0],'/dashboard/comercial/contratos/C-CREATED');
  await React.act(async()=>root.render(React.createElement(Direct,{key:'exchange'})));
  await React.act(async()=>await new Promise(resolve=>setTimeout(resolve,300)));
  await React.act(async()=>document.querySelector('[aria-label="Cuenta"]').focus());await React.act(async()=>document.querySelector('[role="option"]').click());
  await input(label('Nombre del contrato'),'Intercambio');await click('Continuar');
  await React.act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent.startsWith('+ Agregar servicio')).click());
  await React.act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Webweb').click());
  await React.act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Servicio')&&b.textContent.includes('100.00')).click());await click('Confirmar');await click('Continuar');
  await React.act(async()=>document.querySelector('input[type="checkbox"]').click());assert(!document.querySelector('[aria-label="Fecha del cobro 1: dd"]'));
  await click('Continuar');assert(document.querySelector('[role="alert"]'));
  await React.act(async()=>{const node=document.querySelector('textarea');Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype,'value').set.call(node,'Servicios a cambio');node.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
  await click('Continuar');await click('Crear contrato');assert.equal(calls[1].data.es_intercambio,true);assert.deepEqual(calls[1].data.cobros,[]);assert.equal(calls[1].data.condiciones_intercambio,'Servicios a cambio');
  const Bulk=load('app/dashboard/administracion/control-administrativo/importacion-masiva/page.tsx').default;
  await React.act(async()=>root.render(React.createElement(Bulk)));
  await select(label('Tipo'),'contratos');await click('Continuar');await click('Descargar plantilla Excel');
  assert(require('xlsx').utils.sheet_to_json(template.Sheets[template.SheetNames[0]],{header:1})[0].includes('id_contrato'));
  await click('Continuar');const picker=document.querySelector('input[type="file"]');Object.defineProperty(picker,'files',{value:[new dom.window.File(['test'],'contratos.xlsx')],configurable:true});await React.act(async()=>picker.dispatchEvent(new dom.window.Event('change',{bubbles:true})));
  await click('Validar Excel');assert.match(document.body.textContent,/Resultado de la validación/);await click('Revisar incidencias');
  const card=document.querySelector('details');assert(card);await React.act(async()=>card.querySelector('summary').click());assert(card.open);
  await select(card.querySelector('select'),'skip');await click('Validar decisiones y continuar');assert.match(document.body.textContent,/Confirmación final/);
  assert.equal(calls.filter(call=>call.data instanceof FormData&&call.data.get('action')==='commit').length,0);
  await click('Confirmar importación');assert.match(document.body.textContent,/Importación completada/);
  const committed=calls.find(call=>call.data instanceof FormData&&call.data.get('action')==='commit').data;assert.equal(committed.get('token'),'validated');assert.equal(JSON.parse(committed.get('choices'))[2],'skip');
  await React.act(async()=>root.unmount());dom.window.close();
  console.log('PASS: direct contract wizard, separate date inputs, totals, no early writes, detail navigation; bulk template, Excel validation, expandable incident decisions and final confirmation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
