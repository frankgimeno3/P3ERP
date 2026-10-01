// One-off, snapshot-guarded replacement. Default: rehearse all changes and ROLLBACK.
// --apply commits the authorized plan. --restore rehearses restoration; --restore --apply commits it.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
const folder=path.resolve(process.env.USERPROFILE,'OneDrive/Escritorio/respaldo-cuentas-20260916');
const read=n=>JSON.parse(fs.readFileSync(path.join(folder,`${n}.json`),'utf8'));
const plan=read('deletion-plan'), snapshot=read('snapshot-manifest'), metadata=read('metadata'), prepared=read('normalized-import');
const apply=process.argv.includes('--apply'),restore=process.argv.includes('--restore');
assert(process.argv.slice(2).every(a=>['--apply','--restore'].includes(a)),'Unknown argument');
const receiptPath=path.join(folder,restore?'restoration-result.json':'replacement-result.json');
if(apply)assert(!fs.existsSync(receiptPath),'Already applied: inspect result instead of rerunning');
const digest=v=>createHash('sha256').update(v).digest('hex');
const inputHash=digest(fs.readFileSync(path.join(folder,'normalized-import.json')));
for(const [t,h]of Object.entries(snapshot.tables))if(h.sha256)assert.equal(digest(fs.readFileSync(path.join(folder,`${t}.json`))),h.sha256,`Backup changed: ${t}`);
const quote=id=>{assert(/^[a-z_][a-z0-9_]*$/.test(id));return `"${id}"`;};
const columns=t=>metadata.columns.filter(c=>c.table_name===t).map(c=>c.column_name);
const names=Object.keys(snapshot.tables).sort();
const changed=Object.keys(plan.tables).filter(t=>plan.tables[t].delete.length);
const order=['tesoreria_aplicaciones_cobro','tesoreria_recibos_importados','comentarios_registro_eventos','cuentas_registro_eventos','general_comentarios','comercial_suscripciones','produccion_materiales','produccion_contenidos','administracion_lineas_factura','comercial_contratos_lineas','comercial_propuestas_lineas','comercial_contratos_cobros','comercial_propuestas_cobros','tesoreria_ordenes','administracion_facturas_clientes','comercial_contratos','comercial_propuestas_db','comercial_contactos','produccion_control_redaccion','tesoreria_ingresos_adicionales','tesoreria_remesas','comercial_cuentas'].filter(t=>changed.includes(t));
assert.deepEqual([...order].sort(),[...changed].sort());
assert.equal(plan.tables.agentes_db.delete.length,0,'Agents must never be deleted by replacement');
const renameIds=prepared.renamedAgents.map(r=>({id_agente:r.id_agente}));
const newIds=prepared.agents.map(r=>({id_agente:r.id_agente}));
const match=`EXISTS (SELECT 1 FROM jsonb_array_elements($1::jsonb) item WHERE to_jsonb(t) @> item)`;
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect();
let committed=false;
async function fingerprint(t,exclude=[]){
  const pk=plan.keys[t];
  const filter=!exclude.length?'':pk.length===1?`WHERE NOT (t.${quote(pk[0])}::text = ANY($1::text[]))`:`WHERE NOT (${match})`;
  const args=!exclude.length?[]:pk.length===1?[exclude.map(r=>String(r[pk[0]]))]:[JSON.stringify(exclude)];
  const r=await db.query(`SELECT count(*)::int n, md5(coalesce(string_agg(row_hash,'' ORDER BY row_hash),'')) hash FROM (SELECT md5(row_to_json(t)::text) row_hash FROM public.${quote(t)} t ${filter}) h`,args);
  return r.rows[0];
}
async function insertRows(t,rows){
  const cols=columns(t).map(quote).join(',');
  for(let i=0;i<rows.length;i+=200){
    const batch=rows.slice(i,i+200);
    const r=await db.query(`INSERT INTO public.${quote(t)} (${cols}) SELECT ${cols} FROM json_populate_recordset(NULL::public.${quote(t)},$1::json)`,[JSON.stringify(batch)]);
    assert.equal(r.rowCount,batch.length);
  }
}
async function assertRows(t,rows){
  for(let i=0;i<rows.length;i+=200){
    const r=await db.query(`SELECT count(*)::int n FROM json_populate_recordset(NULL::public.${quote(t)},$1::json) s LEFT JOIN public.${quote(t)} t USING (${plan.keys[t].map(quote).join(',')}) WHERE to_jsonb(t) IS DISTINCT FROM to_jsonb(s)`,[JSON.stringify(rows.slice(i,i+200))]);
    assert.equal(r.rows[0].n,0,`Inserted data mismatch: ${t}`);
  }
}
try{
  await db.query('BEGIN');
  await db.query("SET LOCAL lock_timeout = '3s'");
  await db.query("SET LOCAL statement_timeout = '60s'");
  // Prevent concurrent changes to ownership/reference tables during validation and replacement.
  // No cancellation of sessions; fail immediately if another writer has a lock.
  await db.query(`LOCK TABLE ${Object.keys(plan.tables).sort().map(t=>`public.${quote(t)}`).join(',')} IN SHARE ROW EXCLUSIVE MODE NOWAIT`);
  const liveNames=(await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.tablename);
  assert.deepEqual(liveNames,names,'Table inventory changed');
  const liveColumns=(await db.query("SELECT table_name,column_name,data_type,column_default,is_nullable FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position")).rows;
  assert.deepEqual(liveColumns,metadata.columns,'Schema changed since audit');
  const liveConstraints=(await db.query("SELECT conrelid::regclass::text AS child,confrelid::regclass::text AS parent,contype,conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY conrelid::regclass::text,conname")).rows;
  assert.deepEqual(liveConstraints,metadata.constraints,'Constraints changed since audit');
  const baseline=restore?read('replacement-result').after:snapshot.tables;
  const before={};
  for(const t of names){before[t]=await fingerprint(t);assert.deepEqual(before[t],{n:baseline[t].n,hash:baseline[t].hash},`Data changed since snapshot: ${t}; stop and review`);}
  console.log('Snapshot and table structure verified. '+(restore?'Restoring':'Applying in transaction')+' reviewed keys.');
  const protectedRows={};
  if(!restore){
    for(const t of names)protectedRows[t]=await fingerprint(t,t==='agentes_db'?renameIds:(plan.tables[t]?.delete||[]).map(r=>r.key));
    for(const t of order){
      const keys=plan.tables[t].delete.map(r=>r.key);
      const result=await db.query(`DELETE FROM public.${quote(t)} t WHERE ${match}`,[JSON.stringify(keys)]);
      assert.equal(result.rowCount,keys.length,`Unexpected deleted count: ${t}`);
    }
    await insertRows('agentes_db',prepared.agents);
    for(const r of prepared.renamedAgents){
      const res=await db.query('UPDATE public.agentes_db SET nombre_agente=$2,apellidos_agente=$3,nombre_completo_agente=$4,updated_at=$5 WHERE id_agente=$1',[r.id_agente,r.nombre_agente,r.apellidos_agente,r.nombre_completo_agente,prepared.agents[0].created_at]);
      assert.equal(res.rowCount,1);
    }
    await insertRows('comercial_cuentas',prepared.accounts);
    await assertRows('comercial_cuentas',prepared.accounts);
    await assertRows('agentes_db',prepared.agents);
    const oldAgents=read('agentes_db');
    await assertRows('agentes_db',prepared.renamedAgents.map(r=>({...oldAgents.find(a=>a.id_agente===r.id_agente),...r,updated_at:prepared.agents[0].created_at})));
    const badAgents=(await db.query("SELECT count(*)::int n FROM public.comercial_cuentas c LEFT JOIN public.agentes_db a ON c.id_agente=a.id_agente WHERE c.id_agente<>'' AND a.id_agente IS NULL")).rows[0].n;
    assert.equal(badAgents,0,'Imported account has invalid agent');
    for(const t of names){
      const exclude=t==='comercial_cuentas'?prepared.accounts.map(r=>({id_cuenta:r.id_cuenta})):t==='agentes_db'?[...renameIds,...newIds]:[];
      assert.deepEqual(await fingerprint(t,exclude),protectedRows[t],`Unrelated rows changed: ${t}`);
    }
  }else{
    assert.equal(read('replacement-result').inputHash,inputHash,'Import artifact changed');
    let r=await db.query('DELETE FROM public.comercial_cuentas WHERE id_cuenta = ANY($1::text[])',[prepared.accounts.map(a=>a.id_cuenta)]);
    assert.equal(r.rowCount,prepared.accounts.length);
    r=await db.query(`DELETE FROM public.agentes_db t WHERE ${match}`,[JSON.stringify(newIds)]);
    assert.equal(r.rowCount,prepared.agents.length);
    const agentColumns=columns('agentes_db').filter(c=>c!=='id_agente');
    await db.query(`UPDATE public.agentes_db t SET ${agentColumns.map(c=>`${quote(c)}=s.${quote(c)}`).join(',')} FROM json_populate_recordset(NULL::public.agentes_db,$1::json) s WHERE t.id_agente=s.id_agente AND s.id_agente=ANY($2::text[])`,[fs.readFileSync(path.join(folder,'agentes_db.json'),'utf8'),prepared.renamedAgents.map(r=>r.id_agente)]);
    for(const t of [...order].reverse()){
      const cols=columns(t).map(quote).join(',');
      const r=await db.query(`INSERT INTO public.${quote(t)} (${cols}) SELECT ${columns(t).map(c=>`t.${quote(c)}`).join(',')} FROM json_populate_recordset(NULL::public.${quote(t)},$2::json) t WHERE ${match}`,[JSON.stringify(plan.tables[t].delete.map(r=>r.key)),fs.readFileSync(path.join(folder,`${t}.json`),'utf8')]);
      assert.equal(r.rowCount,plan.tables[t].delete.length);
    }
    for(const t of names)assert.deepEqual(await fingerprint(t),{n:snapshot.tables[t].n,hash:snapshot.tables[t].hash},`Restoration mismatch: ${t}`);
  }
  await db.query('SET CONSTRAINTS ALL IMMEDIATE');
  const after={};for(const t of names)after[t]=await fingerprint(t);
  if(!restore){
    assert.equal(after.comercial_cuentas.n,6686);
    assert.equal(after.agentes_db.n,snapshot.tables.agentes_db.n+prepared.agents.length);
    for(const t of order)if(t!=='comercial_cuentas')assert.equal(after[t].n,plan.tables[t].keep);
  }
  const result={at:new Date().toISOString(),mode:restore?'restore':'replace',committed:apply,inputHash,deleted:restore?{}:Object.fromEntries(order.map(t=>[t,plan.tables[t].delete.length])),imported:restore?0:prepared.accounts.length,newAgents:restore?0:prepared.agents.length,renamedAgents:prepared.renamedAgents,before,after};
  // Durable pre-commit record makes outcomes recoverable even if the connection drops during COMMIT.
  const preparedReceipt=path.join(folder,`${restore?'restore':'replace'}-${apply?'pending':'rehearsal'}.json`);
  fs.writeFileSync(preparedReceipt,JSON.stringify({...result,committed:false},null,2));
  await db.query(apply?'COMMIT':'ROLLBACK');committed=apply;
  if(apply)fs.writeFileSync(receiptPath,JSON.stringify(result,null,2),{flag:'wx'});
  console.log(JSON.stringify({committed,restored:restore,accounts:after.comercial_cuentas.n,agents:after.agentes_db.n,verifiedTables:names.length,unrelatedRows:'unchanged',deleted:result.deleted},null,2));
}catch(error){
  if(!committed)await db.query('ROLLBACK').catch(()=>{});
  throw error;
}finally{db.release();await pool.end();}
