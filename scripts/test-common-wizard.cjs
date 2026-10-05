// Component interaction test; does not start an application server.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const {JSDOM}=require(process.env.P3_SELECTOR_TEST_MODULES ? path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom') : 'jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
Object.assign(global,{window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
dom.window.HTMLElement.prototype.scrollIntoView=function(){};
const React=require('react'),{createRoot}=require('react-dom/client'),{act}=React;
function load(file){const filename=path.resolve(file),m=new Module(filename,module);m.filename=filename;m.paths=module.paths;const original=m.require.bind(m);m.require=id=>{if(id==='@/app/lib/request')return {request:(...args)=>global.fetch(...args)};const candidate=id.startsWith('@/')?path.resolve(id.slice(2)):id.startsWith('.')?path.resolve(path.dirname(filename),id):'';if(candidate){const resolved=[candidate,candidate+'.tsx',candidate+'.ts',candidate+'.js'].find(file=>fs.existsSync(file)&&fs.statSync(file).isFile());if(resolved)return load(resolved);}return original(id);};m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,filename);return m.exports;}
const Wizard=load('app/dashboard/direccion/tesoreria/BankReviewWizard.tsx').default;
const schedule=[{cada:1,unidad:'meses',total_iva:1000,base_imponible:0,descripcion:'Sueldo'}];
let saved;
global.fetch=async(url,options)=>{if(options?.method==='PUT'){saved=JSON.parse(options.body);return {ok:true,json:async()=>({})};}const data=url.endsWith('/proveedores')?[{id_proveedor:'supplier',nombre_proveedor:'Proveedor'}]:url.endsWith('/empleados')?[{id_agente:'employee',nombre:'Empleado'}]:url.endsWith('/cargos-recurrentes')?[{id_cargo_recurrente:1,tipo_cargo:'nomina',id_agente:'employee',programacion:schedule,tipo_programacion:'periodicidad'}]:[];return {ok:true,json:async()=>data};};
const root=createRoot(document.getElementById('root'));
const click=async text=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent===text);assert(button,text);await act(async()=>button.click());};
(async()=>{
  const lines=Array.from({length:8},(_,i)=>({id_linea_banco:'line-'+i,importe:-1000,fecha_valor:'01/0'+(i+1)+'/2026',concepto:'Cargo',updated_at:'v'}));
  await act(async()=>root.render(React.createElement(Wizard,{key:'assign',compactAssignment:true,lines,all:lines,mode:'assign',onSaved(){},onClose(){},modal:true})));
  assert.equal(document.querySelectorAll('nav').length,0);
  assert.equal(document.querySelectorAll('select').length,0);
  await click('Confirmar');assert.equal(saved,undefined);assert(document.querySelector('[role="alert"]'));
  const recipients=document.querySelector('section[aria-label^="Elegir destinatario"] tbody tr');assert(recipients);
  await act(async()=>recipients.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
  await click('Confirmar');
  assert.equal(saved.mode,'assign');assert.equal(saved.items.length,8);assert(saved.items.every(item=>item.entityId==='supplier'&&!item.newCharge));
  await act(async()=>root.render(React.createElement(Wizard,{key:'forced',lines,all:lines,mode:'review',onSaved(){},onClose(){},modal:true})));
  const toggle=document.querySelector('[role="switch"][aria-label="Revisión directa"]');assert(toggle);await act(async()=>toggle.click());
  assert([...document.querySelectorAll('button')].find(button=>button.textContent==='Confirmar').disabled);
  const reason=document.querySelector('textarea[aria-label="Comentario de revisión directa"]');
  act(()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype,'value').set.call(reason,'Manual check');reason.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
  await click('Confirmar');assert.equal(saved.forcedComment,'Manual check');assert.equal(saved.action,'force-review');assert.equal(saved.ids.length,8);
  act(()=>root.unmount());dom.window.close();console.log('PASS common wizard: valid recipient required, keyboard selection, eight-line propagation, compact assignment without repeated phases and forced-review justification.');
})().catch(error=>{console.error(error);process.exitCode=1;dom.window.close();});
