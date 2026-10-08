import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import ts from 'typescript';

// Deterministic query recorder: compare exact bound values without issuing database writes.
const file='server/features/propuesta/PropuestaRepository.js';
const baseline='023f334';
const sources={before:execFileSync('git',['show',baseline+':'+file],{encoding:'utf8'}),after:fs.readFileSync(file,'utf8')};
const results=[];
for(const count of [0,1,10,100,1001]) {
  const lines=Array.from({length:count},(_,index)=>({id_linea_propuesta:'line_'+index,id_pagina_publicacion:'page',
    numero_linea_propuesta:index+1,precio_tarifa:index+0.25,unidades:index===0?0:1,
    precio_total_personalizado:index%2===0?0:null,descripcion_linea:'Línea '+index}));
  const outputs={};
  for(const [version,source] of Object.entries(sources)) {
    const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
    const routine=tree.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='replaceLineas');
    const replace=new Function('asNumber','generateId',routine.getText(tree)+';return replaceLineas;')(
      (value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback,()=>{throw new Error('Unexpected generated id');});
    const rows=[],calls=[];
    const client={query:async(sql,values)=>{
      calls.push(sql);
      if(sql.startsWith('SELECT id_linea_propuesta'))return {rows:[{id_linea_propuesta:'line_0',id_pagina_publicacion:'page',especificaciones_linea:'Reserva'}]};
      if(sql.startsWith('SELECT id_pagina_publicacion,'))return {rows:[{id_pagina_publicacion:'page',pagina_preferente:'pag_pref_1'}]};
      if(sql.includes('INSERT INTO comercial_propuestas_lineas'))for(let i=0;i<values.length;i+=20)rows.push(values.slice(i,i+20));
      return {rows:[]};
    }};
    const start=performance.now();await replace(client,'proposal',lines);
    outputs[version]={rows,queries:calls.length,inserts:calls.filter(sql=>sql.includes('INSERT INTO comercial_propuestas_lineas')).length,
      ddl:calls.filter(sql=>sql.includes('ALTER TABLE')).length,recorderMs:Number((performance.now()-start).toFixed(3))};
  }
  assert.deepEqual(outputs.after.rows,outputs.before.rows);
  results.push({lines:count,identicalValues:true,...Object.fromEntries(Object.entries(outputs).map(([version,output])=>[
    version,Object.fromEntries(Object.entries(output).filter(([key])=>key!=='rows'))]))});
}
const report={baseline,scope:'SQL call counts and bound-value equivalence; recorder timings are not database latency',results};
const target=path.join(process.env.P3_TEST_REPORT_DIR||path.join(os.tmpdir(),'p3erp-tests'),'proposal-lines.json');
fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));console.log('Report: '+target);
