import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
export const folder=path.resolve(process.env.USERPROFILE,'OneDrive/Escritorio/importacion-administracion-produccion-20260920');
fs.mkdirSync(folder,{recursive:true});
const desktop=path.dirname(folder);
const sheets={};
for(const file of ['Control ADMINISTRATIVO  (1).xlsx','Hoja de produccion.xlsx']){
 const book=XLSX.readFile(path.join(desktop,file));
 for(const name of book.SheetNames){
  const matrix=XLSX.utils.sheet_to_json(book.Sheets[name],{header:1,defval:'',blankrows:true});
  const headers=matrix[0];
  sheets[name]=matrix.slice(1).map((row,i)=>({sourceRow:i+2,...Object.fromEntries(headers.map((h,j)=>[String(h).trim(),row[j]??'']).filter(([h])=>h))})).filter(row=>Object.entries(row).some(([k,v])=>k!=='sourceRow'&&String(v).trim()));
 }
}
fs.writeFileSync(path.join(folder,'source.json'),JSON.stringify(sheets,null,2));
env.loadEnvConfig(process.cwd());const pool=getPgPool(),db=await pool.connect();
try{
 await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const columns=(await db.query("SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position")).rows;
 const constraints=(await db.query("SELECT conrelid::regclass::text child,confrelid::regclass::text parent,contype,pg_get_constraintdef(oid) definition FROM pg_constraint WHERE connamespace='public'::regnamespace")).rows;
 fs.writeFileSync(path.join(folder,'schema.json'),JSON.stringify({columns,constraints},null,2));
 const tables=[...new Set(columns.map(c=>c.table_name))].filter(t=>/^(comercial_|administracion_facturas_clientes|administracion_lineas_factura|tesoreria_|produccion_|servicios_|fiscal_verifactu|general_comentarios|agentes_db|cuentas_registro_eventos)/.test(t));
 const counts={};
 for(const table of tables){
  const rows=(await db.query(`SELECT row_to_json(t)::text data FROM public."${table}" t`)).rows;
  const target=path.join(folder,table+'.json');
  if(!fs.existsSync(target))fs.writeFileSync(target,'['+rows.map(r=>r.data).join(',\n')+']',{flag:'wx'});
  counts[table]=rows.length;
 }
 fs.writeFileSync(path.join(folder,'counts.json'),JSON.stringify(counts,null,2));
 await db.query('ROLLBACK');
 console.log(JSON.stringify({folder,sheets:Object.fromEntries(Object.entries(sheets).map(([k,v])=>[k,v.length])),counts},null,2));
}finally{db.release();await pool.end();}
