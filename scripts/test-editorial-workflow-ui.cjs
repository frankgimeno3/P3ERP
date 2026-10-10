const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/dashboard/produccion/contenidos'});
Object.assign(global,{window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
const React=require('react'),{createRoot}=require('react-dom/client'),cache=new Map(),calls=[];
const articles=[{id:'1',empresa:'Cuenta antigua',titulo:'Artículo pendiente LATAM',estado:'Parcialmente publicado',responsable_correccion:'Frank',revista:'Vidrio',paginas:'2',espana_previsto_numero:'217',latam_previsto_numero:'91',publicaciones_estado:{'espana_previsto_numero:217':true},estado_publicacion_vidrioperfil:'No'}, {id:'2',empresa:'Cuenta publicada',titulo:'Artículo publicado',estado:'Publicado',responsable_correccion:'Paco',revista:'Ventanas',paginas:'1',espana_previsto_numero:'218',estado_publicacion_vidrioperfil:'Sí'}];
const api={get:async url=>({data:url.includes('/cuentas')?{rows:[{id_cuenta:'ACC1',nombre_empresa:'Cuenta válida'}]}:articles}),patch:async(url,data)=>{calls.push({url,data});return{data:{...data,id:'1',estado:'Publicado',estado_publicacion_vidrioperfil:'No'}};},post:async()=>{throw Error('Unexpected creation');}};
function load(filename){
 filename=path.resolve(filename);if(cache.has(filename))return cache.get(filename).exports;
 const m={exports:{}};cache.set(filename,m);
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,esModuleInterop:true,allowJs:true}}).outputText;
 const local=name=>{
  if(name.includes('apiClient'))return{default:api,__esModule:true};
  if(name.includes('MiddleNav'))return{default:()=>null,__esModule:true};
  if(name==='next/navigation')return{useRouter:()=>({push:()=>{}})};
  if(name.includes('/request'))return{request:async()=>({ok:true,json:async()=>[{id_orden:'C26.000.001-1/1',cliente:'Cliente',id_factura:'526001',fecha_teorica_cobro:'01/01/2026',forma_cobro:'recibo',cobro_total:100,cobrada:false},{id_orden:'C26.000.002-1/1',cliente:'Otro',id_factura:'526002',fecha_teorica_cobro:'01/01/2026',forma_cobro:'transferencia',cobro_total:100,cobrada:false}]})};
  if(name.startsWith('@/')||name.startsWith('.')){
   let target=name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(filename),name);
   if(!path.extname(target))target=['.tsx','.ts','.js'].map(ext=>target+ext).find(fs.existsSync);
   return load(target);
  }
  return require(name);
 };
 new Function('require','module','exports',code)(local,m,m.exports);return m.exports;
}
const root=createRoot(document.getElementById('root'));
const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent===text);
const tick=()=>React.act(async()=>{await new Promise(r=>setTimeout(r,300));});
(async()=>{
 const Table=load('app/dashboard/produccion/control_redaccion/ControlRedaccionTable.tsx').default;
 await React.act(async()=>root.render(React.createElement(Table)));await tick();
 assert(document.querySelector('[role="tab"][aria-selected="true"]').textContent.startsWith('Pendientes'));
 assert.equal(document.querySelectorAll('tbody tr').length,1);assert(document.querySelector('tbody').textContent.includes('Parcialmente publicado'));
 assert.equal(document.querySelectorAll('thead th').length,13);
 await React.act(async()=>[...document.querySelectorAll('[role="tab"]')].find(b=>b.textContent.startsWith('Publicados')).click());
 assert.equal(document.querySelectorAll('thead th').length,12);assert(![...document.querySelectorAll('thead th')].some(th=>th.textContent==='Estado'));
 assert(document.querySelector('tbody').textContent.includes('Artículo publicado'));
 await React.act(async()=>[...document.querySelectorAll('[role="tab"]')].find(b=>b.textContent.startsWith('Pendientes')).click());
 await React.act(async()=>document.querySelector('tbody tr').click());await tick();
 assert(document.querySelector('[role="dialog"]'));assert.equal(document.querySelectorAll('input[type="date"]').length,0);
 assert.equal(document.querySelector('[role="dialog"]').querySelectorAll('[aria-label^="Pasado a producción día:"]').length,3);
 assert.equal(document.querySelectorAll('input[type="checkbox"]').length,3);
 await React.act(async()=>{const boxes=[...document.querySelectorAll('input[type="checkbox"]')];boxes[1].click();});
 await React.act(async()=>document.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
 assert.equal(calls.length,1);assert(calls[0].data.publicaciones_estado['latam_previsto_numero:91']);assert(!document.querySelector('[role="dialog"]'));
 assert.equal(document.querySelectorAll('tbody tr').length,0,'Published article leaves the pending tab');
 await React.act(async()=>button('Añadir artículo').click());await tick();assert(document.querySelector('[role="combobox"]'));
 await React.act(async()=>window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'})));assert(!document.querySelector('[role="dialog"]'));
 const Pending=load('app/dashboard/administracion/pendiente-cobro/page.tsx').default;
 await React.act(async()=>root.render(React.createElement(Pending)));await tick();
 const filters=document.querySelector('details');await React.act(async()=>filters.querySelector('summary').click());
 const select=document.querySelector('select[aria-label="Forma de cobro"]');assert(select);assert.equal(select.options.length,3,document.body.textContent);
 await React.act(async()=>{select.value='recibo';select.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});
 assert.equal(document.querySelectorAll('tbody tr').length,1);assert(document.querySelector('tbody').textContent.includes('Cliente'));
 await React.act(async()=>root.unmount());console.log('PASS: pending/published tabs, partial publication, requested columns, account pagination, modal save/Escape, split dates and payment-method select.');
})().catch(error=>{console.error(error);process.exitCode=1;});
