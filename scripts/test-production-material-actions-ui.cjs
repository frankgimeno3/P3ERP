const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {JSDOM}=require(process.env.P3_SELECTOR_TEST_MODULES?path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom'):'jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
Object.assign(global,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});Object.defineProperty(global,'navigator',{configurable:true,value:dom.window.navigator});
const React=require('react'),{createRoot}=require('react-dom/client'),cache=new Map(),calls=[],downloads=[];let saved=0;
function load(file){if(cache.has(file))return cache.get(file);const m={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>{if(id==='@/app/apiClient')return {__esModule:true,default:{post:async(url,data)=>{calls.push({url,data});return {data:{}};}}};if(id==='@/app/lib/productionDownloads')return {downloadContentMaterials:async(...args)=>downloads.push(args)};if(id.startsWith('@/')||id.startsWith('.')){const base=id.startsWith('@/')?id.slice(2):path.join(path.dirname(file),id);return load(['.tsx','.ts','.js'].map(ext=>base+ext).find(fs.existsSync));}return require(id);},m,m.exports);cache.set(file,m.exports);return m.exports;}
const root=createRoot(document.getElementById('root')),Actions=load('app/dashboard/produccion/hoja_produccion/[id]/MaterialManageActions.tsx').default;
const click=async text=>{const node=[...document.querySelectorAll('button')].find(n=>n.textContent===text);assert(node,text);await React.act(async()=>node.click());};
const props={contentId:'contenido',material:{id_material:'material',nombre_material:'Original.pdf',descripcion_material:'Anterior',updated_at:'2026-11-07T10:00:00Z'},allowDownload:true,onSaved:async()=>{saved++;}};
(async()=>{
 await React.act(async()=>root.render(React.createElement(Actions,props)));
 await click('Eliminar material');assert(document.querySelector('[role=dialog]').textContent.includes('El archivo original se conserva'));assert(document.querySelector('[aria-label="Cerrar"]'));
 await React.act(async()=>window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'})));assert(!document.querySelector('[role=dialog]'));assert.equal(calls.length,0);
 await click('Eliminar material');await click('Eliminar y enviar a papelera');assert.equal(calls.at(-1).data.accion,'eliminar');assert.equal(calls.at(-1).data.confirmado,true);assert.equal(calls.at(-1).data.version,props.material.updated_at);assert.equal(saved,1);assert(!document.querySelector('[role=dialog]'));
 await click('Editar material');const input=document.querySelector('input');await React.act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(input,'Nuevo nombre');input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});await click('Guardar material');assert.equal(calls.at(-1).data.nombre_material,'Nuevo nombre');assert.equal(calls.at(-1).data.accion,'editar');
 await click('Descargar');assert.deepEqual(downloads.at(-1),['contenido',['material']]);
 await React.act(async()=>root.render(React.createElement(Actions,{...props,material:{...props.material,eliminado_at:'2026-11-07T11:00:00Z'}})));assert(![...document.querySelectorAll('button')].some(n=>n.textContent==='Eliminar material'));await click('Restaurar');await click('Restaurar material');assert.equal(calls.at(-1).data.accion,'restaurar');
 await React.act(async()=>root.unmount());dom.window.close();console.log('PASS: edición, confirmación de eliminación, restauración, Escape/×, versiones optimistas y descarga desde el contenido.');
})().catch(e=>{console.error(e);process.exitCode=1;});
