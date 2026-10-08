const assert=require('node:assert/strict');
const fs=require('node:fs');
const postcss=require('postcss');
const css=postcss.parse(fs.readFileSync('app/globals.css','utf8'));
const root=css.nodes.find(node=>node.type==='rule'&&node.selector===':root');
const variables=Object.fromEntries(root.nodes.filter(node=>node.type==='decl').map(node=>[node.prop,node.value]));
function declarations(selector){const rule=css.nodes.find(node=>node.type==='rule'&&node.selector.split(',').some(item=>item.trim()===selector));assert(rule,selector);return Object.fromEntries(rule.nodes.filter(node=>node.type==='decl').map(node=>[node.prop,node.value]));}
function resolve(value){return value.startsWith('var(')?variables[value.slice(4,-1)]:value;}
function luminance(hex){const rgb=hex.replace('#','').match(/.{2}/g).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return rgb.reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);}
function readable(foreground,background){const a=luminance(resolve(foreground)),b=luminance(resolve(background)),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert(ratio>=4.5,`${foreground} sobre ${background}: ${ratio.toFixed(2)}:1`);}
assert.equal(variables['color-scheme'],'light');
css.walkAtRules('media',rule=>{if(rule.params.includes('prefers-color-scheme'))rule.walkDecls(decl=>assert(!['--foreground','--background'].includes(decl.prop),'El tema del sistema no debe invertir texto sobre superficies claras.'));});
readable(variables['--foreground'],variables['--background']);
const input=declarations('.content-main textarea');readable(input.color,input['background-color']);
readable(declarations('.content-main input::placeholder').color,input['background-color']);
const cell=declarations('.content-main table tbody td');
readable(cell.color,declarations('.content-main table tbody tr')['background-color']);
readable(cell.color,declarations('.content-main table tbody tr:hover')['background-color']);
readable(declarations('.content-main table thead th').color,declarations('.content-main table thead tr')['background-color']);
const gm=fs.readFileSync('app/gm/layout.tsx','utf8').match(/<style>\{`([\s\S]*?)`\}<\/style>/)[1];
postcss.parse(gm).walkRules(rule=>{if(rule.selector.includes('button:not(:disabled):hover'))rule.walkDecls(decl=>assert(!['background','background-color','color'].includes(decl.prop),'El hover compartido de GM debe conservar la combinación de colores del control.'));});
const juan=postcss.parse(fs.readFileSync('app/dashboard/direccion/tesoreria/prevision-liquidez/vista-juan/juan.css','utf8'));
let negative;juan.walkRules(rule=>{if(rule.selector.includes('.negative'))rule.walkDecls('color',decl=>negative=decl.value);});
for(const background of ['#ffffff','#c5d9ef','#eaf1f5'])readable(negative,background);
console.log('PASS: contraste de superficies, formularios, placeholders, cabeceras, filas, hover de GM, importes negativos y tema del sistema.');
