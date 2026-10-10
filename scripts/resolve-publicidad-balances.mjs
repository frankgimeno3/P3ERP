import env from '@next/env';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {getPgPool} from '../server/database/pgClient.js';
import {allocateOrderIdentifier} from '../server/features/identifiers/BusinessIdentifiers.js';
import {lockIncome,incomeCents,ensureOrderReceipt,syncInvoiceCollection} from '../server/features/prevision/IncomeReconciliation.js';
import {accountActivity,orderActivity} from '../server/features/comentario/AccountActivity.js';

// Explicitly confirmed review: the PDF fixes the liability, historical collections survive.
env.loadEnvConfig(process.cwd());
const directory=resolve(process.argv[2]||''),apply=process.argv.includes('--apply'),pool=getPgPool(),db=await pool.connect();
try{
  const {rows}=JSON.parse(await readFile(join(directory,'parsed.json'),'utf8'));
  await db.query('BEGIN');await lockIncome(db);
  const work=[];
  for(const numero of ['526015','526037','526102','526114','526117']){
    const source=rows.find(row=>row.numero===numero);
    const invoice=(await db.query('SELECT * FROM administracion_facturas_clientes WHERE numero_factura=$1 FOR UPDATE',[numero])).rows;
    if(!source||invoice.length!==1||incomeCents(invoice[0].importe_total)!==incomeCents(source.total))throw Error('Factura y PDF no coinciden: '+numero);
    if(invoice[0].datos_importacion?.publicidad_pdf?.saldo_confirmado)continue;
    const orders=(await db.query(`SELECT o.*,a.total importe_aplicado,a.n applications FROM tesoreria_ordenes o
      LEFT JOIN LATERAL(SELECT sum(importe) total,count(*)::int n FROM tesoreria_aplicaciones_cobro WHERE id_orden=o.id_orden) a ON true
      WHERE id_factura=$1 ORDER BY numero_cobro,id_orden FOR UPDATE OF o`,[invoice[0].id_factura_cliente])).rows;
    if(orders.some(o=>o.cancelada||!o.cobrada&&o.applications))throw Error('Orden cancelada o cobro parcial: '+numero);
    const paid=orders.filter(o=>o.cobrada).reduce((sum,o)=>sum+incomeCents(o.applications?o.importe_aplicado:o.cobro_total),0);
    const pending=orders.filter(o=>!o.cobrada);
    const due=Math.max(0,incomeCents(source.total)-paid);
    const change=due-pending.reduce((sum,o)=>sum+incomeCents(o.cobro_total),0);
    if(change&&pending.length&&incomeCents(pending.at(-1).cobro_total)+change<0)throw Error('Reparto pendiente requiere revisión: '+numero);
    const receipts=(await db.query('SELECT * FROM tesoreria_recibos_importados WHERE id_orden=ANY($1::text[])',[orders.map(o=>o.id_orden)])).rows;
    if(change&&pending.length&&receipts.some(r=>r.id_orden===pending.at(-1).id_orden&&r.id_remesa))throw Error('Recibo ya remesado: '+numero);
    const payments=(await db.query('SELECT * FROM comercial_contratos_cobros WHERE id_cobro_contrato=ANY($1::text[])',[orders.map(o=>o.id_cobro_contrato).filter(Boolean)])).rows;
    work.push({source,invoice:invoice[0],orders,receipts,payments,paid,due,change,pending});
  }
  console.log(JSON.stringify(work.map(w=>({numero:w.source.numero,cobrado:w.paid/100,pendiente:w.due/100,exceso:Math.max(0,w.paid-incomeCents(w.source.total))/100}))));
  if(!apply){await db.query('ROLLBACK');}
  else{
    const backups=join(directory,'backups');await mkdir(backups,{recursive:true});await writeFile(join(backups,'saldo-confirmado-'+Date.now()+'.json'),JSON.stringify(work,null,2));
    for(const w of work){
      const {source,invoice}=w;
      if(w.change&&w.pending.length){
        const order=w.pending.at(-1),total=(incomeCents(order.cobro_total)+w.change)/100,base=Math.round(total*source.base/source.total*100)/100;
        await db.query('UPDATE tesoreria_ordenes SET cobro_total=$2,base_imponible=$3,updated_at=now() WHERE id_orden=$1',[order.id_orden,total,base]);
        if(order.id_cobro_contrato)await db.query('UPDATE comercial_contratos_cobros SET importe_cobro=$2,updated_at=now() WHERE id_cobro_contrato=$1',[order.id_cobro_contrato,total]);
        await ensureOrderReceipt(db,order.id_orden);
        await orderActivity(db,order.id_orden,'','ha ajustado el saldo pendiente al total del PDF, conservando los cobros históricos.');
      }else if(w.due&&!w.pending.length){
        const numero=Math.max(0,...w.orders.map(o=>Number(o.numero_cobro)))+1;
        const id=await allocateOrderIdentifier(db,{contractId:w.orders[0]?.id_contrato||'',invoiceId:invoice.id_factura_cliente,number:numero,date:source.cobros.at(-1)?.fecha});
        const date=source.cobros.at(-1)?.fecha||null,total=w.due/100,base=Math.round(total*source.base/source.total*100)/100;
        const contract=w.orders[0]?.id_contrato||null,paymentId=contract?'cc_'+id:null;
        if(contract)await db.query(`INSERT INTO comercial_contratos_cobros(id_cobro_contrato,id_contrato,numero_cobro,importe_cobro,fecha_cobro,forma_cobro,banco_cobro,observaciones_cobro)
          SELECT $1,$2,COALESCE(max(numero_cobro),0)+1,$3,$4,$5,$6,$7 FROM comercial_contratos_cobros WHERE id_contrato=$2`,[paymentId,contract,total,date||'',source.forma,source.banco,'Saldo pendiente según PDF de factura '+source.numero]);
        await db.query(`INSERT INTO tesoreria_ordenes(id_orden,id_factura,id_cuenta,id_contrato,numero_cobro,etiqueta_cobro,forma_cobro,banco_cobro,cobro_total,base_imponible,con_iva,fecha_teorica_cobro,datos_importacion,id_cobro_contrato)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14)`,[id,invoice.id_factura_cliente,invoice.id_cuenta,contract,numero,'Saldo pendiente factura '+source.numero,source.forma,source.banco,total,base,source.iva>0,date,JSON.stringify({saldo_pdf:{factura:source.numero,total_pdf:source.total,cobrado_previo:w.paid/100}}),paymentId]);
        await ensureOrderReceipt(db,id);
        await orderActivity(db,id,'','ha creado el saldo pendiente según el PDF, conservando el cobro anterior.');
      }
      if(source.forma==='factoring')for(const order of w.pending){
        await db.query("UPDATE tesoreria_ordenes SET forma_cobro='factoring',updated_at=now() WHERE id_orden=$1",[order.id_orden]);
        if(order.id_cobro_contrato)await db.query("UPDATE comercial_contratos_cobros SET forma_cobro='factoring',updated_at=now() WHERE id_cobro_contrato=$1",[order.id_cobro_contrato]);
      }
      const note={fecha:new Date().toISOString(),total_pdf:source.total,cobrado:w.paid/100,pendiente:w.due/100,exceso_cobrado:Math.max(0,w.paid-incomeCents(source.total))/100};
      await db.query(`UPDATE administracion_facturas_clientes SET datos_importacion=jsonb_set(jsonb_set(jsonb_set(datos_importacion,
        '{publicidad_pdf,saldo_confirmado}',$2::jsonb),'{publicidad_pdf,pendiente_revision}','""'::jsonb),'{registro_facturas,discrepancia_ordenes}','null'::jsonb),updated_at=now() WHERE id_factura_cliente=$1`,[invoice.id_factura_cliente,JSON.stringify(note)]);
      await syncInvoiceCollection(db,[invoice.id_factura_cliente]);
      await accountActivity(db,invoice.id_cuenta,'','ha resuelto el saldo de la factura '+source.numero+' según el PDF y los cobros registrados.');
    }
    await db.query('COMMIT');console.log('APPLIED');
  }
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
