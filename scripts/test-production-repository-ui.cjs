const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {JSDOM}=require(process.env.P3_SELECTOR_TEST_MODULES?path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom'):'jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/dashboard/produccion/repositorio'});
Object.assign(global,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(global,'navigator',{configurable:true,value:dom.window.navigator});
dom.window.HTMLElement.prototype.scrollIntoView=function(){};
const React=require('react'),{createRoot}=require('react-dom/client'),root=createRoot(document.getElementById('root')),cache=new Map(),navigation=[],writes=[];
const magazines=[['Vidrio Plano','Iberia'],['Ventanas','Iberia'],['Vidrio Plano','América Latina'],['Ventanas','América Latina'],['Quién es Quién','Vidrio'],['Quién es Quién','Ventanas'],['Hueco Arquitectura','2026']].map(([revista,edicion],i)=>({id_revista:'rev'+i,revista,edicion,numero_publicacion:String(i+100),version_publicacion:'digital',contenidos_pendientes:1,anuncios_pendientes:1,articulos_pendientes:0,pendiente_recibir:1,en_proceso:0}));
const groups=[{id_medio:'vidrioperfil_newsletter',nombre_medio:'Vidrioperfil newsletter'},{id_medio:'vidrioperfil_portal',nombre_medio:'Vidrioperfil portal'},{id_medio:'otros',nombre_medio:'Otros'},{id_medio:'revista',nombre_medio:'Revista'}];
const otherRows=[{id_contenido:'news',nombre_contenido:'Newsletter pendiente',estado_contenido:'Pendiente Publicar',grupo_servicio:'vidrioperfil_newsletter'}, {id_contenido:'portal',nombre_contenido:'Banner pendiente',estado_contenido:'Pendiente Publicar',grupo_servicio:'vidrioperfil_portal'}];
const magazinePending={id_contenido:'unassigned',nombre_contenido:'Revista sin destino',estado_contenido:'Pendiente Publicar',tipo_revista_servicio:'Revista',grupo_servicio:'revista',es_revista:false,updated_at:'2026-11-06T10:00:00.000Z',revistas_vinculadas:[]};
const contents=[
 {id_contenido:'waiting',nombre_contenido:'Contratado sin material',tipo:'anuncios',id_contrato:'contract',estado_contenido:'Contratado pendiente de recibir',materiales:[]},
 {id_contenido:'writing',nombre_contenido:'Artículo redacción',tipo:'articulos',estado_contenido:'Pendiente redacción',materiales:[]},
 {id_contenido:'layout',nombre_contenido:'Anuncio maquetación',tipo:'anuncios',estado_contenido:'Pendiente maquetación',materiales:[],pagina_hoja:'12, 13',paginas_ocupadas:2,nombre_empresa:'Empresa',nombre_completo_agente:'Agente'},
 {id_contenido:'article-layout',nombre_contenido:'Artículo listo para corrección',tipo:'articulos',estado_contenido:'Pendiente de gestionar Charly',materiales:[{id_material:'downloaded',descargado_produccion:true}]},
 {id_contenido:'correction',nombre_contenido:'Artículo corrección',tipo:'articulos',estado_contenido:'Pendiente corrección',materiales:[]},
 {id_contenido:'review',nombre_contenido:'Artículo revisión',tipo:'articulos',estado_contenido:'Pendiente revisión',materiales:[]},
 {id_contenido:'ready',nombre_contenido:'Anuncio aprobado',tipo:'anuncios',estado_contenido:'Material OK - pendiente de publicar',materiales:[]},
 {id_contenido:'published',nombre_contenido:'Ya publicado',tipo:'anuncios',estado_contenido:'Publicado GRATIS',materiales:[]},
 {id_contenido:'cancelled',nombre_contenido:'Cancelado',tipo:'articulos',estado_contenido:'ANULADO',materiales:[]},
];
const materials=[{id_material:'raw',nombre_material:'Original recibido',id_contenido:'layout',es_version_acabada:false},{id_material:'v1',nombre_material:'Acabado inicial',id_contenido:'layout',es_version_acabada:true,numero_version:1},{id_material:'v2',nombre_material:'Acabado corregido',id_contenido:'layout',es_version_acabada:true,numero_version:2}];
const api={get:async(url,config)=>({data:url.includes('/para-contenido/')?magazines:url.endsWith('/gestiones-produccion')?magazines:url.includes('/gestiones-produccion/')?{revista:magazines[0],contenidos:contents}:config?.params?.tipo==='materiales'?materials:config?.params?.tipo==='grupos'?groups:config?.params?.tipo==='pendientes-revista'?[magazinePending]:[...contents.map(row=>({...row,es_revista:true})),...otherRows,magazinePending]}),post:async(url,data)=>{writes.push({url,data});return {data:url.endsWith('/presign')?{uploadUrl:'https://upload.invalid',mediaId:'uuid',s3Key:'key'}:{}};}};
global.fetch=async()=>({ok:true});
function load(file){
 if(cache.has(file))return cache.get(file);const m={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id==='next/navigation')return {useRouter:()=>({push:url=>navigation.push(url)}),useParams:()=>({id:'layout',id_revista:'rev0'})};
  if(id==='next/link')return {__esModule:true,default:({children,...props})=>React.createElement('a',props,children)};
  if(id==='@/app/apiClient')return {__esModule:true,default:api};
  if(id.includes('ContenidoService'))return {ContenidoService:{getContenidoById:async()=>({...contents[2],id_cuenta:'company',id_contrato:'contract',estado:'Pendiente maquetación',tipo_contenido:'anuncio'}),updateContenido:async()=>({})}};
  if(id.includes('AgenteService'))return {AgenteService:{getAgentes:async()=>[]}};
  if(id.includes('MaterialService'))return {MaterialService:{getMaterial:async()=>materials[0]}};
  if(id.startsWith('@/')||id.startsWith('.')){const base=id.startsWith('@/')?id.slice(2):path.join(path.dirname(file),id);return load([base,base+'.tsx',base+'.ts',base+'.js'].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile()));}
  return require(id);
 },m,m.exports);cache.set(file,m.exports);return m.exports;
}
const render=async(file)=>React.act(async()=>root.render(React.createElement(load(file).default)));
const click=async(label)=>{const n=[...document.querySelectorAll('button')].find(n=>n.textContent===label||n.textContent.startsWith(label+' ('));assert(n,label);await React.act(async()=>n.click());};
const rowNames=()=>document.querySelector('tbody').textContent;
(async()=>{
 const {productionStage}=load('app/lib/productionWorkflow.js');
 assert.equal(productionStage({estado_contenido:'Pendiente revisión cliente'}),'revision');
 assert.equal(productionStage({estado_contenido:'Pendiente revisión'}),'revision','Conserva la fase de los registros históricos');
 assert.equal(productionStage({estado_contenido:'Material OK - pendiente de publicar'}),'publicacion');
 assert.equal(productionStage({estado_contenido:'Publicado',materiales:[{es_version_acabada:true}]}),'');
 assert.equal(productionStage({estado_contenido:'Pendiente Publicar',materiales:[{es_version_acabada:true}]}),'publicacion','Pendiente publicar se unifica en material OK');
 assert.equal(load('app/lib/myContents.js').matchesMyContentTab({estado_contenido:'Material OK - pendiente de publicar'},'proceso'),true);
 const {contentServiceGroup}=load('app/lib/contentServiceGroups.js');
 for(const [tipo_revista_servicio,expected] of [['NEWS 1','vidrioperfil_newsletter'],['BANNER VID.NEWS','vidrioperfil_newsletter'],['WEB LATAM','vidrioperfil_portal'],['BANER HOME','vidrioperfil_portal'],['Newsletter personalizado','newsletter_personalizado'],['Revista IMPRESA','revista'],['Suscripción','suscripcion'],['No Aplica','otros']])assert.equal(contentServiceGroup({tipo_revista_servicio}),expected);
 assert.equal(contentServiceGroup({id_medio:'otro_canal',tipo_revista_servicio:'NEWS 1'}),'otro_canal');
 const {articleMatchesMagazine}=load('app/config/editorialMagazine.js');
 assert(articleMatchesMagazine({revista:'Vidrio',especial_numero:'104'},magazines[4]));
 assert(!articleMatchesMagazine({revista:'Ventanas',especial_numero:'104'},magazines[4]));
 const {canonicalProductionPath}=load('app/config/productionRoutes.js');
 for(const old of ['/dashboard/produccion/gestion/layout','/dashboard/produccion/contenidos/layout','/dashboard/produccion/hoja_produccion/layout'])assert.equal(canonicalProductionPath(old),'/dashboard/produccion/repositorio/contenidos/layout');
 assert.equal(canonicalProductionPath('/dashboard/produccion/gestion/revistas/rev0/contenidos'),'/dashboard/produccion/gestion-contenidos/revista/rev0');
 assert.equal(canonicalProductionPath('/dashboard/mediateca'),'/dashboard/direccion/mediateca');
 await render('app/dashboard/produccion/gestion-contenidos/revista/page.tsx');
 assert(!document.querySelector('[aria-label="Contenidos de revista sin asignar"]'));assert.equal(document.querySelector('[aria-label="Asignación de revista"] button').textContent,'Contenidos revista pendientes publicar');assert.equal(document.querySelector('[aria-label="Asignación de revista"] button').getAttribute('aria-selected'),'true');assert.equal(document.querySelectorAll('[role=tab]').length,9);assert.deepEqual([...document.querySelectorAll('header button')].map(n=>n.textContent),['Agregar contenidos sin contrato','Agregar contenido asociado a contrato']);assert(!document.querySelector('header a'));
 assert(![...document.querySelectorAll('th')].some(n=>n.textContent==='Publicación'||n.textContent==='Edición'));assert([...document.querySelectorAll('th')].some(n=>n.textContent.startsWith('Anuncios pendientes')));
 const countFilter=document.querySelector('[aria-label="Filtrar Anuncios pendientes"]');assert(countFilter);
 for(const [value,count] of [['9',0],['',1]]){await React.act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(countFilter,value);countFilter.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});assert.equal(document.querySelectorAll('[role=tabpanel] tbody tr').length,count);}
 for(const [i,tab] of [...document.querySelectorAll('[aria-label="Publicación"] [role=tab]')].entries()){
  await React.act(async()=>tab.click());assert.equal(document.querySelectorAll('[role=tabpanel] tbody tr').length,1);assert(rowNames().includes(String(100+i)));
  if(i===0){assert(!rowNames().includes('Digital'));assert(!rowNames().includes('Impresa'));}
 }
 await React.act(async()=>document.querySelector('tbody tr').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
 assert.equal(navigation.at(-1),'/dashboard/produccion/gestion-contenidos/revista/rev6');
 await click('Pendientes de asignar revista');
 const unassigned=document.querySelector('[aria-label="Contenidos de revista sin asignar"]');assert(unassigned.textContent.includes('Revista sin destino'));
 await click('Asignar revista');assert(document.querySelector('[role=dialog]'));
 const destination=document.querySelector('[aria-label="Publicación de destino"]');
 await React.act(async()=>destination.click());await React.act(async()=>document.querySelector('[role=option]').click());
 await React.act(async()=>document.querySelector('[role=dialog] form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
 assert.equal(writes.at(-1).data.id_contenido,'unassigned');assert.equal(writes.at(-1).data.expectedVersion,magazinePending.updated_at);assert(writes.at(-1).url.endsWith('/rev0'));
 await render('app/dashboard/produccion/gestion-contenidos/revista/[id_revista]/page.tsx');
 assert.deepEqual([...document.querySelector('[aria-label="Fase de producción"]').querySelectorAll('button')].map(n=>n.textContent.replace(/ \(\d+\)$/,'')),['Fase 1','Fase 2','Fase 3','Fase 4','Fase 5','Fase 6','Todo']);
 assert.equal(document.querySelectorAll('[aria-label="Fase de producción"] button svg').length,7);
 assert.equal(document.querySelector('[aria-label="Fase de producción"]').children.length,2);
 assert.equal(document.querySelector('[aria-label="Fase de producción"]').firstElementChild.querySelectorAll('button').length,6);
 assert.equal(document.querySelector('[aria-label="Fase de producción"]').lastElementChild.textContent.replace(/ \(\d+\)$/, ''),'Todo');
 assert(document.querySelector('h2').textContent==='Contratado pendiente de recibir');
 assert(rowNames().includes('Contratado sin material'));assert(document.querySelector('[aria-label="Tipo de contenido"]').textContent.includes('Anuncios (1)'));
 await click('Fase 2');await click('Artículos (1)');assert(rowNames().includes('Artículo redacción'));assert(document.querySelector('h2').textContent==='Pendiente redacción');
 await click('Fase 3');await click('Anuncios a revisar y descargar (1)');assert(rowNames().includes('2'));assert(rowNames().includes('Empresa'));assert(rowNames().includes('Agente'));
 assert(![...document.querySelectorAll('th')].some(n=>n.textContent==='Materiales'));
 await click('3.2 · Pendiente enviar corrección');assert(!document.querySelector('[aria-label="Tipo de contenido"]'));assert.equal(document.querySelector('h2').textContent,'Artículos pendientes enviar a corrección');assert(rowNames().includes('Artículo listo para corrección'));assert(!rowNames().includes('Anuncio maquetación'));
 await click('Fase 4');await click('Corrección otros');assert(rowNames().includes('Artículo corrección'));assert(!document.querySelector('[aria-label="Tipo de contenido"]').textContent.includes('Anuncios'));
 await click('Fase 5');await click('Artículos (1)');assert(rowNames().includes('Artículo revisión'));assert.equal(document.querySelector('h2').textContent,'Pendiente revisión cliente');
 await click('Fase 6');await click('Anuncios (1)');assert(rowNames().includes('Anuncio aprobado'));assert.equal(document.querySelector('h2').textContent,'Material OK - pendiente de publicar');
 await click('Todo');assert(!document.querySelector('[aria-label="Tipo de contenido"]'));assert(rowNames().includes('Anuncio aprobado'));assert(rowNames().includes('Artículo revisión'));assert(!rowNames().includes('Ya publicado'));assert(!rowNames().includes('Cancelado'));
 await render('app/dashboard/produccion/gestion-contenidos/otros/page.tsx');
 assert([...document.querySelectorAll('th')].some(n=>n.textContent.startsWith('Fase')));assert(![...document.querySelectorAll('th')].some(n=>n.textContent.startsWith('Estado')));
 assert.equal(document.querySelectorAll('tbody tr').length,2);assert(![...document.querySelectorAll('th')].some(n=>n.textContent==='Materiales'));
 assert(!document.querySelector('tbody').textContent.includes('Revista sin destino'));assert(!document.querySelector('[aria-label="Grupo de servicios"]').textContent.includes('Revista'));
 assert(![...document.querySelectorAll('button')].some(n=>/Aportar|Subir/.test(n.textContent)));
 await click('Banner news (1)');assert(rowNames().includes('Newsletter pendiente'));assert(!rowNames().includes('Banner pendiente'));
 await click('Vidrioperfil portal (1)');assert(rowNames().includes('Banner pendiente'));assert(!rowNames().includes('Newsletter pendiente'));
 await render('app/dashboard/produccion/repositorio/page.tsx');assert(rowNames().includes('Ya publicado'));assert(rowNames().includes('Cancelado'));
 assert(![...document.querySelectorAll('button')].some(n=>/Agregar|Aportar|Subir/.test(n.textContent)));
 await click('Materiales');assert(rowNames().includes('Original recibido'));assert(rowNames().includes('V02'));
 await render('app/dashboard/produccion/repositorio/contenidos/[id]/page.tsx');
 assert(document.querySelector('a[href="/dashboard/comercial/cuentas/company"]'));assert(document.querySelector('a[href="/dashboard/comercial/contratos/contract"]'));
 assert.deepEqual([...document.querySelectorAll('h2')].map(n=>n.textContent),['1 · Datos y detalles','2 · Materiales','3 · Gestiones de producción','4 · Versión acabada']);
 assert(document.querySelector('section:nth-of-type(2) a').href.endsWith('/repositorio/materiales/raw'));
 assert.deepEqual([...document.querySelectorAll('tbody tr td:first-child')].map(n=>n.textContent),['V02','V01']);
 await click('Aportar material');assert(document.querySelector('[role=dialog]'));
 await React.act(async()=>window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'})));assert(!document.querySelector('[role=dialog]'));
 await click('Subir versión');assert(document.querySelector('[role=dialog]'));
 const file=document.querySelector('input[type=file]');Object.defineProperty(file,'files',{value:[new dom.window.File(['pdf'],'version.pdf',{type:'application/pdf'})]});
 await React.act(async()=>file.dispatchEvent(new dom.window.Event('change',{bubbles:true})));
 await React.act(async()=>document.querySelector('[role=dialog] form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
 assert.equal(writes.at(-1).data.es_version_acabada,true);assert.equal(writes.at(-1).data.id_contenido,'layout');assert.equal(writes.at(-1).data.materiales.length,1);assert.equal(writes.at(-1).data.materiales[0].nombre_material,'version.pdf');
 await React.act(async()=>root.unmount());dom.window.close();
 console.log('PASS: publication formats, phases, service groups and counts, no material actions in lists, upload from content detail, repository states and descending versions.');
})().catch(error=>{console.error(error);process.exitCode=1;});
