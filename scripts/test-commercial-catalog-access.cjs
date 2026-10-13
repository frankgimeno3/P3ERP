const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
function load(file,mocks){const mod={exports:{}};const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;new Function('require','module','exports',js)(id=>mocks(id),mod,mod.exports);return mod.exports;}
(async()=>{
 for(const file of ['servicios/route.js','servicios/[id_servicio]/route.js','revistas/route.js','revistas/[id_revista]/route.js','revistas/[id_revista]/paginas/route.js']){
  const original=()=>{};const route=load('app/api/v1/comercial/catalogo/'+file,()=>({GET:original,POST:()=>{},PATCH:()=>{},PUT:()=>{},DELETE:()=>{}}));
  assert.equal(route.GET,original);for(const method of ['POST','PATCH','PUT','DELETE'])assert.equal(route[method],undefined);
 }
 let filter;const scoped=load('app/api/v1/comercial/cuentas/[id_cuenta]/contenidos/route.js',()=>({getContenidosProduccion:async value=>{filter=value;return [];}}));
 await scoped.GET(new Request('https://erp.test/api/v1/comercial/cuentas/ACC1/contenidos?id_cuenta=ACC2&estado=Publicado'),{params:Promise.resolve({id_cuenta:'ACC1'})});
 assert.equal(filter.id_cuenta,'ACC1');assert.equal(filter.estado,'Publicado');
 const calendar=load('app/api/v1/comercial/catalogo/publicaciones/route.js',()=>({getMagazineList:async()=>({publicaciones:[{id:'one'}],materials:['private'],other:'internal'})}));
 assert.deepEqual(await (await calendar.GET()).json(),{publicaciones:[{id:'one'}]});
 console.log('PASS: catálogo compartido solo de lectura, contenidos limitados a su cuenta y calendario sin datos operativos adicionales.');
})().catch(error=>{console.error(error);process.exitCode=1;});
