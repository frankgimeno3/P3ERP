import fs from 'node:fs/promises';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),quote=s=>'"'+s.replaceAll('"','""')+'"';
const directory='C:/Users/frank/Downloads/p3erp-identificadores-20261009';
try{
 const columns=(await pool.query(`SELECT c.table_name,c.column_name,c.data_type,c.column_default,EXISTS(SELECT 1 FROM information_schema.table_constraints t JOIN information_schema.key_column_usage k USING(constraint_catalog,constraint_schema,constraint_name) WHERE t.table_schema=c.table_schema AND k.table_name=c.table_name AND k.column_name=c.column_name AND t.constraint_type='PRIMARY KEY') pk FROM information_schema.columns c JOIN information_schema.tables t USING(table_schema,table_name) WHERE c.table_schema='public' AND t.table_type='BASE TABLE' AND (c.column_name='id' OR c.column_name LIKE 'id_%' OR c.column_name LIKE '%codigo%' OR EXISTS(SELECT 1 FROM information_schema.table_constraints pk_t JOIN information_schema.key_column_usage pk_k USING(constraint_catalog,constraint_schema,constraint_name) WHERE pk_t.table_schema=c.table_schema AND pk_k.table_name=c.table_name AND pk_k.column_name=c.column_name AND pk_t.constraint_type='PRIMARY KEY')) ORDER BY c.table_name,c.ordinal_position`)).rows;
 const report=[];
 for(const c of columns){if(!['text','character varying','uuid','integer','bigint'].includes(c.data_type))continue;const col=quote(c.column_name),table=quote(c.table_name);const groups=(await pool.query(`SELECT CASE WHEN ${col}::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN '<UUID>' ELSE regexp_replace(regexp_replace(${col}::text,'[0-9a-f]{20,}','<HASH>','g'),'[0-9]+','N','g') END format,count(*)::int count,(array_agg(DISTINCT ${col}::text))[1:4] samples FROM ${table} WHERE ${col} IS NOT NULL AND ${col}::text<>'' GROUP BY 1 ORDER BY count(*) DESC`)).rows;report.push({...c,groups});}
 const foreignKeys=(await pool.query(`SELECT conname,conrelid::regclass::text child,confrelid::regclass::text parent,pg_get_constraintdef(oid) definition FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace ORDER BY child,conname`)).rows;
 await fs.mkdir(directory,{recursive:true});await fs.writeFile(directory+'/audit.json',JSON.stringify({columns:report,foreignKeys},null,2));
 console.log(JSON.stringify({report:directory+'/audit.json',columns:report.length,primaryKeys:report.filter(r=>r.pk).length}));
}finally{await pool.end();}
