const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {JSDOM}=require(process.env.P3_SELECTOR_TEST_MODULES?path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom'):'jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
Object.assign(global,{window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,FormData:dom.window.FormData,IS_REACT_ACT_ENVIRONMENT:true});
const React=require('react'),{createRoot}=require('react-dom/client');
const params=new URLSearchParams('origen=contrato&id_contrato=C1'),calls=[],cache=new Map();let billed=true;
const orders=()=>[{id_orden:'O1',id_factura:billed?'F1':null,numero_factura:billed?'526001':'',cobro_total:100,fecha_teorica_cobro:'01/11/2026',forma_cobro:'transferencia',banco_cobro:'Santander'},{id_orden:'O2',cobro_total:100,fecha_teorica_cobro:'01/12/2026',forma_cobro:'transferencia',banco_cobro:'Santander'}];
const services={getContratosFacturables:async()=>[],getOrdenesFacturables:async()=>[],getOrigenFactura:async(source)=>({source,contract:{id_contrato:'C1'},account:{nombre_empresa:'Cuenta de prueba',pais_facturacion:'España'},orders:source==='orden'?[orders()[1]]:orders()}),createFacturaSeleccionada:async body=>{
 calls.push({kind:'create',body});const selected=orders().filter(row=>body.id_ordenes.includes(row.id_orden)),total=selected.reduce((s,row)=>s+row.cobro_total,0);
 return {id_factura_cliente:'invoice',id_contrato:'C1',moneda:'EUR',datos_importacion:{facturacion_por_ordenes:true},datos_fiscales:{nombre_fiscal:'Cuenta de prueba',pais:'España'},lineas:[{concepto:'Servicio',cantidad:1,precio_unitario:total,base_imponible:total,iva_porcentaje:0,importe_total:total}],cobros:selected.map(row=>({...row,fecha_cobro:row.fecha_teorica_cobro,importe_cobro:row.cobro_total}))};
},updateFacturaCliente:async(id,body)=>{calls.push({kind:'update',body});const value=load('app/config/invoicePricing.js').calculateInvoicePricing(body.lineas,body.ajustes_importe);return {...body,...value,cobros:body.ordenes_nuevas||body.cobros};}};
function load(file){if(cache.has(file))return cache.get(file);const mod={exports:{}};const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',js)(id=>{
  if(id==='next/navigation')return {usePathname:()=>'/dashboard/administracion/facturas-clientes/crear',useSearchParams:()=>params,useRouter:()=>({push(){}})};
  if(id==='next/link')return {__esModule:true,default:props=>React.createElement('a',props)};
  if(id.includes('MiddleNav'))return {__esModule:true,default:()=>null};
  if(id.includes('FacturaService'))return {FacturaService:services};
  if(id.includes('/liquidaciones/Subscriptions'))return {Modal:({title,close,children})=>React.createElement('div',{role:'dialog'},React.createElement('h2',null,title),React.createElement('button',{onClick:close},'×'),children)};
  if(id.startsWith('@/')){const base=id.slice(2);return load(['.tsx','.ts','.js'].map(ext=>base+ext).find(fs.existsSync));}
  if(id.startsWith('.')){const base=path.join(path.dirname(file),id);return load(['.tsx','.ts','.js'].map(ext=>base+ext).find(fs.existsSync));}
  return require(id);
 },mod,mod.exports);cache.set(file,mod.exports);return mod.exports;
}
const root=createRoot(document.getElementById('root'));
const button=text=>[...document.querySelectorAll('button')].find(node=>node.textContent===text);
const click=async text=>{const node=button(text);assert(node,text);assert(!node.disabled,text+' disabled');await React.act(async()=>node.click());};
const change=async(node,value)=>{assert(node);await React.act(async()=>{const proto=node.tagName==='SELECT'?dom.window.HTMLSelectElement.prototype:dom.window.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(node,value);node.dispatchEvent(new dom.window.Event(node.tagName==='SELECT'?'change':'input',{bubbles:true}));});};
(async()=>{
 const Page=load('app/dashboard/administracion/facturas-clientes/crear/page.tsx').default;
 await React.act(async()=>root.render(React.createElement(Page,{key:'billed'})));
 assert(document.body.textContent.includes('Facturada en la factura 526001'));
 assert.equal(document.querySelector('[role="switch"]').disabled,true);assert.equal(document.querySelector('input[aria-label="Facturar O1"]').checked,false);assert.equal(calls.length,0,'Prefilling must not create an invoice');
 await click('Continuar con las órdenes seleccionadas');assert.deepEqual(calls[0].body.id_ordenes,['O2']);
 await change(document.querySelector('input[aria-label="Precio unitario 1"]'),'120');await click('Guardar y continuar');
 assert(document.body.textContent.includes('Datos de pago'));assert.equal(document.querySelector('input[aria-label="Importe cobro 1"]').value,'120');assert(!document.body.textContent.includes('O1'));
 const method=[...document.querySelectorAll('label')].find(node=>node.textContent.startsWith('Forma de cobro')).querySelector('select');await change(method,'recibo');
 const bank=[...document.querySelectorAll('label')].find(node=>node.textContent.startsWith('Banco')).querySelector('select');assert.equal(bank.value,'Sabadell');
 await click('Guardar y continuar');assert(document.querySelector('[role="dialog"]'));await click('Guardar cobros y continuar');
 const payload=calls.find(item=>item.kind==='update'&&item.body.ordenes_nuevas).body.ordenes_nuevas;assert.equal(payload.length,1);assert.equal(payload[0].forma_cobro,'recibo');assert.equal(payload[0].importe_cobro,120);
 assert(document.body.textContent.includes('Datos fiscales y VeriFactu'));assert([...document.querySelectorAll('input')].some(node=>node.value==='Cuenta de prueba'));
 params.set('origen','orden');params.delete('id_contrato');params.set('id_orden','O2');await React.act(async()=>root.render(React.createElement(Page,{key:'order'})));
 assert.equal(document.querySelectorAll('input[type="checkbox"]').length,1);assert(document.querySelector('input[aria-label="Facturar O2"]').disabled);
 billed=false;params.set('origen','contrato');params.delete('id_orden');params.set('id_contrato','C1');await React.act(async()=>root.render(React.createElement(Page,{key:'all'})));
 const toggle=document.querySelector('[role="switch"]');assert.equal(toggle.getAttribute('aria-checked'),'true');assert([...document.querySelectorAll('input[type="checkbox"]')].every(node=>node.checked&&node.disabled));
 await React.act(async()=>toggle.click());assert([...document.querySelectorAll('input[type="checkbox"]')].every(node=>!node.disabled));
 await React.act(async()=>document.querySelector('input[aria-label="Facturar O1"]').click());await click('Continuar con las órdenes seleccionadas');assert.deepEqual(calls.filter(item=>item.kind==='create').at(-1).body.id_ordenes,['O2']);
 await React.act(async()=>root.unmount());dom.window.close();console.log('PASS: URL source preview without invoice side effects, billed cards and disabled all-orders mode, explicit subsets, line price editing, selected payments only, bank defaults and fiscal prefilling.');
})().catch(error=>{console.error(error);process.exitCode=1;});
