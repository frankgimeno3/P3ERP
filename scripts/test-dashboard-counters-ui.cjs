const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {JSDOM}=require(process.env.P3_SELECTOR_TEST_MODULES?path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom'):'jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/dashboard'});
Object.assign(global,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});Object.defineProperty(global,'navigator',{configurable:true,value:dom.window.navigator});
localStorage.setItem('userPayload',JSON.stringify({email:'agente@example.test',roles:['comercial']}));
const React=require('react'),{createRoot}=require('react-dom/client'),root=createRoot(document.getElementById('root')),cache=new Map(),requests=[];
const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit'}).formatToParts(new Date()),month=parts.find(p=>p.type==='year').value+'-'+parts.find(p=>p.type==='month').value;
const tasks=[{id:'t1',nombre:'Pendiente',estado:'pendiente',fecha_inicio:month+'-10'},{id:'t2',nombre:'Completada',estado:'completada',fecha_inicio:month+'-11'},{id:'t3',nombre:'Sin fecha',estado:'en_curso'},{id:'t4',nombre:'Otro mes',estado:'pendiente',fecha_inicio:'2099-01-01'}];
const contents=[{id_contenido:'c1',nombre_contenido:'Recibir',fase:'recibir'},{id_contenido:'c2',nombre_contenido:'Editar',fase:'redaccion'},{id_contenido:'c3',nombre_contenido:'Incidencia',fase:'maquetacion',motivo_atencion:'Incidencia'}];
const accounts=[{id_cuenta:'a1',nombre_empresa:'Cuenta propia',id_agente:'me'},{id_cuenta:'a2',nombre_empresa:'Segunda propia',id_agente:'me'},{id_cuenta:'a3',nombre_empresa:'Cuenta ajena',id_agente:'other'}];
let failContents=false,failProposals=false,emptyAccounts=false;
const api={get:async url=>{requests.push(url);if(url==='/api/v1/tareas')return {data:tasks.slice()};if(url==='/api/v1/tareas/colaboradores')return {data:[]};if(url==='/api/v1/dashboard/mis-contenidos'){if(failContents)throw Error('Contenidos inaccesibles');return {data:contents};}throw Error('URL inesperada '+url);},post:async(url,body)=>{assert.equal(url,'/api/v1/tareas/propias');tasks.push({...body,id:'created',estado:'pendiente'});return {data:{}};}};
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const mod={exports:{}};cache.set(file,mod.exports);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id==='next/navigation')return {useRouter:()=>({push(){}})};
  if(id==='next/link')return {__esModule:true,default:({children,...props})=>React.createElement('a',props,children)};
  if(id.includes('MiddleNav'))return {__esModule:true,default:()=>null};
  if(id==='@/app/apiClient')return {__esModule:true,default:api};
  if(id.includes('AgenteService'))return {AgenteService:{getAgentes:async()=>[{id_agente:'me',email_agente:'agente@example.test',nombre_completo_agente:'Agente propio',rol_agente:'comercial'}]}};
  if(id.includes('CuentaService'))return {CuentaService:{getCuentas:async()=>{requests.push('accounts');return emptyAccounts?[]:accounts;}}};
  if(id.includes('PropuestaService'))return {PropuestaService:{getPropuestas:async filters=>{requests.push('proposals');assert.equal(filters.agente,'me');assert.equal(filters.estado,'Pendiente');if(failProposals)throw Error('Propuestas inaccesibles');return [{id_propuesta:'p1',importe_total_bi_propuesta:100},{id_propuesta:'p2',importe_total_bi_propuesta:200}];}}};
  if(id.startsWith('@/')||id.startsWith('.')){const base=id.startsWith('@/')?id.slice(2):path.join(path.dirname(file),id);return load([base,base+'.tsx',base+'.ts',base+'.js'].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile()));}
  return require(id);
 },mod,mod.exports);cache.set(file,mod.exports);return mod.exports;
}
const tabs=label=>[...document.querySelectorAll(`[role=tablist][aria-label="${label}"] [role=tab]`)];
const click=async label=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent===label||b.textContent.startsWith(label+' ('));assert(button,label);await React.act(async()=>button.click());};
(async()=>{
 const Page=load('app/dashboard/page.tsx').default;await React.act(async()=>root.render(React.createElement(Page)));
 assert.deepEqual(tabs('Panel personal').map(t=>t.textContent),['Mis tareas (4)','Mis contenidos (3)','Mis cuentas (2)','Mis propuestas pendientes (2)']);
 assert.deepEqual(tabs('Mis tareas').map(t=>t.textContent),['Pendientes (3)','Todas (4)','Calendario (3)']);
 await click('Mis contenidos');assert.deepEqual(tabs('Mis contenidos').map(t=>t.textContent),['Requiere atención (1)','Pendiente (1)','En proceso (2)']);
 await click('Mis cuentas');assert.equal(document.querySelectorAll('tbody tr').length,2);assert(!document.querySelector('tbody').textContent.includes('Cuenta ajena'));
 await click('Mis propuestas pendientes');assert.equal(document.querySelectorAll('tbody tr').length,2);
 for(const key of ['/api/v1/tareas','/api/v1/dashboard/mis-contenidos','accounts','proposals'])assert.equal(requests.filter(item=>item===key).length,1,'Una única carga por conjunto aunque cambies de pestaña');
 await click('Mis tareas');await click('Calendario');await React.act(async()=>document.querySelector('[aria-label="Mes anterior"]').click());assert(tabs('Mis tareas').some(t=>t.textContent==='Calendario (1)'));
 tasks.push({id:'t5',nombre:'Nueva tarea',estado:'pendiente',fecha_inicio:month+'-12'});await React.act(async()=>window.dispatchEvent(new dom.window.Event('focus')));
 assert.equal(tabs('Panel personal')[0].textContent,'Mis tareas (5)');assert.equal(tabs('Mis tareas')[0].textContent,'Pendientes (4)');
 await click('Agregar tarea');const name=document.querySelector('[role=dialog] input');await React.act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(name,'Tarea creada');name.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});await click('Crear tarea');
 assert.equal(tabs('Panel personal')[0].textContent,'Mis tareas (6)');assert.equal(tabs('Mis tareas')[0].textContent,'Pendientes (5)');assert(tabs('Mis tareas').some(t=>t.textContent==='Calendario (5)'));
 failContents=true;failProposals=true;emptyAccounts=true;await React.act(async()=>window.dispatchEvent(new dom.window.Event('focus')));
 assert.equal(tabs('Panel personal')[1].textContent,'Mis contenidos (—)');assert.equal(tabs('Panel personal')[2].textContent,'Mis cuentas (0)');assert.equal(tabs('Panel personal')[3].textContent,'Mis propuestas pendientes (—)');
 await click('Mis contenidos');assert(tabs('Mis contenidos').every(t=>t.textContent.endsWith('(—)')));assert(document.querySelector('[role=alert]').textContent.includes('Contenidos inaccesibles'));
 failContents=false;await click('Reintentar');assert.equal(tabs('Panel personal')[1].textContent,'Mis contenidos (3)');
 await React.act(async()=>root.unmount());dom.window.close();console.log('PASS: contadores de todas las pestañas/subpestañas, datos compartidos sin consultas duplicadas, cuenta propia, mes del calendario, actualización al volver, errores distintos de cero y reintento.');
})().catch(error=>{console.error(error);process.exitCode=1;});
