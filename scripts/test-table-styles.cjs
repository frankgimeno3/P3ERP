const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),postcss=require('postcss');
const {JSDOM}=require(process.env.P3_SELECTOR_TEST_MODULES?path.join(process.env.P3_SELECTOR_TEST_MODULES,'jsdom'):'jsdom');
const dom=new JSDOM('<html><head></head><body></body></html>'),{document}=dom.window;
const original=document.createElement('style');original.textContent=`
 .navy thead {background:#172554;color:white} .gray thead {background:#e5e7eb;color:#374151}
 .green thead th {background:#dcfce7;color:#166534} .state {background:#f0fdf4}
 .inherited {background:#e0e7ff;color:#172554}
 table {border:1px solid black} td,th {padding:1.5rem;border:1px solid black}
 .right {text-align:right;width:25%}
`;document.head.append(original);
for(const name of ['navy','gray','green','inherited']){
 const section=document.createElement('section');section.innerHTML=`<div><table class="${name}"><thead><tr><th>Nombre</th><th class="right">Importe</th></tr></thead><tbody><tr class="state"><td>Registro</td><td class="right">12,00 €</td></tr><tr><td colspan="2">Total</td></tr></tbody></table></div>`;document.body.append(section);
}
const style=node=>dom.window.getComputedStyle(node);
const headers=[...document.querySelectorAll('table,thead,thead th')].map(node=>({node,background:style(node).backgroundColor,color:style(node).color}));
const rules=postcss.parse(fs.readFileSync('app/globals.css','utf8')).nodes.filter(node=>node.type==='rule'&&node.selector.startsWith(':root ')&&node.selector.includes('table'));
const shared=document.createElement('style');shared.textContent=rules.map(rule=>rule.toString()).join('\n');document.head.append(shared);
for(const header of headers){assert.equal(style(header.node).backgroundColor,header.background);assert.equal(style(header.node).color,header.color);}
for(const table of document.querySelectorAll('table')){
 const cell=table.querySelector('td');assert.equal(parseFloat(style(cell).paddingTop),.5);assert.equal(parseFloat(style(cell).paddingLeft),.75);
 assert.equal(style(cell).borderTopWidth,'0px');assert.equal(style(table.querySelector('tbody tr')).borderTopWidth,'1px');
 assert.equal(style(table.querySelector('.state')).backgroundColor,'rgb(240, 253, 244)');
 assert.equal(style(table.querySelector('td.right')).textAlign,'right');assert.equal(style(table.querySelector('th.right')).width,'25%');
 assert.equal(table.querySelector('[colspan]').colSpan,2);
}
dom.window.close();console.log('PASS: espaciado de Extractos y separadores uniformes; cabeceras, estados, alineaciones, anchos y celdas combinadas conservados.');
