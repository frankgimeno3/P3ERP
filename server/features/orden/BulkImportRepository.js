import { createHash, randomUUID } from 'node:crypto';
import { getPgPool } from '../../database/pgClient.js';
import { bulkImportTypes, bulkPolicies } from '../../../app/config/bulkImportFields.js';
import { accountActivity, orderActivity } from '../comentario/AccountActivity.js';
import { ensureOrderReceipt, lockIncome, syncOrderCollections, syncInvoiceCollection } from '../prevision/IncomeReconciliation.js';
import { parseImportDate } from '../prevision/ReceiptExcel.js';

const fail=(message,status=409)=>{throw Object.assign(new Error(message),{status});};
const mapBy=(rows,key)=>new Map(rows.map(row=>[row[key],row]));
const unique=values=>[...new Set(values.filter(Boolean))].sort();
const immutable=invoice=>invoice?.ya_contabilizada || invoice?.verifactu_estado_envio==='factura emitida';
const equal=(a,b)=>String(a ?? '')===String(b ?? '');
function normalizedDate(value) {
  if(value instanceof Date)return `${String(value.getDate()).padStart(2,'0')}/${String(value.getMonth()+1).padStart(2,'0')}/${value.getFullYear()}`;
  return value ? parseImportDate(value) : '';
}

export async function bulkImport({type,policy,rows,choices={},token,commit=false,actorId=''},pool=getPgPool()) {
  if(!Object.hasOwn(bulkImportTypes,type)||!Object.hasOwn(bulkPolicies,policy))fail('Tipo o política no válidos.',400);
  if(!rows?.length || rows.length>5000)fail('El Excel debe contener entre 1 y 5.000 filas.',400);
  const schema=bulkImportTypes[type],db=await pool.connect();
  try {
    await db.query(commit?'BEGIN':'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await db.query("SET LOCAL lock_timeout='3s'");
    if(commit)await lockIncome(db);
    const select=async(table,key,ids,lock=false)=>(await db.query(`SELECT * FROM ${table} WHERE ${key}=ANY($1::text[]) ORDER BY ${key}${lock?' FOR UPDATE':''}`,[unique(ids)])).rows;
    const existing=await select(schema.table,schema.id,rows.map(row=>row.data[schema.id]),commit);
    const beforeMap=mapBy(existing,schema.id);
    const effective=rows.map(row=>({...beforeMap.get(row.data[schema.id]),...row.data}));
    const contractIds=unique(effective.flatMap(row=>[row.id_contrato]));
    const contracts=await select('comercial_contratos','id_contrato',contractIds);
    const invoices=await select('administracion_facturas_clientes','id_factura_cliente',effective.flatMap(row=>[row.id_factura,row.id_factura_cliente,...contracts.map(c=>c.id_factura)]));
    const accounts=await select('comercial_cuentas','id_cuenta',effective.map(row=>row[schema.account]));
    const agents=await select('agentes_db','id_agente',effective.map(row=>row.id_agente_contrato));
    const contacts=await select('comercial_contactos','id_contacto',effective.map(row=>row.id_contacto_contrato));
    const contractMap=mapBy(contracts,'id_contrato'),invoiceMap=mapBy(invoices,'id_factura_cliente');
    const accountMap=mapBy(accounts,'id_cuenta'),agentMap=mapBy(agents,'id_agente'),contactMap=mapBy(contacts,'id_contacto');
    const relatedOrders=(await db.query('SELECT * FROM tesoreria_ordenes WHERE id_contrato=ANY($1::text[]) OR id_factura=ANY($2::text[]) ORDER BY id_orden',[contractIds,unique(effective.map(row=>row.id_factura_cliente))])).rows;
    const scheduledPayments=type==='ordenes'?await select('comercial_contratos_cobros','id_contrato',contractIds):[];
    const receiptRows=type==='ordenes'?(await db.query('SELECT * FROM tesoreria_recibos_importados WHERE id_orden=ANY($1::text[]) ORDER BY numero_recibo',[existing.map(row=>row.id_orden)])).rows:[];
    const invoiceLines=type==='facturas'?(await db.query('SELECT id_factura_cliente FROM administracion_lineas_factura WHERE id_factura_cliente=ANY($1::text[]) ORDER BY id_linea_factura',[existing.map(row=>row.id_factura_cliente)])).rows:[];
    const duplicateNumbers=type==='facturas'?(await db.query("SELECT id_factura_cliente,numero_factura FROM administracion_facturas_clientes WHERE numero_factura<>'' AND numero_factura=ANY($1::text[]) ORDER BY id_factura_cliente",[unique(effective.map(row=>row.numero_factura))])).rows:[];
    const active=rows.map(row=>(choices[row.row] || (beforeMap.has(row.data[schema.id])?policy:'create'))!=='skip');
    const plan=rows.map((row,index)=>{
      const data={...row.data},before=beforeMap.get(data[schema.id]),merged=effective[index];
      const changes=schema.fields.filter(field=>data[field.key]!==undefined&&field.key!==schema.id).filter(field=>field.type==='date'?normalizedDate(before?.[field.key])!==normalizedDate(data[field.key]):!equal(before?.[field.key],data[field.key])).map(field=>({field:field.key,before:before?.[field.key] ?? '',after:data[field.key]}));
      const decision=choices[row.row] || (before?policy:'create');
      if(!['create','update','skip','block'].includes(decision))fail('Decisión no válida para la fila '+row.row,400);
      const errors=row.errors.filter(error=>error!=='Identificador repetido en el archivo.');
      if(!before){
        const formats={contratos:/^C\d{2}\.\d{3}\.\d{3}$/,ordenes:/^[CO]\d{2}\.\d{3}\.\d{3}-\d+\/\d+$/,facturas:/^(?:\d+|[AP]\d+)$/};
        if(!formats[type].test(String(data[schema.id]||'')))errors.push('El identificador no sigue el formato estándar de '+schema.label.toLowerCase()+'.');
        if(type==='ordenes'&&merged.id_contrato&&String(data.id_orden).split('-')[0]!==merged.id_contrato)errors.push('El código de orden no corresponde a su contrato.');
      }
      if(decision==='skip')return {row:row.row,id:data[schema.id] || '',action:'skip',errors:[],changes:[],data,before};
      if(data[schema.id]&&rows.some((other,i)=>i!==index&&active[i]&&other.data[schema.id]===data[schema.id]))errors.push('Identificador repetido: conserva una sola fila y salta las demás.');
      if(before && decision==='block')errors.push('El identificador ya existe: elige actualizar o saltar esta fila.');
      if(before && decision==='create')errors.push('El identificador ya existe.');
      for(const field of schema.fields.filter(field=>field.required))if(merged[field.key]==null || merged[field.key]==='')errors.push('Falta '+field.key+(before?'':' para crear el registro')+'.');
      if(!accountMap.has(merged[schema.account]))errors.push('La cuenta indicada no existe. Usa su ID exacto.');
      const contract=type==='contratos'?null:contractMap.get(merged.id_contrato);
      if(type!=='contratos'&&merged.id_contrato&&(!contract || contract.id_cuenta_contrato!==merged[schema.account]))errors.push('El contrato no existe o pertenece a otra cuenta.');
      if(type==='contratos') {
        if(merged.id_agente_contrato&&!agentMap.has(merged.id_agente_contrato))errors.push('El agente no existe.');
        if(merged.id_contacto_contrato&&contactMap.get(merged.id_contacto_contrato)?.id_cuenta!==merged.id_cuenta_contrato)errors.push('El contacto no pertenece a la cuenta.');
        if(Number(merged.importe_contrato_con_iva)<Number(merged.importe_total_bi_contrato))errors.push('El importe total no puede ser menor que la base.');
        if(before&&(before.id_propuesta||before.id_factura)&&changes.some(change=>change.field==='id_cuenta_contrato'))errors.push('El contrato ya tiene propuesta o factura; no se puede trasladar a otra cuenta mediante Excel.');
        if(immutable(invoiceMap.get(before?.id_factura))&&changes.some(change=>['importe_total_bi_contrato','importe_contrato_con_iva','iva_aplicable'].includes(change.field)))errors.push('El contrato está asociado a una factura emitida o contabilizada.');
        if(relatedOrders.some(order=>order.id_contrato===merged.id_contrato)&&changes.some(change=>['id_cuenta_contrato','importe_total_bi_contrato','importe_contrato_con_iva'].includes(change.field)))errors.push('El contrato tiene órdenes: modifica sus datos económicos desde el flujo de facturación para mantenerlos cuadrados.');
      }
      if(type==='facturas') {
        if(immutable(before)&&changes.length)errors.push('La factura está emitida o contabilizada y no admite sobrescritura.');
        if(Number(merged.importe_total)<Number(merged.base_imponible))errors.push('El total no puede ser menor que la base.');
        if(duplicateNumbers.some(invoice=>invoice.numero_factura===merged.numero_factura&&invoice.id_factura_cliente!==merged.id_factura_cliente)||effective.some((other,i)=>i!==index&&active[i]&&merged.numero_factura&&other.numero_factura===merged.numero_factura))errors.push('El número de factura pertenece a otro registro.');
        if((invoiceLines.some(line=>line.id_factura_cliente===merged.id_factura_cliente)||relatedOrders.some(order=>order.id_factura===merged.id_factura_cliente))&&changes.some(change=>['base_imponible','importe_total','id_cuenta','id_contrato'].includes(change.field)))errors.push('La factura tiene líneas u órdenes: revisa sus datos económicos en el editor de facturas.');
      }
      if(type==='ordenes') {
        if(before?.cancelada)errors.push('La orden está cancelada y se conserva solo para consulta.');
        if(merged.id_contrato&&scheduledPayments.some(payment=>payment.id_contrato===merged.id_contrato&&Number(payment.numero_cobro)===Number(merged.numero_cobro)&&payment.id_cobro_contrato!==before?.id_cobro_contrato))errors.push('El contrato ya tiene ese cobro programado. Revisa su orden asociada antes de importar otra.');
        const invoice=invoiceMap.get(merged.id_factura);
        if(merged.id_factura&&(!invoice || invoice.id_cuenta!==merged.id_cuenta || (invoice.id_contrato&&invoice.id_contrato!==merged.id_contrato)))errors.push('La factura no existe o no coincide con la cuenta y el contrato.');
        if(changes.length&&(before?.cobrada||before?.cobro_revision_bancaria||immutable(invoice)))errors.push('La orden está cobrada, gestionada por revisión bancaria o ligada a una factura bloqueada. Usa su flujo de revisión.');
        const receipt=receiptRows.find(item=>item.id_orden===merged.id_orden);
        if(receipt?.id_remesa&&changes.some(change=>['forma_cobro','id_cuenta','id_contrato','id_factura','numero_cobro'].includes(change.field)))errors.push('El recibo está en una remesa. Resuelve su asociación antes de modificar estos campos.');
        if(before && changes.some(change=>['id_contrato','id_factura','numero_cobro','id_cuenta'].includes(change.field)))errors.push('Una orden existente conserva sus vínculos e identidad de cobro; cambia solo sus datos de pago.');
        if(Number(merged.cobro_total)<=0 || Number(merged.base_imponible)>Number(merged.cobro_total))errors.push('Revisa los importes: total positivo y base no superior al total.');
        if(merged.id_contrato&&(relatedOrders.some(order=>order.id_contrato===merged.id_contrato&&order.numero_cobro===merged.numero_cobro&&order.id_orden!==merged.id_orden)||effective.some((other,i)=>i!==index&&active[i]&&other.id_contrato===merged.id_contrato&&other.numero_cobro===merged.numero_cobro)))errors.push('El número de cobro ya está usado en el contrato.');
      }
      return {row:row.row,id:data[schema.id] || '',action:before?(changes.length?'update':'unchanged'):'create',errors,changes,data,before};
    });
    if(type==='ordenes')for(const contract of contracts) {
      const affected=plan.filter(item=>!item.errors.length&&['create','update'].includes(item.action)&&({...item.before,...item.data}).id_contrato===contract.id_contrato);
      if(!affected.length)continue;
      const projected=new Map(relatedOrders.filter(order=>order.id_contrato===contract.id_contrato).map(order=>[order.id_orden,Number(order.cobro_total || 0)]));
      for(const item of affected)projected.set(item.id,Number(({...item.before,...item.data}).cobro_total));
      if(contract.importe_contrato_con_iva!=null&&Math.round([...projected.values()].reduce((sum,amount)=>sum+amount,0)*100)>Math.round(Number(contract.importe_contrato_con_iva)*100))for(const item of affected)item.errors.push('La suma de las órdenes superaría el total del contrato. Revisa la distribución de cobros.');
    }
    const fingerprint=createHash('sha256').update(JSON.stringify({type,policy,rows,choices,existing,contracts,invoices,accounts,agents,contacts,relatedOrders,scheduledPayments,receiptRows,invoiceLines,duplicateNumbers})).digest('hex');
    const summary={create:0,update:0,unchanged:0,skip:0,errors:0};
    for(const item of plan){summary[item.action]++;if(item.errors.length)summary.errors++;}
    if(!commit) {await db.query('ROLLBACK');return {token:fingerprint,summary,rows:plan.map(item=>({row:item.row,id:item.id,action:item.action,errors:item.errors,changes:item.changes}))};}
    if(!token || token!==fingerprint)fail('Los datos o las decisiones han cambiado. Vuelve a validar antes de confirmar.');
    if(summary.errors)fail('Resuelve o descarta todas las filas con incidencias.');
    for(const item of plan) {
      if(['skip','unchanged'].includes(item.action))continue;
      const fields=item.action==='create'?Object.keys(item.data):item.changes.map(change=>change.field);
      const encode=key=>schema.fields.find(field=>field.key===key)?.type==='date'&&type==='facturas'?item.data[key].split('/').reverse().join('-'):item.data[key];
      if(item.action==='create')await db.query(`INSERT INTO ${schema.table}(${fields.join(',')}) VALUES(${fields.map((_,i)=>'$'+(i+1)).join(',')})`,fields.map(encode));
      else await db.query(`UPDATE ${schema.table} SET ${fields.map((key,i)=>key+'=$'+(i+1)).join(',')},updated_at=now() WHERE ${schema.id}=$${fields.length+1}`,[...fields.map(encode),item.id]);
      const merged={...item.before,...item.data};
      if(type==='ordenes') {
        if(merged.id_contrato) {
          const paymentId=merged.id_cobro_contrato || 'ccon_'+randomUUID();
          if(merged.id_cobro_contrato)await db.query('UPDATE comercial_contratos_cobros SET fecha_cobro=$2,importe_cobro=$3,forma_cobro=$4,banco_cobro=$5,updated_at=now() WHERE id_cobro_contrato=$1',[paymentId,merged.fecha_teorica_cobro,merged.cobro_total,merged.forma_cobro,merged.banco_cobro]);
          else await db.query('INSERT INTO comercial_contratos_cobros(id_cobro_contrato,id_contrato,numero_cobro,fecha_cobro,importe_cobro,forma_cobro,banco_cobro) VALUES($1,$2,$3,$4,$5,$6,$7)',[paymentId,merged.id_contrato,merged.numero_cobro,merged.fecha_teorica_cobro,merged.cobro_total,merged.forma_cobro,merged.banco_cobro]);
          await db.query('UPDATE tesoreria_ordenes SET id_cobro_contrato=$2 WHERE id_orden=$1',[item.id,paymentId]);
          await db.query("UPDATE comercial_contratos SET array_id_ordenes=(SELECT COALESCE(jsonb_agg(id_orden ORDER BY id_orden),'[]'::jsonb) FROM tesoreria_ordenes WHERE id_contrato=$1) WHERE id_contrato=$1",[merged.id_contrato]);
        }
        if(!/recibo/i.test(merged.forma_cobro))await db.query('DELETE FROM tesoreria_recibos_importados WHERE id_orden=$1 AND id_remesa IS NULL',[item.id]);
        await ensureOrderReceipt(db,item.id,actorId);await syncOrderCollections(db,[item.id],actorId);
        await orderActivity(db,item.id,actorId,'ha '+(item.action==='create'?'creado':'actualizado')+' la orden mediante importación masiva.');
      } else {
        if(type==='facturas'&&merged.id_contrato)await db.query("UPDATE comercial_contratos SET id_factura=$2 WHERE id_contrato=$1 AND COALESCE(id_factura,'')=''",[merged.id_contrato,item.id]);
        if(type==='facturas')await syncInvoiceCollection(db,[item.id]);
        await accountActivity(db,merged[schema.account],actorId,`ha ${item.action==='create'?'creado':'actualizado'} ${type} ${item.id} mediante importación masiva.`);
      }
    }
    await db.query('COMMIT');return {summary,ids:plan.filter(item=>!['skip'].includes(item.action)).map(item=>item.id)};
  } catch(error) {await db.query('ROLLBACK');throw error;} finally {db.release();}
}
