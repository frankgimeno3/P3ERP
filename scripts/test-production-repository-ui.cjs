const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {JSDOM}=require(process.env.P3_SELECTOR_TEST_MODULES?path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom'):'jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/dashboard/produccion/repositorio'});
Object.assign(global,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(global,'navigator',{configurable:true,value:dom.window.navigator});
dom.window.HTMLElement.prototype.scrollIntoView=function(){};
const React=require('react'),{createRoot}=require('react-dom/client'),root=createRoot(document.getElementById('root')),cache=new Map(),navigation=[],writes=[];
const magazines=[['Vidrio Plano','Iberia'],['Ventanas','Iberia'],['Vidrio Plano','América Latina'],['Ventanas','América Latina'],['Quién es Quién','Vidrio'],['Quién es Quién','Ventanas'],['Hueco Arquitectura','2026']].map(([revista,edicion],i)=>({id_revista:'rev'+i,revista,edicion,numero_publicacion:String(i+100)}));
const contents=[
 {id_contenido:'waiting',nombre_contenido:'Contratado sin material',tipo:'anuncios',id_contrato:'contract',estado_contenido:'Pendiente Publicar',materiales:[]},
 {id_contenido:'writing',nombre_contenido:'Artículo redacción',tipo:'articulos',estado_contenido:'Pendiente redacción',materiales:[]},
 {id_contenido:'layout',nombre_contenido:'Anuncio maquetación',tipo:'anuncios',estado_contenido:'Pendiente maquetación',materiales:[],pagina_hoja:'12, 13',nombre_empresa:'Empresa',nombre_completo_agente:'Agente'},
 {id_contenido:'correction',nombre_contenido:'Anuncio corrección',tipo:'anuncios',estado_contenido:'Pendiente corrección',materiales:[]},
 {id_contenido:'review',nombre_contenido:'Artículo revisión',tipo:'articulos',estado_contenido:'Pendiente revisión',materiales:[]},
 {id_contenido:'published',nombre_contenido:'Ya publicado',tipo:'anuncios',estado_contenido:'Publicado GRATIS',materiales:[]},
 {id_contenido:'cancelled',nombre_contenido:'Cancelado',tipo:'articulos',estado_contenido:'ANULADO',materiales:[]},
];
const materials=[{id_material:'raw',nombre_material:'Original recibido',id_contenido:'layout',es_version_acabada:false},{id_material:'v1',nombre_material:'Acabado inicial',id_contenido:'layout',es_version_acabada:true,numero_version:1},{id_material:'v2',nombre_material:'Acabado corregido',id_contenido:'layout',es_version_acabada:true,numero_version:2}];
const api={get:async(url,config)=>({data:url.endsWith('/presign')?{}:url.endsWith('/gestiones-produccion')?magazines:url.includes('/gestiones-produccion/')?{revista:magazines[0],contenidos:contents}:config?.params?.tipo==='materiales'?materials:contents}),post:async(url,data)=>{writes.push({url,data});return {data:url.endsWith('/presign')?{uploadUrl:'https://upload.invalid',mediaId:'uuid',s3Key:'key'}:{}};}};
global.fetch=async()=>({ok:true});
function load(file){
 if(cache.has(file))return cache.get(file);const m={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id==='next/navigation')return {useRouter:()=>({push:url=>navigation.push(url)}),useParams:()=>({id:'layout',id_revista:'rev0'})};
  if(id==='next/link')return {__esModule:true,default:({children,...props})=>React.createElement('a',props,children)};
  if(id==='@/app/apiClient')return {__esModule:true,default:api};
  if(id.includes('ContenidoService'))return {ContenidoService:{getContenidoById:async()=>({...contents[2],estado:'Pendiente maquetación'}),updateContenido:async()=>({})}};
  if(id.includes('AgenteService'))return {AgenteService:{getAgentes:async()=>[]}};
  if(id.includes('MaterialService'))return {MaterialService:{getMaterial:async()=>materials[0]}};
  if(id.startsWith('@/')||id.startsWith('.')){const base=id.startsWith('@/')?id.slice(2):path.join(path.dirname(file),id);return load([base,base+'.tsx',base+'.ts',base+'.js'].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile()));}
  return require(id);
 },m,m.exports);cache.set(file,m.exports);return m.exports;
}
const render=async(file)=>React.act(async()=>root.render(React.createElement(load(file).default)));
const click=async(label)=>{const n=[...document.querySelectorAll('button')].find(n=>n.textContent===label);assert(n,label);await React.act(async()=>n.click());};
const rowNames=()=>document.querySelector('tbody').textContent;
(async()=>{
 const {articleMatchesMagazine}=load('app/config/editorialMagazine.js');
 assert(articleMatchesMagazine({revista:'Vidrio',especial_numero:'104'},magazines[4]));
 assert(!articleMatchesMagazine({revista:'Ventanas',especial_numero:'104'},magazines[4]));
 const {canonicalProductionPath}=load('app/config/productionRoutes.js');
 for(const old of ['/dashboard/produccion/gestion/layout','/dashboard/produccion/contenidos/layout','/dashboard/produccion/hoja_produccion/layout'])assert.equal(canonicalProductionPath(old),'/dashboard/produccion/repositorio/contenidos/layout');
 assert.equal(canonicalProductionPath('/dashboard/produccion/gestion/revistas/rev0/contenidos'),'/dashboard/produccion/gestion-contenidos/revista/rev0');
 assert.equal(canonicalProductionPath('/dashboard/mediateca'),'/dashboard/direccion/mediateca');
 await render('app/dashboard/produccion/gestion-contenidos/revista/page.tsx');
 assert.equal(document.querySelectorAll('[role=tab]').length,7);assert(document.querySelector('header button').textContent==='Agregar contenidos');
 assert(document.querySelector('header a').href.endsWith('/gestion-contenidos/otros'));
 for(const [i,tab] of [...document.querySelectorAll('[role=tab]')].entries()){
  await React.act(async()=>tab.click());assert.equal(document.querySelectorAll('tbody tr').length,1);assert(rowNames().includes(String(100+i)));
 }
 await React.act(async()=>document.querySelector('tbody tr').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
 assert.equal(navigation.at(-1),'/dashboard/produccion/gestion-contenidos/revista/rev6');
 await render('app/dashboard/produccion/gestion-contenidos/revista/[id_revista]/page.tsx');
 assert(rowNames().includes('Contratado sin material'));assert(document.querySelector('[aria-label="Tipo de contenido"]').textContent.includes('Anuncios (1)'));
 await click('1 · Pendiente redacción');await click('Artículos (1)');assert(rowNames().includes('Artículo redacción'));
 await click('2 · Pendiente maquetación');await click('Anuncios (1)');assert(rowNames().includes('12, 13'));assert(rowNames().includes('Empresa'));assert(rowNames().includes('Agente'));
 await click('Subir versión');assert(document.querySelector('[role=dialog]'));
 const file=document.querySelector('input[type=file]');Object.defineProperty(file,'files',{value:[new dom.window.File(['pdf'],'version.pdf',{type:'application/pdf'})]});
 await React.act(async()=>file.dispatchEvent(new dom.window.Event('change',{bubbles:true})));
 await React.act(async()=>document.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
 assert.equal(writes.at(-1).data.es_version_acabada,true);assert.equal(writes.at(-1).data.id_contenido,'layout');
 await click('Aportar material');await React.act(async()=>window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'})));assert(!document.querySelector('[role=dialog]'));
 await click('3 · Pendiente corrección');assert(rowNames().includes('Anuncio corrección'));
 await click('4 · Pendiente revisión');await click('Artículos (1)');assert(rowNames().includes('Artículo revisión'));
 await click('5 · Todo');assert(document.querySelector('[aria-label="Tipo de contenido"]').textContent.includes('Anuncios (3)'));assert(!rowNames().includes('Ya publicado'));assert(!rowNames().includes('Cancelado'));
 await render('app/dashboard/produccion/repositorio/page.tsx');assert(rowNames().includes('Ya publicado'));assert(rowNames().includes('Cancelado'));
 assert(![...document.querySelectorAll('button')].some(n=>/Agregar|Aportar|Subir/.test(n.textContent)));
 await click('Materiales');assert(rowNames().includes('Original recibido'));assert(rowNames().includes('V02'));
 await render('app/dashboard/produccion/repositorio/contenidos/[id]/page.tsx');
 assert.deepEqual([...document.querySelectorAll('h2')].map(n=>n.textContent),['1 · Datos y detalles','2 · Materiales','3 · Versión acabada']);
 assert(document.querySelector('section:nth-of-type(2) a').href.endsWith('/repositorio/materiales/raw'));
 assert.deepEqual([...document.querySelectorAll('tbody tr td:first-child')].map(n=>n.textContent),['V02','V01']);
 assert(![...document.querySelectorAll('button')].some(n=>/Agregar|Aportar|Subir/.test(n.textContent)));
 await React.act(async()=>root.unmount());dom.window.close();
 console.log('PASS: seven publications, whole-row navigation, phases and counts, upload from management, repository includes terminal states, cards and descending versions without creation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
