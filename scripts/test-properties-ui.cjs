const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const {JSDOM}=require(process.env.P3_SELECTOR_TEST_MODULES?path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom'):'jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
Object.assign(global,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(global,'navigator',{configurable:true,value:dom.window.navigator});
dom.window.HTMLElement.prototype.scrollIntoView=function(){};
const React=require('react'),{act}=React,{createRoot}=require('react-dom/client');
const mini={id_propiedad:'mini',tipo:'vehiculo',nombre:'Mini Countryman',identificador:'',direccion:'',referencia_catastral:'',marca:'MINI',modelo:'Countryman',notas:'',activo:true,updated_at:'2026-11-03T12:00:00.000Z',cargos_vigentes:1};
const parking={...mini,id_propiedad:'parking',tipo:'parking',nombre:'Casp 50–52 · B05',identificador:'CASP-50-52-B05',conjunto:'Parking Casp, 50-52',plaza:'B05',direccion:'Casp 50-52',direccion_catastral:'Casp 50, 2PP5B',cargos_vigentes:0};
const catalog={cargos:[{id_cargo_recurrente:'70',nombre_proveedor:'TRADIS',activo:true,tipo_cargo:'proveedor',programacion:[{id_regla:'a23',descripcion:'Plaza A23',total_iva:96.31},{id_regla:'b05',descripcion:'Plaza B05',total_iva:54.9}]}],proveedores:[]};
let associated,saved,rejectSave=false;
const service={
 list:async()=>({propiedades:[mini,parking],...catalog}),
 get:async(id)=>({propiedad:id==='mini'?mini:parking,cargos:[{...catalog.cargos[0],programacion:[catalog.cargos[0].programacion[1]],estado:'vigente',id_regla:'b05',notas:'Derrama individual',propiedades_vinculadas:8,tipo_programacion:'fechas',termina_planificacion:true}],movimientos:[{id_linea_banco:'refund',banco:'Santander',fecha_operativa:'03/11/2026',fecha_valor:'26/10/2026',concepto:'Devolución seguro anterior',importe:559.95,estado_revision:false,relacion:'devolucion',notas:'Abono del seguro anterior.'}]}),
 save:async(id,body)=>{if(rejectSave)throw Error('La propiedad ha cambiado. Recarga antes de guardar.');saved={id,body};return {...body,id_propiedad:'created'};},
 associate:async(id,body)=>{associated={id,body};},detach:async()=>({ok:true})
};
const cache=new Map();
function load(file){
 const filename=path.resolve(file);if(cache.has(filename))return cache.get(filename).exports;
 const m=new Module(filename,module);m.filename=filename;m.paths=module.paths;cache.set(filename,m);const original=m.require.bind(m);
 m.require=id=>{
  if(id.includes('PropertyService'))return {PropertyService:service};
  if(id==='next/link')return {__esModule:true,default:props=>React.createElement('a',props)};
  if(id.startsWith('@/')||id.startsWith('.')){const base=id.startsWith('@/')?id.slice(2):path.resolve(path.dirname(filename),id);const found=['','.tsx','.ts','.js'].map(ext=>base+ext).find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());return load(found);}
  return original(id);
 };
 m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,filename);return m.exports;
}
const Page=load('app/dashboard/direccion/propiedades/page.tsx').default,root=createRoot(document.getElementById('root'));
global.fetch=async()=>({ok:true,json:async()=>({...catalog.cargos[0],tipo_programacion:'fechas',movimientos:[],updated_at:mini.updated_at})});
const click=async(text,scope=document)=>{const node=[...scope.querySelectorAll('button')].find(b=>b.textContent===text);assert(node,text);await act(async()=>node.click());};
const write=async(node,value)=>{assert(node);await act(async()=>{const proto=node.tagName==='SELECT'?dom.window.HTMLSelectElement.prototype:dom.window.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(node,value);node.dispatchEvent(new dom.window.Event(node.tagName==='SELECT'?'change':'input',{bubbles:true}));});};
(async()=>{
 await act(async()=>root.render(React.createElement(Page)));
 const filters=document.querySelector('details');assert(filters);assert.equal(filters.open,false);assert.equal(document.querySelectorAll('details').length,1);
 const groups=document.querySelector('[aria-label="Plazas por parking"]');assert(groups.textContent.includes('Parking Casp, 50-52'));assert(groups.textContent.includes('1 plaza'));
 assert.equal(document.querySelectorAll('tbody tr').length,2,'Agrupar no crea otra propiedad');
 await click('B05',groups);assert(document.querySelector('[role=dialog]').textContent.includes('Casp 50–52 · B05'));
 await act(async()=>window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'})));
 await write(filters.querySelector('input'),'No existe');assert(document.body.textContent.includes('No hay propiedades con estos filtros.'));
 await write(filters.querySelector('input'),'');
 await act(async()=>document.querySelector('tbody tr[aria-label="Abrir Mini Countryman"]').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
 let modal=document.querySelector('[role=dialog]');assert(modal);assert(modal.textContent.includes('03/11/2026'));assert(modal.textContent.includes('Valor: 26/10/2026'));
 assert(modal.textContent.includes('54,90'));assert(!modal.textContent.includes('96,31'),'La ficha muestra solo la regla vinculada');
 assert(modal.textContent.includes('compartido entre 8 propiedades'));
 await click('Editar cargo',modal);assert.equal(document.querySelectorAll('[role=dialog]').length,2);
 await act(async()=>window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'})));assert.equal(document.querySelectorAll('[role=dialog]').length,1);
 await write(modal.querySelector('input'),'Nombre pendiente de guardar');
 const combo=modal.querySelector('[aria-label="Cargo previsto existente"]');
 await act(async()=>combo.click());await act(async()=>document.querySelector('[role=option]').click());
 const scope=combo.closest('fieldset');await write(scope.querySelector('select'),'b05');
 await click('Asociar cargo',modal);assert.equal(associated.body.id_regla,'b05');assert.equal(associated.body.id_cargo_recurrente,'70');assert.equal(associated.body.expectedVersion,mini.updated_at);
 assert.equal(modal.querySelector('input').value,'Nombre pendiente de guardar','Asociar un cargo conserva los cambios pendientes de la ficha');
 await act(async()=>combo.click());await act(async()=>document.querySelector('[role=option]').click());await write(combo,'texto sin elegir');
 assert([...modal.querySelectorAll('button')].find(b=>b.textContent==='Asociar cargo').disabled,'Escribir invalida la selección anterior');
 await click('Crear cargo asociado',modal);
 assert.equal(document.querySelectorAll('[role=dialog]').length,2);const child=[...document.querySelectorAll('[role=dialog]')].at(-1);assert(!child.querySelector('option[value=nomina]'));
 await act(async()=>window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'})));
 assert.equal(document.querySelectorAll('[role=dialog]').length,1,'Escape del cargo conserva la ficha');
 rejectSave=true;await click('Guardar propiedad',document.querySelector('[role=dialog]'));assert(document.querySelector('[role=alert]').textContent.includes('Recarga antes de guardar'));
 await act(async()=>window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'})));assert(!document.querySelector('[role=dialog]'));
 rejectSave=false;await click('Registrar propiedad');modal=document.querySelector('[role=dialog]');await write(modal.querySelector('input'),'Nueva plaza');
 await click('Registrar propiedad',modal);assert.equal(saved.id,null);assert.equal(saved.body.nombre,'Nueva plaza');assert.equal(saved.body.tipo,'parking');
 assert(document.querySelector('[aria-label=Cerrar]'),'Siempre hay un cierre visible');
 assert(!document.querySelector('input[type=date]'));
 await act(async()=>root.unmount());console.log('PASS: filtros, ficha por teclado, fechas bancarias, selección válida, regla individual, conflictos, alta y Escape en modales anidados.');
})().catch(error=>{console.error(error);process.exitCode=1;});
