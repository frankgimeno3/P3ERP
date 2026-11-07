const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const calls=[];
function load(file){const mod={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id==='next/server')return {NextResponse:{json:(data,options={})=>({data,status:options.status||200,headers:options.headers||{}})}};
  if(id==='next/navigation')return {redirect:location=>{throw {location};}};
  if(id.includes('ContenidoRepository'))return {getHojaProduccionContenidos:async()=>[]};
  if(id.includes('GestionesProduccionRepository'))return {addProductionMaterial:async data=>{calls.push(['single',data]);return {};},addProductionMaterials:async data=>{calls.push(['batch',data]);return [];}};
  return require(id);
 },mod,mod.exports);return mod.exports;}
(async()=>{
 const sheet=load('app/api/v1/produccion/hoja-produccion/route.js');
 const response=await sheet.POST({json(){throw Error('No debe procesar altas desde la Hoja');}});assert.equal(response.status,405);assert.equal(response.headers.Allow,'GET');
 assert.equal((await sheet.GET({url:'https://erp.invalid/api/v1/produccion/hoja-produccion'})).status,200);
 assert.throws(()=>load('app/dashboard/produccion/hoja_produccion/crear/page.tsx').default(),error=>error.location==='/dashboard/produccion/gestion-contenidos/revista');
 assert.throws(()=>load('app/dashboard/produccion/gestion-contenidos/page.tsx').default(),error=>error.location==='/dashboard/produccion/gestion-contenidos/revista');
 const api=load('app/api/v1/produccion/gestiones-produccion/materiales/route.js');
 const batch={id_contenido:'content',materiales:[{nombre_material:'Uno'},{nombre_material:'Dos'}]};
 assert.equal((await api.POST({json:async()=>batch})).status,201);assert.deepEqual(calls.at(-1),['batch',batch]);
 await api.POST({json:async()=>({id_contenido:'content',nombre_material:'Histórico'})});assert.equal(calls.at(-1)[0],'single');
 console.log('PASS: Hoja sin altas, rutas antiguas redirigidas y carga multiple separada de la compatibilidad individual.');
})().catch(error=>{console.error(error);process.exitCode=1;});
