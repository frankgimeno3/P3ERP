/* eslint-disable @typescript-eslint/no-require-imports -- isolated CommonJS TSX test harness */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const {JSDOM}=require(path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom'));
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
Object.assign(global,{window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
dom.window.HTMLElement.prototype.scrollIntoView=function(){};
const React=require('react'),{createRoot}=require('react-dom/client'),{act}=React;
function load(file){const filename=path.resolve(file),m=new Module(filename,module);m.filename=filename;m.paths=module.paths;const original=m.require.bind(m);m.require=id=>id==='@/app/components/SearchableSelect'?load('app/components/SearchableSelect.tsx'):id.startsWith('./')?load(path.join(path.dirname(file),id+'.tsx')):original(id);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,filename);return m.exports;}
const Wizard=load('app/dashboard/direccion/tesoreria/BankReviewWizard.tsx').default;
const remesas=[{id_remesa:'REM-1',importe_total:300,numero_recibos:2,recibos_sin_orden:0,fecha_teorica:'15/09/2026',cobrada:false},{id_remesa:'REM-OTHER',importe_total:600,numero_recibos:1,recibos_sin_orden:0,cobrada:false,fecha_teorica:'15/09/2026'},{id_remesa:'REM-PAID',importe_total:300,numero_recibos:1,cobrada:true}];
const orders=[{id_orden:'TRANSFER',forma_cobro:'transferencia',cobro_total:50,id_cuenta:'client',cliente:'Cliente'},{id_orden:'RECEIPT',forma_cobro:'recibo',cobro_total:50,id_cuenta:'client'}];
let saved;
global.fetch=async(url,options)=>{if(options?.method==='PUT'){saved=JSON.parse(options.body);return {ok:true,json:async()=>[]};}return {ok:true,json:async()=>url.includes('tipo=remesas')?remesas:url.endsWith('/ordenes')?orders:url.endsWith('/cuentas')?[{id_cuenta:'client',nombre_empresa:'Cliente'}]:[]};};
const root=createRoot(document.getElementById('root'));
const click=async text=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent===text);assert(button,text);await act(async()=>button.click());};
const select=async(node,value)=>act(async()=>{node.value=value;node.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});
const choose=async(label,text)=>{await act(async()=>document.querySelector(`[aria-label="${label}"]`).focus());const options=[...document.querySelectorAll('[role="option"]')];assert(!options.some(o=>o.textContent.includes('REM-PAID') || o.textContent.includes('RECEIPT')));const target=options.find(o=>o.textContent.includes(text));assert(target,text);await act(async()=>target.click());};
(async()=>{
  const lines=[{id_linea_banco:'income1',importe:300,fecha_valor:'15/09/2026',updated_at:'v'},{id_linea_banco:'income2',importe:50,fecha_valor:'15/09/2026',updated_at:'v'}];
  await act(async()=>root.render(React.createElement(Wizard,{lines,all:lines,onSaved(){},onClose(){},modal:true})));
  await click('Continuar');assert.match(document.querySelector('[role="alert"]').textContent,/tipo/);
  await select(document.querySelector('[aria-label="Tipo de ingreso income1"]'),'remesa');
  await click('Cuadrar por fecha e importe');
  await choose('Remesa registrada','REM-1');
  assert(document.body.textContent.includes('Total seleccionado: 300'));
  await select(document.querySelector('[aria-label="Tipo de ingreso income2"]'),'transferencia');
  await choose('Orden de transferencia','TRANSFER');
  for(let i=0;i<4;i++)await click('Continuar');
  await click('Confirmar');
  assert.equal(saved.items[0].incomeType,'remesa');assert.deepEqual(saved.items[0].remesaIds,['REM-1']);
  assert.equal(saved.items[1].incomeType,'transferencia');assert.equal(saved.items[1].orderId,'TRANSFER');assert.equal(saved.items[1].entityId,'client');
  await act(async()=>root.unmount());dom.window.close();console.log('PASS: income classification in phase 1, matching by amount/date, registered remittances only, transfer orders excluding receipts, five-phase batch confirmation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
