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
    if(id.includes('AgenteService'))return {AgenteService:{getAgentes:async()=>[{id_agente:'agent',nombre_completo_agente:'Nombre del agente'}]}};
    if(id.includes('ContenidoService'))return {ContenidoService:{updateContenido:async(id,data)=>{calls.push({id,data});return {id_contenido:id,...data};}}};
    if(id.startsWith('@/')){const base=id.slice(2);return load(['.tsx','.ts','.js'].map(ext=>base+ext).find(fs.existsSync));}
    return require(id);
  },mod,mod.exports);cache.set(file,mod.exports);return mod.exports;
}
const root=createRoot(document.getElementById('root'));
const change=async(node,value)=>{assert(node);await React.act(async()=>{Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node),'value').set.call(node,value);node.dispatchEvent(new dom.window.Event(node.tagName==='SELECT'?'change':'input',{bubbles:true}));});};
const field=name=>[...document.querySelectorAll('label')].find(label=>label.textContent.startsWith(name))?.querySelector('input,textarea,select');
(async()=>{
  const Editor=load('app/dashboard/produccion/hoja_produccion/[id]/ContentFieldsEditor.tsx').default;
  await React.act(async()=>root.render(React.createElement(Editor,{content:{id_contenido:'content',id_agente:'agent',estado:'Estado histórico'},onSaved:()=>{}})));
  assert.equal(document.querySelector('[aria-label="Agente"]').value,'Nombre del agente');
  assert.equal(field('Estado').value,'Estado histórico');
  assert.equal(document.querySelectorAll('input[type="date"]').length,0);
  await change(field('Especificaciones'),'Primera línea\nSegunda línea');
  await change(field('Publicación'),'WEB 123');
  await change(field('Estado'),'Publicado');
  for(const [part,value] of [['dd','31'],['mm','02'],['yyyy','2026']])await change(document.querySelector(`[aria-label="Fecha límite: ${part}"]`),value);
  await React.act(async()=>document.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
  assert.equal(calls.length,0);assert.match(document.querySelector('[role="alert"]').textContent,/fecha/);
  await change(document.querySelector('[aria-label="Fecha límite: dd"]'),'28');
  await React.act(async()=>document.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
  assert.equal(calls.length,1);
  assert.deepEqual(calls[0],{id:'content',data:{especificaciones_contenido:'Primera línea\nSegunda línea',publicacion_num_web:'WEB 123',id_agente:'agent',deadline_contenido:'28/02/2026',estado:'Publicado'}});
  assert.match(document.querySelector('[role="status"]').textContent,/guardados/);
  await React.act(async()=>root.unmount());console.log('PASS: editable controls, agent name, legacy status, date validation and save payload');
})().catch(error=>{console.error(error);process.exitCode=1;});
