import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {getRdsSchema} from '../server/features/database/RdsSchemaRepository.js';
const catalog=JSON.parse(await fs.readFile('database/rds-table-catalog.json','utf8'));
const columns=JSON.parse(await fs.readFile('database/rds-column-catalog.json','utf8'));
assert.equal(new Set(catalog.map(table=>table.name)).size,catalog.length,'El catálogo no puede duplicar nombres.');
const fixture=[
 {table_name:'actual',relation_kind:'r',table_description:'Comentario SQL',column_name:'id',column_type:'text',nullable:false,default_value:'',is_primary:true,references:[],column_description:null},
 {table_name:'actual',relation_kind:'r',column_name:'nuevo',column_type:'jsonb',nullable:true,default_value:null,is_primary:false,references:['public.destino.id'],column_description:null},
 {table_name:'vista',relation_kind:'v',column_name:'valor',column_type:'numeric(14,2)',nullable:true,references:[],column_description:'Importe calculado'},
];
const sample=await getRdsSchema([{name:'actual',description:'Descripción actualizada'},{name:'obsoleta',description:'No existe'}],{actual:{nuevo:'Campo nuevo'}},{query:async()=>({rows:fixture})});
assert.deepEqual(sample.map(table=>table.name),['actual','vista'],'El catálogo no debe crear tablas inexistentes.');
assert.equal(sample[0].description,'Descripción actualizada');assert.equal(sample[0].columns[0].defaultValue,'');
assert.equal(sample[0].columns[1].description,'Campo nuevo');assert.deepEqual(sample[0].columns[1].references,['public.destino.id']);
assert.equal(sample[1].kind,'view');assert.equal(sample[1].columns[0].description,'Importe calculado');
if(process.argv.includes('--rds')){
 const {default:env}=await import('@next/env');env.loadEnvConfig(process.cwd());
 const {getPgPool}=await import('../server/database/pgClient.js');const db=getPgPool();
 try{
  const schema=await getRdsSchema(catalog,columns,db);
  const actual=(await db.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position")).rows;
  assert.deepEqual(schema.flatMap(table=>table.columns.map(column=>({table_name:table.name,column_name:column.name}))),actual);
  for(const relation of schema)assert.notEqual(relation.description,'Sin descripción funcional.',relation.name);
  for(const [table,definitions] of Object.entries(columns))for(const column of Object.keys(definitions))assert(schema.find(r=>r.name===table)?.columns.some(c=>c.name===column),`Descripción de columna inexistente: ${table}.${column}`);
  const referenceCount=schema.reduce((sum,table)=>sum+table.columns.reduce((n,column)=>n+column.references.length,0),0);
  const expected=Number((await db.query("SELECT coalesce(sum(cardinality(con.conkey)),0) total FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND con.contype='f' AND c.relkind IN ('r','p')")).rows[0].total);
  assert.equal(referenceCount,expected,'Todas las columnas de claves foráneas, incluidas las compuestas, deben aparecer.');
  console.log(JSON.stringify({tables:schema.filter(r=>r.kind==='table').length,views:schema.filter(r=>r.kind!=='table').length,columns:actual.length,references:referenceCount,missingDescriptions:0}));
 }finally{await db.end();}
}
console.log('PASS: catálogo sin entidades inventadas, columnas vigentes, vistas diferenciadas y referencias completas.');
