const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const {JSDOM}=require(process.env.P3_SELECTOR_TEST_MODULES ? path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom') : 'jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
Object.assign(global,{window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
dom.window.HTMLElement.prototype.scrollIntoView=function(){};
const React=require('react'),{createRoot}=require('react-dom/client'),{act}=React;
function load(file){
  const filename=path.resolve(file),m=new Module(filename,module);m.filename=filename;m.paths=module.paths;
  const original=m.require.bind(m);
  m.require=id=>{
    if(id.startsWith('@/')||id.startsWith('./')||id.startsWith('../')){
      const base=id.startsWith('@/')?id.slice(2):path.resolve(path.dirname(filename),id);
      return load(['','.tsx','.ts','.js'].map(ext=>base+ext).find(candidate=>fs.existsSync(candidate)&&fs.statSync(candidate).isFile()));
    }
    return original(id);
  };
  m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,filename);
  return m.exports;
}
const Wizard=load('app/dashboard/direccion/tesoreria/BankReviewWizard.tsx').default;
const remesas=[{id_remesa:'REM-1',importe_total:300,numero_recibos:2,recibos_sin_orden:0,fecha_teorica:'15/09/2026',cobrada:false},{id_remesa:'REM-OTHER',importe_total:600,numero_recibos:1,recibos_sin_orden:0,cobrada:false,fecha_teorica:'15/09/2026'},{id_remesa:'REM-PAID',importe_total:300,numero_recibos:1,cobrada:true}];
const orders=[{id_orden:'TRANSFER',forma_cobro:'transferencia',cobro_total:50,id_cuenta:'client',cliente:'Cliente'},{id_orden:'RECEIPT',forma_cobro:'recibo',cobro_total:50,id_cuenta:'client'}];
orders.push({id_orden:'GROUP-A',forma_cobro:'transferencia',cobro_total:30,id_cuenta:'client',cliente:'Cliente'},{id_orden:'GROUP-B',forma_cobro:'transferencia',cobro_total:20,id_cuenta:'client',cliente:'Cliente'},{id_orden:'OTHER-CLIENT',forma_cobro:'transferencia',cobro_total:20,id_cuenta:'another',cliente:'Otro cliente'});
let saved;
global.fetch=async(url,options)=>{if(url.endsWith('/revision/memoria'))return {ok:true,json:async()=>({alerts:[],resolved:[],criteria:[],history:[],notes:[],occurrences:[],applications:[],lines:[]})};if(options?.method==='PUT'){saved=JSON.parse(options.body);return {ok:true,json:async()=>[]};}return {ok:true,json:async()=>url.includes('tipo=remesas')?remesas:url.endsWith('/cargos-recurrentes')?[{id_cargo_recurrente:99,tipo_cargo:'otro',tipo_programacion:'fechas',programacion:[{dia:22,mes:9,anio:2026,total_iva:360,descripcion:'Caja prevista'}]}]:url.endsWith('/ordenes-cobro')?orders:url.endsWith('/cuentas')?[{id_cuenta:'client',nombre_empresa:'Cliente'}]:[]};};
const root=createRoot(document.getElementById('root'));
const click=async text=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent===text);assert(button,text);await act(async()=>button.click());};
const select=async(node,value)=>act(async()=>{node.value=value;node.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});
const choose=async(label,text)=>{await act(async()=>document.querySelector(`[aria-label="${label}"]`).focus());const options=[...document.querySelectorAll('[role="option"]')];assert(!options.some(o=>o.textContent.includes('REM-PAID') || o.textContent.includes('RECEIPT')));const target=options.find(o=>o.textContent.includes(text));assert(target,text);await act(async()=>target.click());};
(async()=>{
  const lines=[{id_linea_banco:'income1',importe:300,fecha_valor:'15/09/2026',updated_at:'v'},{id_linea_banco:'income2',importe:50,fecha_valor:'15/09/2026',updated_at:'v'}];
  await act(async()=>root.render(React.createElement(Wizard,{lines,all:lines,onSaved(){},onClose(){},modal:true})));
  await click('Continuar'); // Analysis is separate from identifying income.
  assert.equal(document.querySelectorAll('nav[aria-label="Fases"] button').length,3);
  assert(!document.querySelector('[aria-label="Tipo de ingreso income1"]'));
  await click('Continuar');
  await click('Continuar');assert.match(document.querySelector('[role="alert"]').textContent,/tipo/);
  await select(document.querySelector('[aria-label="Tipo de ingreso income1"]'),'remesa');
  await click('Cuadrar por fecha e importe');
  await choose('Remesa registrada','REM-1');
  assert(document.body.textContent.includes('Total seleccionado: 300'));
  await select(document.querySelector('[aria-label="Tipo de ingreso income2"]'),'transferencia');
  await choose('Orden de transferencia','TRANSFER');
  await click('Continuar');
  assert.equal(document.querySelector('h2').textContent,'Revisión final');
  await click('Confirmar');
  assert.equal(saved.items[0].incomeType,'remesa');assert.deepEqual(saved.items[0].remesaIds,['REM-1']);
  assert.equal(saved.items[1].incomeType,'transferencia');assert.equal(saved.items[1].orderId,'TRANSFER');assert.equal(saved.items[1].entityId,'client');
  const grouped=[{id_linea_banco:'group-income',importe:50,fecha_valor:'15/09/2026',updated_at:'v'}];
  await act(async()=>root.render(React.createElement(Wizard,{key:'group-income',lines:grouped,all:grouped,onSaved(){},onClose(){},modal:true})));
  await click('Continuar');await click('Continuar');await select(document.querySelector('[aria-label="Tipo de ingreso group-income"]'),'transferencia');
  await choose('Orden de transferencia','GROUP-A');
  await act(async()=>document.querySelector('[aria-label="Orden de transferencia"]').focus());assert(![...document.querySelectorAll('[role="option"]')].some(o=>o.textContent.includes('OTHER-CLIENT')));
  await choose('Orden de transferencia','GROUP-B');
  assert(document.body.textContent.includes('Total seleccionado: 50'));
  await act(async()=>document.querySelector('[aria-label="Quitar orden GROUP-A"]').click());
  await click('Continuar');assert.match(document.querySelector('[role="alert"]').textContent,/importe/);
  await choose('Orden de transferencia','GROUP-A');await click('Continuar');await click('Confirmar');
  assert.deepEqual(saved.items[0].orderIds,['GROUP-B','GROUP-A']);assert.equal(saved.items[0].entityId,'client');
  const withdrawals=[{id_linea_banco:'cash1',importe:-360,updated_at:'v'},{id_linea_banco:'cash2',importe:-370,updated_at:'v'}];
  await act(async()=>root.render(React.createElement(Wizard,{key:'cash',lines:withdrawals,all:withdrawals,onSaved(){},onClose(){},modal:true})));
  await click('Continuar');await click('Continuar');
  const recipient=document.querySelector('[aria-label="Tipo cash1"]');assert.equal([...recipient.options].at(-1).textContent,'Otro');
  await select(recipient,'otro');assert(!document.querySelector('[aria-label="Seleccionar destinatario"]'));
  assert.equal(document.querySelectorAll('nav[aria-label="Fases"] button').length,4);
  for(let i=0;i<2;i++)await click('Continuar');await click('Confirmar');
  assert(saved.items.every(item=>item.entityType==='otro'&&!item.entityId&&!item.chargeId));
  await act(async()=>root.render(React.createElement(Wizard,{key:'cash-planned',lines:withdrawals,all:withdrawals,onSaved(){},onClose(){},modal:true})));
  await click('Continuar');await click('Continuar');await select(document.querySelector('[aria-label="Tipo cash1"]'),'otro');await click('Continuar');
  const chargeSelect=[...document.querySelectorAll('select')].find(n=>[...n.options].some(o=>o.value==='99'));assert(chargeSelect);await select(chargeSelect,'99');
  await click('Continuar');await click('Confirmar');
  assert(saved.items.every(item=>item.entityType==='otro'&&item.chargeId==='99'&&item.expectedSchedule[0].total_iva===360));
  await act(async()=>root.unmount());dom.window.close();console.log('PASS: income classification and Otro withdrawal batch through all review phases.');
})().catch(e=>{console.error(e);process.exitCode=1;});
