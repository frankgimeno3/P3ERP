import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import XLSX from 'xlsx';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
const root=path.join(process.env.USERPROFILE,'Downloads','updates'),folder=path.join(root,'revision-tesoreria-20261003');fs.mkdirSync(folder,{recursive:true});
const sources={};
for(const filename of ['Control ADMINISTRATIVO.xlsx','Hoja de produccion.xlsx','CONTROL FACTURAS PROVEEDORES.xlsx']){
 const bytes=fs.readFileSync(path.join(root,filename)),book=XLSX.read(bytes,{type:'buffer',cellDates:false});
 sources[filename]={hash:createHash('sha256').update(bytes).digest('hex'),sheets:{}};
 for(const name of book.SheetNames){const matrix=XLSX.utils.sheet_to_json(book.Sheets[name],{header:1,defval:'',blankrows:true});sources[filename].sheets[name]=matrix;console.log(JSON.stringify({file:filename,sheet:name,range:book.Sheets[name]['!ref'],rows:matrix.length,first:matrix.slice(0,5)}));}
}
fs.writeFileSync(path.join(folder,'sources.json'),JSON.stringify(sources));
env.loadEnvConfig(process.cwd());const pool=getPgPool(),db=await pool.connect();
try{
 await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const tables=['comercial_cuentas','comercial_contratos','comercial_contratos_lineas','comercial_contratos_cobros','administracion_facturas_clientes','administracion_lineas_factura','tesoreria_ordenes','tesoreria_recibos_importados','tesoreria_remesas','tesoreria_aplicaciones_cobro','tesoreria_movimientos_bancarios','produccion_contenidos','administracion_proveedores','administracion_facturas_proveedores','tesoreria_cargos_recurrentes','tesoreria_cargos_vencimientos'];
 const existing=(await db.query('SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema=\'public\' AND table_name=ANY($1::text[])',[tables])).rows;
 fs.writeFileSync(path.join(folder,'schema.json'),JSON.stringify(existing));const backup={};
 for(const table of tables){if(!existing.some(c=>c.table_name===table))continue;backup[table]=(await db.query(`SELECT * FROM ${table}`)).rows;}
 fs.writeFileSync(path.join(folder,'before.json'),JSON.stringify(backup),{flag:'wx'});
 console.log('COUNTS',JSON.stringify(Object.fromEntries(Object.entries(backup).map(([k,v])=>[k,v.length]))));
 console.log('BANK_COVERAGE',JSON.stringify((await db.query("SELECT banco,count(*)::int n,count(*) FILTER(WHERE importe>0 AND NOT estado_revision AND NOT COALESCE(duplicado_descartado,false))::int income_pending,max(p3_income_date(fecha_operativa)) last_date FROM tesoreria_movimientos_bancarios GROUP BY banco")).rows));
 await db.query('ROLLBACK');
}finally{db.release();await pool.end();}
