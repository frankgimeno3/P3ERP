/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const {JSDOM}=require(path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom'));
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
Object.assign(global,{window:dom.window,document:dom.window.document,navigator:dom.window.navigator,IS_REACT_ACT_ENVIRONMENT:true});
const React=require('react'),{act}=React,{createRoot}=require('react-dom/client');
const filename=path.resolve('app/dashboard/administracion/proveedores/SupplierDataFields.tsx');
function load(file){const m=new Module(file,module);m.filename=file;m.paths=module.paths;const original=m.require.bind(m);m.require=id=>id.startsWith('@/')?load(path.resolve(id.slice(2)+(path.extname(id)?'':'.tsx'))):id.startsWith('./')?load(path.resolve(path.dirname(file),id+'.tsx')):original(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,esModuleInterop:true,allowJs:true}}).outputText,file);return m.exports;}
const m=new Module(filename,module);m.filename=filename;m.paths=module.paths;const original=m.require.bind(m);m.require=id=>id.startsWith('@/')?load(path.resolve(id.slice(2)+'.tsx')):original(id);
m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,filename);
const Fields=m.exports.default, root=createRoot(document.getElementById('root'));
const requests=[],saved=[];
global.fetch=(_url,options)=>new Promise(resolve=>requests.push({body:JSON.parse(options.body),resolve}));
async function edit(element,value){await act(async()=>{Object.getOwnPropertyDescriptor(element.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype,'value').set.call(element,value);element.dispatchEvent(new window.Event('input',{bubbles:true}));});}
async function answer(index,ok=true){await act(async()=>requests[index].resolve({ok,json:async()=>ok?requests[index].body:{message:'Fallo de red'}}));}
async function main(){
 await act(async()=>root.render(React.createElement(Fields,{supplier:{id_proveedor:'provider',nombre_proveedor:'Original',vat_code:'VAT',pais_proveedor:'Espa?a',moneda_proveedor:'EUR'},onSaved:value=>saved.push(value)})));
 assert.equal(requests.length,0);
 assert.equal(document.querySelectorAll('input[readonly]').length,1);
 const name=document.querySelector('input'),comments=document.querySelector('textarea');
 await edit(name,'Nuevo');await edit(comments,'Comentario reciente');
 assert.equal(requests.length,1,'Requests must be serialized');
 await answer(0);assert.equal(requests.length,2);
 assert.equal(requests[1].body.Comentarios_proveedor,'Comentario reciente');
 assert.equal(comments.value,'Comentario reciente');
 await answer(1);assert.equal(saved.at(-1).nombre_proveedor,'Nuevo');
 await edit(name,'');assert.equal(requests.length,2);assert.ok(document.querySelector('[role="alert"]'));
 await edit(name,'Final');await answer(2,false);assert.match(document.body.textContent,/Fallo de red/);
 await act(async()=>document.querySelector('button').click());await answer(3);
 assert.equal(saved.at(-1).nombre_proveedor,'Final');assert.equal(document.querySelector('[role="alert"]'),null);
 await act(async()=>root.unmount());console.log('OK: autosave, serialized latest changes, readonly fields, required name, failure and retry');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
