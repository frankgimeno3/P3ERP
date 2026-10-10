const quote = value => '"' + value.replaceAll('"', '""') + '"';
const evidenceKeys = new Set(['original','datos_originales','registro_facturas','lineas_anteriores','source','snapshot','historial_identificadores']);
// Raw imported source documents and history remain evidence of what was read.
export function replaceOperationalIdentifiers(value, replacements) {
  if (typeof value === 'string') return replacements.get(value) || value;
  if (Array.isArray(value)) return value.map(v=>replaceOperationalIdentifiers(v,replacements));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,evidenceKeys.has(k)?v:replaceOperationalIdentifiers(v,replacements)]));
  return value;
}
export async function renameIdentifiers(db, changes, backup) {
  if (!changes.length) return [];
  const replacements=new Map(changes.map(c=>[c.old,c.new]));
  if(replacements.size!==changes.length || new Set(changes.map(c=>`${c.table}:${c.new}`)).size!==changes.length)throw new Error('El plan contiene identificadores repetidos.');
  const columns=(await db.query("SELECT c.table_name,c.column_name,c.data_type,c.udt_name FROM information_schema.columns c JOIN information_schema.tables t USING(table_schema,table_name) WHERE c.table_schema=current_schema() AND t.table_type='BASE TABLE' AND c.data_type IN('text','character varying','jsonb','json','ARRAY') ORDER BY c.table_name,c.ordinal_position")).rows;
  const tables=[...new Set(columns.map(c=>c.table_name))].filter(t=>t!=='general_identificadores_alias');
  await db.query(`LOCK TABLE ${tables.map(quote).join(',')} IN SHARE ROW EXCLUSIVE MODE`);
  for(const c of changes){
    if(!(await db.query(`SELECT 1 FROM ${quote(c.table)} WHERE ${quote(c.column)}=$1`,[c.old])).rowCount)throw new Error('No existe el origen '+c.old);
    if(!changes.some(x=>x.table===c.table&&x.old===c.new) && (await db.query(`SELECT 1 FROM ${quote(c.table)} WHERE ${quote(c.column)}=$1`,[c.new])).rowCount)throw new Error('El destino ya existe '+c.new);
  }
  const foreignKeys=(await db.query("SELECT conname,conrelid::regclass::text child,condeferrable,condeferred FROM pg_constraint WHERE contype='f' AND connamespace=current_schema()::regnamespace")).rows;
  // Rekeying an existing agent must not invoke the normal employee-creation
  // trigger (nor other business creation/update hooks). FK triggers stay active.
  // DDL is transactional, so rollback restores every original trigger mode.
  const triggers=(await db.query("SELECT t.tgname,t.tgenabled,c.relname table_name FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relnamespace=current_schema()::regnamespace AND c.relkind IN('r','p') AND NOT t.tgisinternal AND t.tgenabled<>'D'")).rows;
  for(const t of triggers)await db.query(`ALTER TABLE ${quote(t.table_name)} DISABLE TRIGGER ${quote(t.tgname)}`);
  for(const fk of foreignKeys)if(!fk.condeferrable)await db.query(`ALTER TABLE ${fk.child} ALTER CONSTRAINT ${quote(fk.conname)} DEFERRABLE INITIALLY IMMEDIATE`);
  await db.query('SET CONSTRAINTS ALL DEFERRED');
  const oldIds=changes.map(c=>c.old),before=[],updates=[];
  // Collect every reference before updating anything. This also handles swaps
  // and renumbering chains without accidentally applying the map twice.
  for(const table of tables){
    const cols=columns.filter(c=>c.table_name===table);
    const predicates=cols.filter(c=>['text','character varying'].includes(c.data_type)).map(c=>`${quote(c.column_name)}=ANY($1::text[])`);
    const complex=cols.filter(c=>['jsonb','json','ARRAY'].includes(c.data_type));
    for(const c of complex)predicates.push(`EXISTS(SELECT 1 FROM unnest($1::text[]) v WHERE strpos(${quote(c.column_name)}::text,v)>0)`);
    if(!predicates.length)continue;
    const binary=(await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=$1 AND data_type='bytea'",[table])).rows;
    const expression=binary.reduce((s,c)=>s+`-${JSON.stringify(c.column_name).replaceAll('"',"'")}`,'to_jsonb(t)');
    const rows=(await db.query(`SELECT ctid::text location,${expression} value FROM ${quote(table)} t WHERE ${predicates.join(' OR ')}`,[oldIds])).rows;
    if(rows.length)before.push({table,rows:rows.map(r=>r.value)});
    for(const row of rows){
      const changed={};
      for(const c of cols){
        const old=row.value[c.column_name];
        const next=['text','character varying'].includes(c.data_type)?replacements.get(old)||old:replaceOperationalIdentifiers(old,replacements);
        if(JSON.stringify(old)!==JSON.stringify(next))changed[c.column_name]=next;
      }
      if(Object.keys(changed).length)updates.push({table,original:row.value,changed,cols});
    }
  }
  await backup(before);
  // PKs are immediate unique constraints. Temporarily vacate all source PKs
  // before applying final values; FKs are deferred only within this transaction.
  const temporary=new Map(changes.map((c,i)=>[c.old,`__idtmp_${i}`]));
  // Unique reference columns (e.g. one receipt per order) also need vacating.
  // Deferring FKs alone does not defer their unique indexes.
  const textUpdates=new Set(updates.flatMap(u=>Object.keys(u.changed).filter(f=>['text','character varying'].includes(u.cols.find(c=>c.column_name===f).data_type)).map(f=>u.table+':'+f)));
  for(const key of textUpdates){
    const [table,column]=key.split(':');
    if((await db.query(`SELECT 1 FROM ${quote(table)} WHERE ${quote(column)}=ANY($1::text[]) LIMIT 1`,[[...temporary.values()]])).rowCount)throw new Error('La clave temporal ya existe.');
    await db.query(`UPDATE ${quote(table)} t SET ${quote(column)}=m.temporary FROM unnest($1::text[],$2::text[]) m(old,temporary) WHERE t.${quote(column)}=m.old`,[oldIds,[...temporary.values()]]);
  }
  // ctid changes on UPDATE; restore the original PKs first using a temporary
  // second map. Each update below locates rows by their complete original PK.
  const primaryKeys=(await db.query("SELECT k.table_name,k.column_name,c.data_type,c.udt_name FROM information_schema.table_constraints t JOIN information_schema.key_column_usage k USING(constraint_catalog,constraint_schema,constraint_name) JOIN information_schema.columns c ON c.table_schema=k.table_schema AND c.table_name=k.table_name AND c.column_name=k.column_name WHERE t.table_schema=current_schema() AND t.constraint_type='PRIMARY KEY' ORDER BY k.ordinal_position")).rows;
  const batches=new Map();
  for(const update of updates){
    const keys=primaryKeys.filter(k=>k.table_name===update.table).map(k=>k.column_name);
    if(!keys.length)throw new Error('Referencia sin clave primaria: '+update.table);
    const original=update.original;
    const fields=Object.keys(update.changed);
    const selectors=keys.map(k=>temporary.get(original[k])||original[k]);
    const group=update.table+':'+fields.join(',');
    if(!batches.has(group))batches.set(group,{...update,fields,keys,rows:[]});
    batches.get(group).rows.push(Object.fromEntries([...fields.map((f,i)=>['v'+i,update.changed[f]]),...selectors.map((s,i)=>['k'+i,s])]));
  }
  const sqlType=c=>c.data_type==='ARRAY'?quote(c.udt_name.slice(1))+'[]':c.data_type;
  for(const batch of batches.values()){
    const records=[...batch.fields.map((f,i)=>`v${i} ${sqlType(batch.cols.find(c=>c.column_name===f))}`),...batch.keys.map((k,i)=>`k${i} ${sqlType(primaryKeys.find(c=>c.table_name===batch.table&&c.column_name===k))}`)];
    const result=await db.query(`UPDATE ${quote(batch.table)} t SET ${batch.fields.map((f,i)=>`${quote(f)}=m.v${i}`).join(',')} FROM jsonb_to_recordset($1::jsonb) m(${records.join(',')}) WHERE ${batch.keys.map((k,i)=>`t.${quote(k)} IS NOT DISTINCT FROM m.k${i}`).join(' AND ')}`,[JSON.stringify(batch.rows)]);
    if(result.rowCount!==batch.rows.length)throw new Error('No se actualizaron todas las referencias de '+batch.table);
  }
  await db.query('SET CONSTRAINTS ALL IMMEDIATE');
  for(const fk of foreignKeys)if(!fk.condeferrable)await db.query(`ALTER TABLE ${fk.child} ALTER CONSTRAINT ${quote(fk.conname)} NOT DEFERRABLE`);
  for(const t of triggers)await db.query(`ALTER TABLE ${quote(t.table_name)} ENABLE ${t.tgenabled==='A'?'ALWAYS ':t.tgenabled==='R'?'REPLICA ':''}TRIGGER ${quote(t.tgname)}`);
  for(const c of changes)await db.query("INSERT INTO general_identificadores_alias(entidad,id_anterior,id_actual,motivo) VALUES($1,$2,$3,$4)",[c.entity,c.old,c.new,c.reason||'Normalización de formato; sin cambios económicos.']);
  return updates.map(u=>({table:u.table,fields:Object.keys(u.changed)}));
}
