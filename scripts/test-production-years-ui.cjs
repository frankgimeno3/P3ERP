/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {JSDOM}=require(process.env.P3_SELECTOR_TEST_MODULES ? path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom') : 'jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
Object.assign(global,{window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
const React=require('react'),{createRoot}=require('react-dom/client'),cache=new Map(),calls=[];
function load(file){
  if(cache.has(file))return cache.get(file);
  const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  const mod={exports:{}};
  new Function('require','module','exports',js)(id=>{
    if(id.includes('MiddleNav'))return {__esModule:true,default:()=>null};
    if(id==='next/navigation')return {useRouter:()=>({push(){}})};
    if(id==='next/link')return {__esModule:true,default:({children,href})=>React.createElement('a',{href},children)};
    if(id.includes('HojaProduccionService'))return {HojaProduccionService:{getContenidos:async()=>['2025','2027','Anteriores',''].flatMap((year,i)=>[{id_contenido:'content'+i,ano_publicacion:year,cliente:'Customer '+i,contrato:'contract',estado:'pendiente',es_revista:true},{id_contenido:'other'+i,ano_publicacion:year,cliente:'Other '+i,contrato:'contract',estado:'pendiente',es_revista:false,tipo:'Web',material:'Recibido'}])}};
    if(id.includes('AgenteService'))return {AgenteService:{getAgentes:async()=>[{id_agente:'agent',nombre_completo_agente:'Nombre del agente'}]}};
    if(id.includes('ContenidoService'))return {ContenidoService:{updateContenido:async(id,data)=>{calls.push({id,data});return {id_contenido:id,...data};}}};
    if(id.startsWith('@/')){const base=id.slice(2);return load(['.tsx','.ts','.js'].map(ext=>base+ext).find(fs.existsSync));}
    if(id.startsWith('.')){const base=path.resolve(path.dirname(file),id);return load(['.tsx','.ts','.js'].map(ext=>base+ext).find(fs.existsSync));}
    return require(id);
  },mod,mod.exports);cache.set(file,mod.exports);return mod.exports;
}
const root=createRoot(document.getElementById('root'));
(async()=>{
 const Page=load('app/dashboard/produccion/hoja_produccion/page.tsx').default;
 await React.act(async()=>root.render(React.createElement(Page)));
 const choose=async year=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Publicacion en '+year);assert(button,year);await React.act(async()=>button.click());};
 const current=new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Europe/Madrid'}).format(new Date());
 assert([...document.querySelectorAll('button')].some(b=>b.textContent.includes(current)));
 for(const [year,index] of [['2025',0],['2027',1],['Anteriores',2],['Sin a\u00f1o',3]]) {
 await choose(year);await React.act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Revista').click());
 assert(document.querySelector('tbody').textContent.includes('Customer '+index));assert.equal(document.querySelectorAll('tbody tr').length,1);
 let headers=[...document.querySelectorAll('thead th')].map(th=>th.textContent);assert(!headers.includes('Tipo revista / servicio'));assert(!headers.includes('Caduca (web)'));assert(headers.includes('Página'));
 await React.act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Otros').click());assert(document.querySelector('tbody').textContent.includes('Other '+index));
 headers=[...document.querySelectorAll('thead th')].map(th=>th.textContent);assert(headers.includes('Material'));assert(headers.includes('Tipo de servicio'));assert(!headers.includes('Anuncio'));assert(!headers.includes('Artículo'));assert(!headers.includes('Página'));
 }
 await React.act(async()=>root.unmount());dom.window.close();console.log('PASS: current year, historical and future production tabs and contents without year.');
})().catch(error=>{console.error(error);process.exitCode=1;});
