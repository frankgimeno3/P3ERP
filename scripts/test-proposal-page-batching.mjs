import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
// Exercise the real private write routine with an isolated query recorder; no RDS writes.
const source=fs.readFileSync('server/features/propuesta/PropuestaRepository.js','utf8');
const tree=ts.createSourceFile('repository.js',source,ts.ScriptTarget.Latest,true);
const routine=tree.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='replaceLineas');
assert.ok(routine);
const replace=new Function('asNumber','generateId',routine.getText(tree)+';return replaceLineas;')((value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback,prefix=>prefix+'_test');
const calls=[],writes=[];
const client={query:async(sql,values)=>{
  calls.push({sql,values});
  if(sql.startsWith('SELECT id_linea_propuesta'))return {rows:[{id_linea_propuesta:'old',id_pagina_publicacion:'reserved',especificaciones_linea:'Conservar reserva'}]};
  if(sql.startsWith('SELECT id_pagina_publicacion,'))return {rows:[{id_pagina_publicacion:'reserved',pagina_preferente:'pag_pref_4'},{id_pagina_publicacion:'cover',pagina_preferente:'portada'}]};
  if(sql.includes('INSERT INTO comercial_propuestas_lineas'))writes.push(values);
  return {rows:[]};
}};
await replace(client,'proposal',[
  {id_linea_propuesta:'old',id_pagina_publicacion:'reserved',especificaciones_linea:'No sustituir'},
  {id_linea_propuesta:'new',id_pagina_publicacion:'reserved',especificaciones_linea:'Nueva reserva'},
  {id_linea_propuesta:'cover-line',id_pagina_publicacion:'cover',especificaciones_linea:'Portada'},
  {id_linea_propuesta:'no-page',especificaciones_linea:'Sin página'},
]);
const reads=calls.filter(call=>call.sql.includes('FROM servicios_paginas_revista'));
assert.equal(reads.length,1);assert.deepEqual(reads[0].values,[['reserved','cover']]);
assert.deepEqual(writes.map(row=>row[16]),['Conservar reserva','Nueva reserva','Portada','Sin página']);
assert.deepEqual(writes.map(row=>row[2]),[1,2,3,4]);
calls.length=0;await replace(client,'empty',[]);
assert.equal(calls.filter(call=>call.sql.includes('FROM servicios_paginas_revista')).length,0);
console.log('PASS: one page lookup for repeated pages, reserved specifications preserved, new/cover/no-page lines and empty proposals.');
