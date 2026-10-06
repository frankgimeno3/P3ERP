/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {JSDOM}=require(process.env.P3_SELECTOR_TEST_MODULES?path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom'):'jsdom');
const dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'http://localhost'});
Object.assign(global,{window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,HTMLInputElement:dom.window.HTMLInputElement,HTMLSelectElement:dom.window.HTMLSelectElement,IS_REACT_ACT_ENVIRONMENT:true});
const React=require('react'),{createRoot}=require('react-dom/client'),cache=new Map();
function load(filename){
 const file=path.resolve(filename);if(cache.has(file))return cache.get(file);
 const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 const result={exports:{}};const localRequire=name=>name.startsWith('@/')?load(name.slice(2)+(['.js','.tsx','.ts'].find(ext=>fs.existsSync(name.slice(2)+ext))||'')):require(name);
 new Function('require','exports','module',compiled)(localRequire,result.exports,result);cache.set(file,result.exports);return result.exports;
}
const Table=load('app/components/SortableTable.tsx').default,{compareTableValues}=load('app/lib/tableSorting.js');
assert(compareTableValues('31/12/2025','02/01/2026')<0);assert(compareTableValues('03 / 06 / 2025','02/01/2026')<0);
assert(compareTableValues('1.234,56 €','99,00 €')>0);assert(compareTableValues('(12,00 €)','0,00 €')<0);
assert(compareTableValues('$1,234.56','$99.00')>0);assert(compareTableValues('1,200.00 USD','90.00 USD')>0);
assert(compareTableValues('ACC9','ACC10')<0);assert(compareTableValues('—','12','desc')>0);
const h=React.createElement,root=createRoot(document.getElementById('root'));
let records=[{id:'a',name:'Zeta',amount:'2,00 €',date:'02/01/2026'},{id:'b',name:'Álvaro',amount:'1.200,00 €',date:'31/12/2025'},{id:'c',name:'Beta',amount:'10,00 €',date:'10/02/2026'}],clicked='';
function Row({row}){const [note,setNote]=React.useState(row.id);return h('tr',{'data-id':row.id,onClick:()=>{clicked=row.id;}},h('td',{},row.name),h('td',{},row.amount),h('td',{},row.date),h('td',{},h('input',{defaultValue:note,onChange:e=>setNote(e.target.value)})));}
function Harness(){return h(Table,{},h('thead',{},h('tr',{},['Nombre','Importe','Fecha','Nota'].map(label=>h('th',{key:label},label)))),h('tbody',{},records.map(row=>h(Row,{key:row.id,row})),h('tr',{'data-total':true},h('td',{colSpan:4},'Total'))));}
const render=()=>React.act(()=>root.render(h(Harness))),order=()=>[...document.querySelectorAll('tbody tr[data-id]')].map(row=>row.dataset.id).join('');
const sort=column=>React.act(()=>document.querySelectorAll('[data-table-sort-button]')[column].click());
render();assert.equal(document.querySelectorAll('thead svg').length,4);assert.equal(order(),'abc');
const original=document.querySelector('tr[data-id=a] input');original.value='Conservar';
sort(0);assert.equal(order(),'bca');assert.equal(document.querySelector('thead th').getAttribute('aria-sort'),'ascending');
assert.equal(document.querySelector('tr[data-id=a] input'),original);assert.equal(original.value,'Conservar');
sort(0);assert.equal(order(),'acb');assert.equal(document.querySelector('thead th').getAttribute('aria-sort'),'descending');
sort(1);assert.equal(order(),'acb');sort(1);assert.equal(order(),'bca');
sort(2);assert.equal(order(),'bac');sort(2);assert.equal(order(),'cab');
assert(document.querySelector('tbody tr:last-child').dataset.total);assert.equal(clicked,'');
React.act(()=>document.querySelector('tr[data-id=b]').click());assert.equal(clicked,'b');
records=[{...records[0],date:'01/01/2030'},records[1]];render();assert.equal(order(),'ab');
records.push({id:'d',name:'Nuevo',amount:'0,00 €',date:'01/01/2031'});render();assert.equal(order(),'dab');
React.act(()=>root.unmount());
const root2=createRoot(document.getElementById('root'));
let controlled=null;
function Grouped(){
 const [sort,setSort]=React.useState(null);
 return h(Table,{sort,onSortChange:next=>{controlled=next;setSort(next);}},h('thead',{},h('tr',{},h('th',{rowSpan:2},'Cuenta'),h('th',{colSpan:2},'Fechas')),h('tr',{},h('th',{},'Inicio'),h('th',{},'Fin'))),h('tbody',{},h('tr',{},h('td',{},'Z'),h('td',{},'02/01/2026'),h('td',{},'02/03/2026'))));
}
React.act(()=>root2.render(h(Grouped)));
assert.equal(document.querySelectorAll('[data-table-sort-button]').length,3);
React.act(()=>document.querySelectorAll('[data-table-sort-button]')[1].click());assert.deepEqual(controlled,{column:1,direction:'asc'});
React.act(()=>document.querySelectorAll('[data-table-sort-button]')[1].click());assert.deepEqual(controlled,{column:1,direction:'desc'});
React.act(()=>root2.unmount());
const root3=createRoot(document.getElementById('root'));
React.act(()=>root3.render(h(Table,{},h('thead',{},h('tr',{},h('th',{},'Nombre'),h('th',{},'Importe'))),h('tbody',{},['Zeta','Beta'].map((name,index)=>h(React.Fragment,{key:name},h('tr',{'data-name':name},h('td',{},name),h('td',{},String(index))),h('tr',{'data-detail':name},h('td',{colSpan:2},'Detalle '+name))))))));
React.act(()=>document.querySelector('[data-table-sort-button]').click());
assert.deepEqual([...document.querySelectorAll('tbody tr')].map(row=>row.dataset.name||row.dataset.detail),['Beta','Beta','Zeta','Zeta']);
React.act(()=>root3.unmount());
let pathname='/dashboard/comercial/cuentas';
const layoutCode=ts.transpileModule(fs.readFileSync('app/dashboard/layout.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
const layoutModule={exports:{}};
new Function('require','exports','module',layoutCode)(name=>name==='next/navigation'?{usePathname:()=>pathname}:name==='next/link'?{__esModule:true,default:({children,...props})=>h('a',props,children)}:name.includes('loggedNav')||name.includes('loggedLeftMenu')?{__esModule:true,default:()=>null}:require(name),layoutModule.exports,layoutModule);
const {renderToStaticMarkup}=require('react-dom/server');
for(const route of ['/dashboard/comercial/cuentas','/dashboard/direccion/tesoreria','/dashboard/operaciones/tareas','/dashboard/administracion','/dashboard/administracion/pendiente-cobro','/dashboard/administracion-falsa']){
 pathname=route;const html=renderToStaticMarkup(h(layoutModule.exports.default,{},'Contenido'));
 assert.equal(html.includes('/ayuda/informacion-legal'),route==='/dashboard/administracion'||route.startsWith('/dashboard/administracion/'));
}
console.log('PASS: SVGs, ascending/descending, dates, amounts, natural IDs, empty values, keyed editor state, row actions, totals, filtering and refreshed data.');
console.log('PASS: Verifactu footer appears only in Administration.');
