const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {JSDOM}=require(process.env.P3_SELECTOR_TEST_MODULES?path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom'):'jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/dashboard'});
Object.assign(global,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});Object.defineProperty(global,'navigator',{configurable:true,value:dom.window.navigator});
const React=require('react'),{createRoot}=require('react-dom/client'),root=createRoot(document.getElementById('root')),cache=new Map(),navigation=[];
let pathname='/dashboard';
const rows=[{id_contenido:'waiting',nombre_contenido:'Esperando material',estado_contenido:'Pendiente Publicar',fase:'recibir',fase_nombre:'Contratado pendiente de recibir'}, {id_contenido:'process',nombre_contenido:'En maquetación',estado_contenido:'Pendiente maquetación',fase:'maquetacion'}, {id_contenido:'incident',nombre_contenido:'Material con incidencia',estado_contenido:'Pendiente corrección',fase:'correccion',motivo_atencion:'Incidencia pendiente de resolver'}];
function load(file){
 if(cache.has(file))return cache.get(file);const m={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id==='next/navigation')return {useRouter:()=>({push:href=>navigation.push(href)}),usePathname:()=>pathname};
  if(id==='next/link')return {__esModule:true,default:({children,...props})=>React.createElement('a',props,children)};
  if(id==='@/app/apiClient')return {__esModule:true,default:{get:async url=>{assert.equal(url,'/api/v1/dashboard/mis-contenidos');return {data:rows};}}};
  if(id.startsWith('@/')||id.startsWith('.')){const base=id.startsWith('@/')?id.slice(2):path.join(path.dirname(file),id);return load([base,base+'.tsx',base+'.ts',base+'.js'].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile()));}
  return require(id);
 },m,m.exports);cache.set(file,m.exports);return m.exports;
}
const click=async(text)=>{const node=[...document.querySelectorAll('button')].find(n=>n.textContent===text);assert(node,text);await React.act(async()=>node.click());};
(async()=>{
 const {contentAttentionReason}=load('app/lib/myContents.js');
 assert.equal(contentAttentionReason({estado_contenido:'Publicado',deadline_contenido:'01/01/2000'}),'');
 assert.equal(contentAttentionReason({estado_contenido:'Pendiente Publicar',deadline_contenido:'07/11/2026'},'2026-11-07'),'');
 assert.equal(contentAttentionReason({estado_contenido:'Pendiente Publicar',deadline_contenido:'06/11/2026'},'2026-11-07'),'Fecha límite vencida');
 const Panel=load('app/components/contents/MyContentsPanel.tsx').default;
 await React.act(async()=>root.render(React.createElement(Panel)));
 assert.deepEqual([...document.querySelectorAll('[role=tab]')].map(n=>n.textContent),['Requiere atención (1)','Pendiente (1)','En proceso (2)']);
 assert(document.querySelector('tbody').textContent.includes('Material con incidencia'));assert(!document.querySelector('tbody').textContent.includes('Esperando material'));
 await click('Pendiente (1)');assert(document.querySelector('tbody').textContent.includes('Esperando material'));assert.equal(document.querySelectorAll('tbody tr').length,1);
 await click('En proceso (2)');assert.equal(document.querySelectorAll('tbody tr').length,2);assert(!document.querySelector('tbody').textContent.includes('Esperando material'));
 await React.act(async()=>document.querySelector('tbody tr').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
 assert.equal(navigation.at(-1),'/dashboard/produccion/repositorio/contenidos/process');
 for(const [file,url,title] of [['gestion-contenidos','/dashboard/produccion/gestion-contenidos/revista/rev_216','Gestión contenidos'],['repositorio','/dashboard/produccion/repositorio/materiales/material_1','Almacenamiento de producción']]){
  pathname=url;const Layout=load(`app/dashboard/produccion/${file}/layout.tsx`).default;
  await React.act(async()=>root.render(React.createElement(Layout,null,React.createElement('div',{'data-page':true},'Ficha'))));
  assert.equal(document.querySelector('h2').textContent,title);assert(document.querySelector('[data-page]'));
  assert(![...document.querySelectorAll('a')].some(a=>a.getAttribute('href')==='/dashboard/produccion/gestion-contenidos'));
  assert(![...document.querySelectorAll('a')].some(a=>a.getAttribute('href')==='/dashboard/produccion/repositorio/materiales'));
 }
 await React.act(async()=>root.unmount());dom.window.close();console.log('PASS: subpestanas y contadores, atencion sin perder su fase, navegacion y midnav en todas las fichas sin enlaces a carpetas inexistentes.');
})().catch(error=>{console.error(error);process.exitCode=1;});
