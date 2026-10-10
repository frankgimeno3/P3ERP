const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const {JSDOM}=require(process.env.P3_SELECTOR_TEST_MODULES?path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom'):'jsdom');
const dom=new JSDOM('<div id="root"></div>');Object.assign(global,{window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
const React=require('react'),{act}=React,{createRoot}=require('react-dom/client');
const filename=path.resolve('app/dashboard/direccion/tesoreria/JuanCellModal.tsx'),m=new Module(filename,module);m.filename=filename;m.paths=module.paths;m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,filename);
const Modal=m.exports.default,root=createRoot(document.getElementById('root'));let saved,closed=0;
const props={label:'IBI diciembre',parts:[{id:'A',label:'Plaza A',amount:2000,editable:true},{id:'B',label:'Plaza B',amount:3000,editable:true}],disabled:false,onClose:()=>closed++,onSave:async(value,components)=>{saved={value,components};}};
(async()=>{
 await act(async()=>root.render(React.createElement(Modal,props)));
 assert.equal(document.querySelectorAll('input').length,2,'Only components have inputs; the total does not');
 const input=document.querySelector('input');await act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(input,'25,15');input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
 assert(document.querySelector('[role="dialog"]').textContent.includes('55,15'));
 await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Guardar cargos').click());assert.deepEqual(saved,{value:5515,components:[{id:'A',amount:2515},{id:'B',amount:3000}]});assert.equal(closed,1);
 await act(async()=>window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'})));assert.equal(closed,2);
 await act(async()=>document.querySelector('[aria-label="Cerrar desglose"]').click());assert.equal(closed,3);
 await act(async()=>root.render(React.createElement(Modal,{...props,parts:[{id:'A',label:'Extracto',amount:2000,editable:false}],key:'locked'})));assert(document.querySelector('input').disabled);assert([...document.querySelectorAll('button')].find(b=>b.textContent==='Guardar cargos').disabled);
 await act(async()=>root.unmount());console.log('PASS: component-only inputs, derived total, exact saved breakdown, Escape, visible close and source document protection.');
})().catch(error=>{console.error(error);process.exitCode=1;});
