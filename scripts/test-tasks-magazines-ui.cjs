/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {JSDOM}=require(process.env.P3_SELECTOR_TEST_MODULES ? path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom') : 'jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
Object.assign(global,{window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
const React=require('react'),{createRoot}=require('react-dom/client'),cache=new Map(),calls=[];
const magazines=['Hueco Arquitectura','Quién es Quién','Ventanas, Puertas','Vidrio Plano'].flatMap((revista,i)=>['Iberia','América Latina'].map((edicion,j)=>({id_revista:`r${i}${j}`,revista,edicion,numero_publicacion:String(i*10+j),estado_publicacion:'pendiente de publicar'})));
const tasks=[{id:'one',nombre:'Por hacer',estado:'pendiente',descripcion:'Primera'},{id:'two',nombre:'Terminada',estado:'completada',descripcion:'Segunda'},{id:'three',nombre:'Trabajando',estado:'en_curso',descripcion:'Tercera'}];
const api={get:async url=>{calls.push(url);return {data:url.includes('revistas')?magazines:tasks};}};
function load(file){if(cache.has(file))return cache.get(file);const mod={exports:{}};const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;new Function('require','module','exports',js)(id=>{
 if(id==='next/link')return {__esModule:true,default:props=>React.createElement('a',props)};
 if(id==='@/app/apiClient')return {__esModule:true,default:api};
 if(id.includes('MiddleNav'))return {__esModule:true,default:()=>null};
 if(id.startsWith('@/'))return load(['.tsx','.ts','.js'].map(ext=>id.slice(2)+ext).find(fs.existsSync));
 if(id.startsWith('./'))return load(['.tsx','.ts','.js'].map(ext=>path.join(path.dirname(file),id)+ext).find(fs.existsSync));
 return require(id);
},mod,mod.exports);cache.set(file,mod.exports);return mod.exports;}
const root=createRoot(document.getElementById('root'));
const click=async text=>{const node=[...document.querySelectorAll('button')].find(n=>n.textContent===text);assert(node,text);await React.act(async()=>node.click());};
(async()=>{
 const Tasks=load('app/components/tasks/TaskList.tsx').default;
 await React.act(async()=>root.render(React.createElement(Tasks)));
 assert(calls.includes('/api/v1/tareas'));assert(document.body.textContent.includes('Por hacer'));assert(document.body.textContent.includes('Trabajando'));assert(!document.querySelector('tbody').textContent.includes('Terminada'));
 assert.equal(document.querySelector('tbody a').getAttribute('href'),'/tareas/one');
 assert([...document.querySelectorAll('details')].every(d=>!d.open));
 await click('Terminadas');assert(document.querySelector('tbody').textContent.includes('Terminada'));assert(!document.querySelector('tbody').textContent.includes('Por hacer'));
 await React.act(async()=>root.render(React.createElement(Tasks,{employee:'employee',key:'employee'})));
 assert(calls.includes('/api/v1/tareas?agente=employee'));assert(document.querySelector('tbody a').getAttribute('href').includes('?gestion=1'));
 const Revistas=load('app/dashboard/produccion/revistas/page.tsx').default;
 await React.act(async()=>root.render(React.createElement(Revistas)));
 assert.deepEqual([...document.querySelectorAll('[aria-label="Revistas pendientes"] button')].map(b=>b.textContent),['Vidrio Plano','Ventanas, Puertas','Quién es Quién','Hueco Arquitectura']);
 assert.equal(document.querySelectorAll('details').length,1);assert(!document.querySelector('details').open);
 assert.equal(document.querySelectorAll('[aria-label="Ediciones"] button').length,2);
 assert(!document.querySelector('thead').textContent.includes('Edición'));assert(!document.querySelector('[aria-label="Filtrar Edición"]'));
 assert.equal(document.querySelectorAll('tbody tr').length,1);
 await click('Iberia');assert.equal(document.querySelector('tbody td').textContent,'30');
 await click('Quién es Quién');assert.equal(document.querySelectorAll('[aria-label="Ediciones"] button').length,2);assert.equal(document.querySelectorAll('tbody tr').length,1);
 await click('Calendario');assert.equal(document.querySelectorAll('tbody tr').length,8);assert.equal(document.querySelector('thead th').textContent,'Número');assert(!document.querySelector('[aria-label="Ediciones"]'));
 let submitted;api.post=async(url,body)=>{assert.equal(url,'/api/v1/tareas/propias');submitted=body;return {data:{}};};
 const OwnPanel=load('app/components/tasks/MyTasksPanel.tsx').default;
 await React.act(async()=>root.render(React.createElement(OwnPanel)));
 await click('Agregar tarea');assert(document.querySelector('[role="dialog"]'));assert(!document.querySelector('[role="dialog"] select'));
 const title=document.querySelector('[role="dialog"] input');
 await React.act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(title,'Mi nueva tarea');title.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
 await click('Crear tarea');assert.equal(submitted.nombre,'Mi nueva tarea');assert(!('agente' in submitted));assert(!document.querySelector('[role="dialog"]'));
 await click('Agregar tarea');await React.act(async()=>window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'})));assert(!document.querySelector('[role="dialog"]'));
 await React.act(async()=>root.unmount());console.log('PASS: task modal creation, self-assignment payload, refresh and Escape; task and magazine navigation');
})().catch(e=>{console.error(e);process.exitCode=1;});
