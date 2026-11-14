const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {JSDOM}=require('jsdom'),dom=new JSDOM('<div id="root"></div>',{url:'https://erp.test'});
Object.assign(global,{window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true});
dom.window.HTMLElement.prototype.scrollIntoView=function(){};
const React=require('react'),{createRoot}=require('react-dom/client'),cache=new Map(),calls=[],downloads=[];
URL.createObjectURL=()=> 'blob:test';URL.revokeObjectURL=()=>{};dom.window.HTMLAnchorElement.prototype.click=function(){downloads.push(this.download);};
const state='Material OK - pendiente de publicar';
const content=(id,type,position,pages,section)=>({id_contenido:id,tipo:type,nombre_contenido:id==='cover'?'Portada comercial':'Artículo técnico',nombre_empresa:id==='cover'?'Empresa Azul':'Empresa Verde',estado_contenido:state,formato_revista:'impreso_digital',maquetacion_produccion:{[type]:{posicion:position,paginas:pages,seccion:section,id_material:'pdf-'+id}},materiales:[{id_material:'pdf-'+id,es_version_acabada:true,pdf_paginas:pages,numero_version:1,nombre_material:id+'.pdf'}]});
const contents=[content('cover','anuncios',-1,1,'Inicial'),content('article','articulos',1,2,'Noticias')];
const entry=(row,position)=>({id_contenido:row.id_contenido,tipo:row.tipo,...row.maquetacion_produccion[row.tipo],posicion:position});
const views={impresa:{soporte:'impresa',estado:'pendiente',version:1,revision:'print-1',total_paginas:8,contenidos:contents,entradas:[entry(contents[0],-1),entry(contents[1],1)],estados:{impresa:'pendiente',digital:'pendiente'}},digital:{soporte:'digital',estado:'pendiente',version:1,revision:'digital-1',total_paginas:8,contenidos:contents,entradas:[entry(contents[0],-1),entry(contents[1],3)],estados:{impresa:'pendiente',digital:'pendiente'}}};
const api={get:async(url,options={})=>{calls.push(['get',url,options]);if(url.endsWith('/descarga'))return {data:{nombre:'revista-digital.pdf',files:[],pages:[]}};if(url.endsWith('/maqueta'))return {data:structuredClone(views[options.params.soporte])};return {data:{revista:{revista:'Revista prueba',edicion:'España',numero_publicacion:'99'},contenidos:contents}};},post:async(url,payload)=>{calls.push(['post',url,payload]);const view=views[payload.soporte];view.version++;view.revision=payload.soporte+'-'+view.version;if(payload.accion==='estado'){view.estado=payload.estado;for(const v of Object.values(views))v.estados[payload.soporte]=payload.estado;}if(payload.accion==='contenido'){view.entradas=view.entradas.filter(row=>row.id_contenido!==payload.entrada.id_contenido||row.tipo!==payload.entrada.tipo);view.entradas.push(payload.entrada);}return {data:structuredClone(view)};}};
let merged=0;
function load(file){if(cache.has(file))return cache.get(file);const mod={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8').replaceAll('import.meta.url',JSON.stringify('https://erp.test/module.js')),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id==='next/link')return function MockLink(props){return React.createElement('a',props,props.children);};
  if(id==='next/navigation')return {useParams:()=>({id_revista:'issue'}),useRouter:()=>({push(){}})};
  if(id==='@/app/apiClient')return api;
  if(id.endsWith('/mergeMagazinePdf'))return {mergeMagazinePdf:async()=>{merged++;return new Uint8Array([1,2,3]);}};
  if(id.endsWith('/PdfLayoutThumbnail'))return function MockThumbnail(props){return React.createElement('div',{'data-pdf':props.material,'data-page':props.page,className:'flex h-[178px] items-center justify-center overflow-hidden bg-slate-50'},React.createElement('svg',{viewBox:'0 0 120 165',width:125,height:174,'aria-hidden':true},React.createElement('rect',{width:120,height:165,fill:'white',stroke:'#cbd5e1'}),React.createElement('rect',{x:10,y:15,width:100,height:props.material==='pdf-cover'?60:24,fill:'#172554'}),React.createElement('text',{x:10,y:110,fontSize:10,fill:'#172554'},props.material==='pdf-cover'?'PORTADA':'ARTÍCULO TÉCNICO'),React.createElement('text',{x:10,y:130,fontSize:9,fill:'#64748b'},'Parte '+props.page)));};
  if(id.endsWith('/ProductionTable'))return function MockTable(props){return React.createElement('div',{'data-contents-table':true},props.rows.map(row=>row.nombre_contenido).join(', '));};
  if(id.startsWith('@/')||id.startsWith('.')){const base=id.startsWith('@/')?id.slice(2):path.join(path.dirname(file),id);return load([base,...['.tsx','.ts','.js'].map(ext=>base+ext)].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile()));}
  return require(id);
 },mod,mod.exports);cache.set(file,mod.exports);return mod.exports;}
const root=createRoot(document.getElementById('root')),click=async node=>{assert(node);await React.act(async()=>node.click());};
const button=text=>[...document.querySelectorAll('button')].find(node=>node.textContent===text);
const change=async(node,value)=>{assert(node);await React.act(async()=>{Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node),'value').set.call(node,value);node.dispatchEvent(new dom.window.Event(node.tagName==='SELECT'?'change':'input',{bubbles:true}));});};
(async()=>{
 const View=load('app/dashboard/produccion/gestion-contenidos/revista/[id_revista]/MagazineLayout.tsx').default;
 await React.act(async()=>root.render(React.createElement(View,{magazineId:'issue'})));
 assert(document.querySelector('[aria-label="Miniatura de la maqueta"]'));assert(document.querySelector('[aria-label="Contenidos de la maqueta"]'));
 assert.equal(document.querySelector('[aria-label="Contenidos de la maqueta"] details').open,false);
 if(process.env.P3_LAYOUT_PREVIEW_HTML){const output=process.env.P3_LAYOUT_PREVIEW_HTML,cssDir=path.join(path.dirname(output),'layout-build','.next','static','css');const links=fs.readdirSync(cssDir).filter(file=>file.endsWith('.css')).map(file=>'<link rel="stylesheet" href="./layout-build/.next/static/css/'+file+'">').join('');fs.writeFileSync(output,'<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Revisión de maqueta P3ERP</title>'+links+'</head><body><main style="max-width:1440px;margin:0 auto;padding:24px"><h1 style="font-size:24px;font-weight:600;color:#172554;margin-bottom:20px">Revista de prueba · Fase 6 · Maqueta</h1>'+document.getElementById('root').innerHTML+'</main></body></html>');}
 assert.equal(document.querySelectorAll('[aria-label="Contenidos de la maqueta"] article').length,3);
 assert(document.getElementById('maqueta-impresa--1').getAttribute('aria-label').includes('física 1'));
 assert(document.getElementById('maqueta-impresa-1').getAttribute('aria-label').includes('parte 1/2'));
 assert(document.getElementById('maqueta-impresa-2').getAttribute('aria-label').includes('parte 2/2'));
 await change(document.querySelector('[aria-label="Filtrar contenidos de maqueta"]'),'Azul');assert.equal(document.querySelectorAll('[aria-label="Contenidos de la maqueta"] article').length,1);
 await change(document.querySelector('[aria-label="Filtrar contenidos de maqueta"]'),'');
 await change(document.querySelector('[aria-label="Estado de la maqueta"]'),'publicada');
 assert(calls.some(call=>call[0]==='post'&&call[2].accion==='estado'&&call[2].soporte==='impresa'&&call[2].expectedVersion===1));
 assert.equal(button('Configurar contenido').disabled,true);
 await click(button('Digital - pendiente'));assert(document.getElementById('maqueta-digital-3').getAttribute('aria-label').includes('Artículo técnico'));assert.equal(button('Configurar contenido').disabled,false);
 await click(button('Descargar todos (PDF)'));assert.equal(merged,1);assert.deepEqual(downloads,['revista-digital.pdf']);assert(calls.some(call=>call[1].endsWith('/descarga')&&call[2].params.soporte==='digital'));
 await click([...document.querySelectorAll('button')].filter(node=>node.textContent==='Editar posición / PDF').at(-1));assert(document.querySelector('[role="dialog"]'));
 await React.act(async()=>window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'})));assert.equal(document.querySelector('[role="dialog"]'),null);
 const Workflow=load('app/dashboard/produccion/gestion-contenidos/revista/[id_revista]/page.tsx').default;
 await React.act(async()=>root.render(React.createElement(Workflow)));
 await click([...document.querySelectorAll('button')].find(node=>node.textContent.startsWith('Fase 6')));
 assert(document.querySelector('[data-contents-table]'),'Contenidos conserva la tabla anterior');
 const tabs=document.querySelector('[aria-label="Vista de fase 6"]');assert(tabs.className.includes('justify-between'));assert.equal(button('Contenidos').getAttribute('aria-selected'),'true');
 await click(button('Maqueta'));assert(document.querySelector('[aria-label="Miniatura de la maqueta"]'));assert.equal(document.querySelector('[data-contents-table]'),null);
 await click(button('Contenidos'));assert(document.querySelector('[data-contents-table]'));
 await React.act(async()=>root.unmount());console.log('PASS: tabla conservada, pestañas separadas, soportes/estado, miniaturas, partes, filtros, modal con Escape y una única descarga PDF.');
})().catch(error=>{console.error(error);process.exitCode=1;});
