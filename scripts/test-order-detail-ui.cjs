// Isolated DOM test; does not start the application or access RDS.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {JSDOM}=require(process.env.P3_SELECTOR_TEST_MODULES ? path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom') : 'jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
Object.assign(global,{window:dom.window,document:dom.window.document,navigator:dom.window.navigator,IS_REACT_ACT_ENVIRONMENT:true});
dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
const React=require('react'),{createRoot}=require('react-dom/client');
const root=createRoot(document.getElementById('root')),pushes=[],saves=[];
let cancelled=false,previewCalls=0;
let draftDeleted=false;
let draftInvoice={id_factura_cliente:'draft',updated_at:'2026-09-16T00:00:00.000Z',verifactu_estado_envio:'borrador',lineas:[],ordenes:[],datos_fiscales:{}};
let order={id_orden:'C-1/1',id_contrato:'contract',numero_orden:'1/1',id_cuenta:'client',cliente:'Cliente',id_agente:'actor',agente:'Aceptador',id_propuesta:'proposal',nombre_propuesta:'Propuesta',agente_propuesta:'Comercial',contacto_propuesta:'Contacto',fecha_firma_propuesta:'16/09/2026',cobro_total:121,base_imponible:100,con_iva:true,cobrada:false,fecha_teorica_cobro:'30/12/2026',fecha_real_cobro:'',forma_cobro:'recibo',banco_cobro:'Sabadell',comentarios:'',id_contacto_cobro:'',contactos_cuenta:[{id_contacto:'contact',nombre_completo_contacto:'Contacto'}],factura:{id_factura_cliente:'F1',numero_factura:'F1',fecha_emision:'2026-09-16',lineas:[],otras_ordenes:[{id_orden:'C-2/2',cobro_total:121}]}};
const service={
  getOrdenAdministrativa:async()=>({...order}),
  updateOrdenAdministrativa:async(id,patch)=>{saves.push(patch);order={...order,...patch};return {...order};},
  previewCancellation:async()=>{previewCalls++;return {version:'checked',recibos:[{numero_recibo:'F1-001'}],factura:{numero:'F1',accion:'eliminar'},bloqueos:[]};},
  cancelOrden:async(id,version)=>{assert.equal(version,'checked');cancelled=true;order={...order,cancelada:true};return {...order};},
  getOrdenesAdministrativas:async()=>[{id_orden:'ACTIVE',cobrada:false},{id_orden:'CANCELLED',cancelada:true,cobrada:false}],
};
function load(file){const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;const mod={exports:{}};new Function('require','module','exports',js)(id=>{
  if(id==='next/link')return {__esModule:true,default:({children,...props})=>React.createElement('a',props,children)};
  if(id==='next/navigation')return {useRouter:()=>({push:value=>pushes.push(value)})};
  if(id.includes('OrdenService'))return {OrdenService:service};
  if(id.includes('FacturaService'))return {FacturaService:{getFacturaCliente:async()=>draftInvoice,deleteFacturaCliente:async(id,version)=>{assert.equal(id,'draft');assert.equal(version,draftInvoice.updated_at);draftDeleted=true;return {deleted:true};}}};
  if(id.includes('AgenteService'))return {AgenteService:{getAgentes:async()=>[{id_agente:'actor',nombre_completo_agente:'Aceptador'}]}};
  if(id.includes('MiddleNav')||id.includes('AdministrativeExcelModal'))return {__esModule:true,default:()=>null};
  if(id==='../CancelOrderModal')return load('app/dashboard/administracion/control-administrativo/CancelOrderModal.tsx');
  if(id==='../DeleteDraftModal')return load('app/dashboard/administracion/facturas-clientes/DeleteDraftModal.tsx');
  if(id.includes('SearchableSelect'))return load('app/components/SearchableSelect.tsx');
  return require(id);
},mod,mod.exports);return mod.exports;}
const click=label=>React.act(async()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent===label);assert(b,`Missing ${label}`);b.click();});
const toggle=label=>React.act(async()=>document.querySelector(`[role="switch"][aria-label="${label}"]`).click());
const type=(input,value)=>React.act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
(async()=>{
  const Page=load('app/dashboard/administracion/control-administrativo/[...id_orden]/page.tsx').default;
  const params=Promise.resolve({id_orden:['C-1','1']});
  await React.act(async()=>{root.render(React.createElement(Page,{params}));await params;});
  assert.deepEqual([...document.querySelectorAll('h2')].map(e=>e.textContent),['Datos de la orden','Factura asociada','Cobro','Otros datos de la orden']);
  assert(!document.querySelector('button[type="submit"]'));
  assert.equal(document.querySelectorAll('input[type="date"]').length,0);
  assert.equal(document.querySelector('[aria-label="Importe con IVA"][role="switch"]').getAttribute('aria-checked'),'true');
  assert.equal(document.querySelector('input[aria-label="Base imponible"]').value,'100.00');
  assert(document.querySelector('input[aria-label="Base imponible"]').readOnly);
  assert(!document.querySelector('input[aria-label="Fecha real de cobro: día"]'));
  await toggle('Importe con IVA');assert(document.querySelector('input[aria-label="Importe total"]'));assert(!document.querySelector('input[aria-label="Base imponible"]'));
  assert(document.querySelector('button[type="submit"]').classList.contains('fixed'));
  await toggle('Importe con IVA');assert(!document.querySelector('button[type="submit"]'));
  await type(document.querySelector('input[aria-label="Importe con IVA"]'),'121.00');assert(!document.querySelector('button[type="submit"]'));
  await type(document.querySelector('input[aria-label="Importe con IVA"]'),'242');assert.equal(document.querySelector('input[aria-label="Base imponible"]').value,'200.00');
  await toggle('Estado de cobro');assert(document.querySelector('input[aria-label="Fecha real de cobro: día"]'));
  await type(document.querySelector('input[aria-label="Fecha real de cobro: día"]'),'16');
  await type(document.querySelector('input[aria-label="Fecha real de cobro: mes"]'),'09');
  await type(document.querySelector('input[aria-label="Fecha real de cobro: año"]'),'2026');
  await React.act(async()=>document.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
  assert.equal(saves[0].cobro_total,'242');assert.equal(saves[0].fecha_real_cobro,'16/09/2026');assert.equal(saves[0].cobrada,true);assert(!('id_agente'in saves[0]));
  assert(!document.querySelector('button[type="submit"]'));
  await toggle('Estado de cobro');assert(!document.querySelector('input[aria-label="Fecha real de cobro: día"]'));
  await React.act(async()=>{const select=document.querySelector('select[aria-label="Otras órdenes de la factura"]');select.value='C-2/2';select.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});
  assert.equal(pushes.at(-1),'/dashboard/administracion/control-administrativo/C-2/2');
  await click('Cancelar orden');assert(document.querySelector('dialog[open]'));assert.equal(previewCalls,0);assert(!cancelled);
  await React.act(async()=>document.querySelector('dialog').dispatchEvent(new dom.window.Event('cancel',{cancelable:true})));
  assert(!document.querySelector('dialog'));
  await click('Cancelar orden');await React.act(async()=>document.querySelector('button[aria-label="Cerrar"]').click());assert(!document.querySelector('dialog'));
  await click('Cancelar orden');await click('Revisar cancelación');assert.equal(previewCalls,1);assert(!cancelled);assert(document.querySelector('dialog').textContent.includes('F1-001'));
  await click('Confirmar cancelación');assert(cancelled);assert(!document.querySelector('dialog'));assert(![...document.querySelectorAll('button')].some(b=>b.textContent==='Cancelar orden'));
  const List=load('app/dashboard/administracion/control-administrativo/page.tsx').default;
  await React.act(async()=>root.render(React.createElement(List)));
  assert(document.querySelector('tbody').textContent.includes('ACTIVE'));assert(!document.querySelector('tbody').textContent.includes('CANCELLED'));
  await click('Canceladas (1)');assert(document.querySelector('tbody').textContent.includes('CANCELLED'));assert(!document.querySelector('tbody').textContent.includes('ACTIVE'));
  const Invoice=load('app/dashboard/administracion/facturas-clientes/[id_factura]/page.tsx').default;
  const invoiceParams=Promise.resolve({id_factura:'draft'});
  await React.act(async()=>{root.render(React.createElement(Invoice,{params:invoiceParams}));await invoiceParams;});
  await click('Eliminar borrador');assert(document.querySelector('dialog[open]'));assert(!draftDeleted);
  await React.act(async()=>document.querySelector('dialog').dispatchEvent(new dom.window.Event('cancel',{cancelable:true})));assert(!document.querySelector('dialog'));assert(!draftDeleted);
  await click('Eliminar borrador');await React.act(async()=>[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Eliminar borrador').click());
  assert(draftDeleted);assert.equal(pushes.at(-1),'/dashboard/administracion/facturas-clientes');
  draftInvoice={...draftInvoice,verifactu_estado_envio:'factura emitida'};
  const emittedParams=Promise.resolve({id_factura:'emitted'});
  await React.act(async()=>{root.render(React.createElement(Invoice,{key:'emitted',params:emittedParams}));await emittedParams;});
  assert(![...document.querySelectorAll('button')].some(b=>b.textContent==='Eliminar borrador'));
  await React.act(async()=>root.unmount());console.log('PASS: renamed sections, floating dirty-only save/revert, VAT/dates, cancellation tabs, draft deletion modal/Escape and emitted invoice protection.');
})().catch(e=>{console.error(e);process.exitCode=1;});
