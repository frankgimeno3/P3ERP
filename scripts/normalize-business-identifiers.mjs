import env from '@next/env';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {getPgPool} from '../server/database/pgClient.js';
import {contractOrderIdentifier} from '../server/features/identifiers/BusinessIdentifiers.js';
import {renameIdentifiers} from '../server/features/identifiers/IdentifierNormalization.js';
env.loadEnvConfig(process.cwd());
const p=getPgPool(),db=await p.connect(),apply=process.argv.includes('--apply');
const folder='C:/Users/frank/Downloads/p3erp-identificadores-20261009';
// Bound the client wait as well as PostgreSQL execution, including a lost socket.
const nativeQuery=db.query.bind(db);
db.query=(text,values)=>nativeQuery({text,values,query_timeout:30000});
db.on('error',()=>{});
try{
 await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'");
 if(!(await db.query("SELECT pg_try_advisory_xact_lock(hashtext('ingresos:conciliacion')) locked")).rows[0].locked)throw Error('Hay otra operación de ingresos activa; no se inicia la renumeración.');
 await db.query("SELECT pg_advisory_xact_lock(hashtext('identificadores:cuentas'))");
 const changes=[],unresolved=[];
 const add=(entity,table,column,old,next,reason)=>changes.push({entity,table,column,old,new:next,reason});
 const accounts=(await db.query('SELECT id_cuenta,nombre_empresa FROM comercial_cuentas ORDER BY id_cuenta')).rows;
 let acc=Math.max(0,...accounts.map(a=>Number(a.id_cuenta.match(/^ACC(\d+)$/)?.[1])||0));
 for(const a of accounts)if(!/^ACC\d+$/.test(a.id_cuenta))add('cuenta','comercial_cuentas','id_cuenta',a.id_cuenta,`ACC${++acc}`,'Cuenta real importada sin código ACC; se conserva origen CRM.');
 const invoices=(await db.query("SELECT id_factura_cliente,numero_factura FROM administracion_facturas_clientes WHERE id_factura_cliente LIKE 'fac_excel_%'")).rows;
 for(const f of invoices)add('factura','administracion_facturas_clientes','id_factura_cliente',f.id_factura_cliente,f.numero_factura,'Número original de factura recuperado del registro.');
 const orders=(await db.query('SELECT id_orden,id_contrato,id_factura,numero_cobro,datos_importacion FROM tesoreria_ordenes')).rows;
 for(const o of orders){
  const valid=/^C\d{2}\.\d{3}\.\d{3}-\d+\/\d+$/.test(o.id_orden);
  if(valid&&(!o.id_contrato||o.id_orden.split('-')[0]===o.id_contrato))continue;
  if(!o.id_contrato){unresolved.push({entity:'orden',id:o.id_orden,invoice:o.id_factura,reason:'Serie para órdenes sin contrato pendiente; MECAL requiere unificar errata.'});continue;}
  const group=orders.filter(x=>x.id_contrato===o.id_contrato),number=Number(o.numero_cobro);
  const total=Math.max(...group.map(x=>Number(x.numero_cobro)||1),...group.map(x=>Number(x.id_orden.match(/\/(\d+)$/)?.[1])||1));
  if(group.filter(x=>Number(x.numero_cobro)===number).length>1){unresolved.push({entity:'orden',id:o.id_orden,reason:'Número de cobro repetido dentro del contrato.'});continue;}
  add('orden','tesoreria_ordenes','id_orden',o.id_orden,contractOrderIdentifier(o.id_contrato,number,total),'Código ajustado al contrato y número de cobro documentados; importes y estados intactos.');
 }
 const contents=(await db.query('SELECT id_contenido FROM produccion_contenidos ORDER BY id_contenido')).rows;
 let hp=Math.max(0,...contents.map(c=>Number(c.id_contenido.match(/^hp_26_(\d{3}\.\d{3})$/)?.[1].replace('.',''))||0));
 for(const c of contents){
  if(c.id_contenido.includes('~fila')){const serial=String(++hp).padStart(6,'0');add('contenido','produccion_contenidos','id_contenido',c.id_contenido,`hp_26_${serial.slice(0,3)}.${serial.slice(3)}`,'Contenido independiente de la hoja de producción; código repetido en origen.');}
  if(c.id_contenido.startsWith('content_'))unresolved.push({entity:'contenido',id:c.id_contenido,reason:'Carga inicial sin cuenta existente; pendiente confirmar datos de prueba.'});
 }
 const cards=(await db.query("SELECT id_tarjeta FROM tesoreria_tarjetas WHERE id_tarjeta LIKE 'personal-%'")).rows;
 for(const c of cards)add('tarjeta','tesoreria_tarjetas','id_tarjeta',c.id_tarjeta,randomUUID(),'Clave UUID coherente con el resto de tarjetas.');
 const suppliers=(await db.query("SELECT id_proveedor FROM administracion_proveedores WHERE id_proveedor!~'^prov_[0-9a-f]{32}$'")).rows;
 for(const s of suppliers){
  if(s.id_proveedor.startsWith('prov_demo_')){unresolved.push({entity:'proveedor',id:s.id_proveedor,reason:'Dato de demostración; pendiente confirmar eliminación.'});continue;}
  add('proveedor','administracion_proveedores','id_proveedor',s.id_proveedor,'prov_'+randomUUID().replaceAll('-',''),'Clave del proveedor compatible con el generador vigente; identidad fiscal intacta.');
 }
 const agents=(await db.query('SELECT id_agente,nombre_completo_agente FROM agentes_db ORDER BY id_agente')).rows;
 let ag=Math.max(0,...agents.map(a=>Number(a.id_agente.match(/^ag_26_(\d+)$/)?.[1])||0));
 for(const a of agents){
  if(a.id_agente.startsWith('ag_import_')){unresolved.push({entity:'agente',id:a.id_agente,name:a.nombre_completo_agente,reason:'Grupo CRM registrado como agente; pendiente reclasificación.'});continue;}
  if(!/^ag_\d{2}_\d{4}$/.test(a.id_agente))add('agente','agentes_db','id_agente',a.id_agente,`ag_26_${String(++ag).padStart(4,'0')}`,'Numeración histórica de agentes; email, acceso y rol conservados.');
 }
 const counts=Object.fromEntries([...new Set(changes.map(c=>c.entity))].map(e=>[e,changes.filter(c=>c.entity===e).length]));
 const tables=(await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name<>'general_identificadores_alias' ORDER BY table_name")).rows;
 const financial=async(after=false)=>({
  orders:(await db.query('SELECT id_orden,cobro_total,base_imponible,cobrada,cancelada,cobro_revision_bancaria,fecha_real_cobro FROM tesoreria_ordenes')).rows.map(o=>({...o,id_orden:after?(changes.find(c=>c.entity==='orden'&&c.new===o.id_orden)?.old||o.id_orden):o.id_orden})).sort((a,b)=>a.id_orden.localeCompare(b.id_orden)),
  invoices:(await db.query('SELECT numero_factura,importe_total,base_imponible,estado,ya_contabilizada FROM administracion_facturas_clientes ORDER BY numero_factura')).rows,
  bank:(await db.query('SELECT id_linea_banco,importe,estado_revision,fecha_operativa FROM tesoreria_movimientos_bancarios ORDER BY id_linea_banco')).rows,
 });
 if(!apply){await fs.writeFile(folder+'/normalization-plan.json',JSON.stringify({counts,changes,unresolved},null,2));await db.query('ROLLBACK');console.log(JSON.stringify({applied:false,counts,pending:unresolved.length,plan:folder+'/normalization-plan.json'}));}
 else{
  await db.query(await fs.readFile('database/migrations/20261009_0004_identifier_aliases.sql','utf8'));
  const before=await financial(),rowsBefore=[];for(const t of tables)rowsBefore.push({table:t.table_name,n:(await db.query(`SELECT count(*)::int n FROM "${t.table_name}"`)).rows[0].n});
  const backup=folder+'/before-normalization-'+Date.now()+'.json';
  const updated=await renameIdentifiers(db,changes,async rows=>fs.writeFile(backup,JSON.stringify({changes,financial:before,counts:rowsBefore,rows},null,2),{flag:'wx'}));
  assertSame(before,await financial(true),'Han cambiado importes o estados financieros.');
  for(const t of rowsBefore)if((await db.query(`SELECT count(*)::int n FROM "${t.table}"`)).rows[0].n!==t.n)throw Error('Ha cambiado el número de filas de '+t.table);
  await db.query('COMMIT');
  await fs.writeFile(folder+'/normalization-result.json',JSON.stringify({counts,changes,unresolved,backup,updated},null,2));
  console.log(JSON.stringify({applied:true,counts,pending:unresolved.length,backup,tablesUpdated:new Set(updated.map(u=>u.table)).size}));
 }
}catch(error){try{await db.query('ROLLBACK');}catch{}throw error;}finally{db.release(true);await p.end();}
function assertSame(a,b,message){if(JSON.stringify(a)!==JSON.stringify(b))throw Error(message);}
