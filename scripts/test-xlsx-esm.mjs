import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),bundler=require('next/dist/compiled/webpack/webpack');bundler.init();
const files=['server/features/factura/InvoiceRegisterImport.js','server/features/produccion/ProductionMaterialActions.js','server/features/proveedor/TicketSpreadsheet.js','server/features/prevision/JuanExcel.js'];
for(const file of files){const source=await fs.readFile(file,'utf8');assert(!/import\s+XLSX\s+from\s+['"]xlsx/.test(source),`${file} no puede usar un export default inexistente`);}
const temporaryRoot=path.resolve(os.tmpdir()),directory=await fs.mkdtemp(path.join(temporaryRoot,'p3-xlsx-esm-'));
try{
 const modulePath=require.resolve('xlsx/xlsx.mjs').replaceAll('\\','/');
 await fs.writeFile(path.join(directory,'entry.mjs'),`import * as XLSX from ${JSON.stringify(modulePath)}; export function check(){const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Nombre'],['Prueba']]),'Hoja');const binary=XLSX.write(book,{type:'buffer',bookType:'xlsx'});const read=XLSX.read(binary,{type:'buffer'});return {value:XLSX.utils.sheet_to_json(read.Sheets.Hoja,{header:1})[1][0],cfb:typeof XLSX.CFB.utils.cfb_new};}`);
 const compiler=bundler.webpack({mode:'development',target:'node',devtool:false,cache:false,entry:path.join(directory,'entry.mjs'),output:{path:directory,filename:'bundle.cjs',library:{type:'commonjs2'}},resolve:{mainFields:['module','main']},optimization:{minimize:false}});
 const stats=await new Promise((resolve,reject)=>compiler.run((error,result)=>error?reject(error):resolve(result)));
 await new Promise((resolve,reject)=>compiler.close(error=>error?reject(error):resolve()));
 const result=stats.toJson({all:false,errors:true,warnings:true});assert.deepEqual(result.errors,[]);assert.deepEqual(result.warnings,[]);
 assert.deepEqual(require(path.join(directory,'bundle.cjs')).check(),{value:'Prueba',cfb:'function'});
 console.log('PASS: imports de XLSX compatibles con ESM, compilación aislada con el Webpack de Next sin advertencias, lectura/escritura Excel y CFB. No se modifica .next.');
}finally{
 if(path.dirname(path.resolve(directory))!==temporaryRoot||!path.basename(directory).startsWith('p3-xlsx-esm-'))throw Error('Ruta temporal de prueba inesperada.');
 await fs.rm(directory,{recursive:true,force:true});
}
