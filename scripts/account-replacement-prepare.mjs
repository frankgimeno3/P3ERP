// Offline CSV mapping for the explicitly authorized September 2026 replacement.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const folder=path.resolve(process.env.USERPROFILE,'OneDrive/Escritorio/respaldo-cuentas-20260916');
assert(!fs.existsSync(path.join(folder,'replacement-result.json')), 'Replacement already committed: preserve the imported data artifact');
const read=n=>JSON.parse(fs.readFileSync(path.join(folder,`${n}.json`),'utf8'));
const source=read('csv-parsed'), metadata=read('metadata'), oldAgents=read('agentes_db'), fairs=read('administracion_ferias_ediciones');
const norm=v=>String(v??'').normalize('NFD').replace(/\p{M}/gu,'').trim().replace(/\s+/g,' ').toUpperCase();
const importAt=new Date().toISOString();
function defaults(table) {
  return Object.fromEntries(metadata.columns.filter(c=>c.table_name===table).map(c=>{
    if(c.data_type==='timestamp with time zone')return[c.column_name,importAt];
    if(c.data_type==='jsonb')return[c.column_name,c.column_default?.includes('{}')?{}:[]];
    if(c.data_type==='boolean')return[c.column_name,c.column_default==='true'];
    return[c.column_name,c.is_nullable==='YES'?null:''];
  }));
}
// These two aliases were explicitly confirmed by the user; keep identities and permissions.
const known={'FRANK':'ag_25_0008','GIMENO':'ag_305a8d12a9a44be698bd','MONTSE VALENCIA':'ag_8ebc433331614e8dbf2b','RICARDO CALLEJA':'ag_25_0002'};
for(const id of Object.values(known))assert(oldAgents.some(a=>a.id_agente===id));
const renamedAgents=['FRANK','GIMENO'].map(name=>({id_agente:known[name],nombre_agente:name,apellidos_agente:'',nombre_completo_agente:name}));
const agents=[],mapping={};
for(const name of [...new Set(source.map(r=>r.AGENTE.trim()).filter(Boolean))].sort()){
  const existing=oldAgents.filter(a=>norm(a.nombre_completo_agente)===norm(name));
  assert(existing.length<=1,`Agente ambiguo: ${name}`);
  const id=known[norm(name)]||existing[0]?.id_agente||`ag_import_${createHash('sha256').update(norm(name)).digest('hex').slice(0,20)}`;
  mapping[name]=id;
  if(!oldAgents.some(a=>a.id_agente===id))agents.push({...defaults('agentes_db'),id_agente:id,nombre_agente:name,nombre_completo_agente:name,rol_agente:'base',estado_agente:'activo',is_empleado_account:false});
}
function date(v){
  const match=v.match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
  assert(match,`Fecha no reconocida: ${v}`);
  const [,d,m,y,h,mi,s]=match;
  const test=new Date(`${y}-${m}-${d}T${h}:${mi}:${s}Z`);
  assert(Number.isFinite(test.getTime())&&test.toISOString().startsWith(`${y}-${m}-${d}T${h}:${mi}:${s}`),`Fecha inválida: ${v}`);
  return `${y}-${m}-${d} ${h}:${mi}:${s} Europe/Madrid`;
}
const fairMap=new Map();
for(const f of fairs){const k=norm(f.nombre_feria);fairMap.set(k,[...(fairMap.get(k)||[]),f.id_feria]);}
const unresolvedFairs={};let matchedFairs=0;
const accounts=source.map((row,i)=>{
  const v=k=>row[k].trim();
  const record={...defaults('comercial_cuentas'),
    id_cuenta:v('Número de Cuenta'),id_edisoft:v('CÓDIGO PP3'),nombre_empresa:v('Nombre de Cuenta'),
    id_agente:mapping[v('AGENTE')]||'',asignado_a:v('Asignado a'),website:v('Página web'),
    pais_cuenta:v('País (Factura)')||v('País (Envío)'),
    receptor_revista:Boolean(v('RECEPTOR REVISTA')),
    suscriptor_revista:/SUSCRIPTOR/.test(v('Tipo'))&&!/EX-SUSCRIPTOR/.test(v('Tipo')),
    potencial_actual_relacion:v('Potencial actual - Relación'),potencial_futuro_encaje:v('Potencial futuro - Encaje con nuestros medios'),
    revisado_ricardo:['REVISADO','GESTIONADO'].includes(v('REVISADO RICARDO')),
    campanas:v('CAMPAÑAS'),estado_leads_frios:v('ESTADO LEADS FRÍOS'),
    stands_ferias:['Fensterbau','VETECO STAND','GLASSTEC STAND'].filter(k=>v(k)).map(k=>`${k}: ${v(k)}`).join('\n'),
    tipo_cuenta:v('Tipo'),actividades_cuenta:v('ACTIVIDADES'),descripcion_actividad:v('DESCRIPCIÓN DE ACTIVIDAD'),
    correo_principal:v('De Correo Electrónico Principal'),
    qq:/^(OK\s?QQ|CAMBIARQQ|SOLODIGITAL)/.test(v('QUIEN ES QUIEN')),
    presente_en_qq:/^(OK\s?QQ|CAMBIARQQ|SOLODIGITAL)/.test(v('QUIEN ES QUIEN')),
    red_social_prioritaria:v('RED SOCIAL PRIORITARIA'),catalogos:v('CATÁLOGOS'),descripcion_cuenta:v('Descripción'),
    pais_facturacion:v('País (Factura)'),direccion_facturacion:v('Dirección (Factura)'),
    poblacion_facturacion:v('Población (Factura)'),cp_facturacion:v('Código Postal (Factura)'),
    detalles_facturacion:v('Provincia (Factura)')?`Provincia: ${v('Provincia (Factura)')}`:'',
    created_at:date(v('Fecha de Creación')),updated_at:date(v('Fecha de Modificación')),
    datos_comerciales:{
      ciudad_principal_cuenta:v('Población (Factura)')||v('Población (Envío)'),
      telefono_principal_cuenta:v('Teléfono Principal'),categoria_principal_cuenta:v('Tipo'),
      contacto_principal:'',resumen_actividad_cuenta:v('DESCRIPCIÓN DE ACTIVIDAD'),
      importacion_csv:{archivo:'Cuentas (1).csv',fila:i+2,importado_en:importAt,datos_originales:row},
    },
  };
  for(const kind of ['Factura','Envío']){
    if(!['Dirección','Población','Provincia','Código Postal','País'].some(k=>v(`${k} (${kind})`)))continue;
    record.array_direcciones_cuenta.push({nombre_direccion:kind==='Factura'?'Facturación':'Envío',direccion_completa:v(`Dirección (${kind})`),ciudad_direccion:v(`Población (${kind})`),region_direccion:v(`Provincia (${kind})`),codigo_postal:v(`Código Postal (${kind})`),pais_direccion:v(`País (${kind})`),telefono_direccion:v('Teléfono Principal'),descripcion_direccion:kind==='Envío'&&v('RECEPTOR REVISTA')?`Receptor revista: ${v('RECEPTOR REVISTA')}`:''});
  }
  for(const name of v('FERIAS').split('|##|').map(s=>s.trim()).filter(Boolean)){
    const matches=fairMap.get(norm(name))||[];
    if(matches.length===1){record.ferias.push(matches[0]);matchedFairs++;}
    else unresolvedFairs[name]=(unresolvedFairs[name]||0)+1;
  }
  record.ferias=[...new Set(record.ferias)];
  assert(record.id_cuenta&&record.nombre_empresa);
  return record;
});
assert.equal(accounts.length,6686);
assert.equal(new Set(accounts.map(a=>a.id_cuenta)).size,accounts.length);
const oldIds=new Set(read('comercial_cuentas').map(a=>a.id_cuenta));
assert(!accounts.some(a=>oldIds.has(a.id_cuenta)),'Colisión con cuenta anterior');
for(const [table,rows] of [['comercial_cuentas',accounts],['agentes_db',agents]])for(const r of rows)for(const col of metadata.columns.filter(c=>c.table_name===table)){
  if(col.is_nullable==='NO')assert(r[col.column_name]!=null,`Falta ${table}.${col.column_name}`);
  if(col.data_type==='text'&&r[col.column_name]!=null)assert.equal(typeof r[col.column_name],'string');
}
const report={importAt,accounts:accounts.length,newAgents:agents.length,agentMapping:mapping,renamedAgents,
  sourceColumns:Object.keys(source[0]),uniqueAccountId:'Número de Cuenta → id_cuenta; CÓDIGO PP3 → id_edisoft (incluidos los 446 ceros)',
  preservedSource:'Las 52 columnas completas se conservan en datos_comerciales.importacion_csv.datos_originales. Teléfonos y códigos postales son cadenas.',
  nonRelationalHistory:'PROPUESTAS, FACTURAS EMITIDAS, SEGUIMIENTO DE PRODUCCIÓN y DISTRIBUIDORES son texto histórico: se conservan, sin generar registros o relaciones ficticias.',
  interpretation:{dates:'dd-MM-yyyy HH:mm:ss en Europe/Madrid',revisado_ricardo:'true solo REVISADO o GESTIONADO; estado original conservado',qq:'OKQQ, OK QQ, CAMBIARQQ o SOLODIGITAL; AÑADIRQQ no marca presencia',recipient:'Nombre del receptor conservado; receptor_revista indica si se proporciona. No se crean contactos automáticamente.',fairs:'Solo coincidencia exacta normalizada y única, sin escoger arbitrariamente una edición.'},
  matchedFairs,unresolvedFairs,accountsWithoutAgent:accounts.filter(a=>!a.id_agente).length};
for(const [name,value] of [['normalized-import',{accounts,agents,renamedAgents}],['mapping-report',report]])fs.writeFileSync(path.join(folder,`${name}.json`),JSON.stringify(value,null,2));
console.log(JSON.stringify({accounts:accounts.length,newAgents:agents.map(a=>a.nombre_completo_agente),renamedAgents,matchedFairs,unresolvedFairNames:Object.keys(unresolvedFairs).length,accountsWithoutAgent:report.accountsWithoutAgent},null,2));
