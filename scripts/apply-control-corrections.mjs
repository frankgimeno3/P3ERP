import env from '@next/env';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {getPgPool} from '../server/database/pgClient.js';
import {controlDate,controlPayment} from '../server/features/orden/AdministrativeOrderReview.js';
import {lockIncome,reconcileBankIncome,syncInvoiceCollection,ensureOrderReceipt} from '../server/features/prevision/IncomeReconciliation.js';
import {orderActivity} from '../server/features/comentario/AccountActivity.js';
env.loadEnvConfig(process.cwd());
const directory=process.argv[2],apply=process.argv.includes('--apply'),pool=getPgPool(),db=await pool.connect();
const snapshot=JSON.parse(await readFile(join(directory,'snapshot.json'),'utf8'));
const report={created:[],associated:[],consolidated:[],paid:[],missingInvoices:[],graditel:'Pendiente de respuesta: ingreso Santander 02/10/2026, 1.331 EUR.'};
const text=v=>String(v??'').trim(),validDate=v=>{const d=controlDate(v);return /^\d{2}\/\d{2}\/\d{4}$/.test(d)?d:'';};
const hash=v=>createHash('sha256').update(v).digest('hex').slice(0,24);
try{
  await db.query('BEGIN');await lockIncome(db);
  const tables=['tesoreria_ordenes','comercial_contratos','comercial_contratos_cobros','administracion_facturas_clientes','tesoreria_recibos_importados','tesoreria_remesas','tesoreria_aplicaciones_cobro','tesoreria_movimientos_bancarios','comercial_cuentas'];
  const before={};for(const table of tables)before[table]=(await db.query('SELECT * FROM '+table)).rows;
  await mkdir(directory,{recursive:true});await writeFile(join(directory,'before-corrections-'+Date.now()+'.json'),JSON.stringify(before));
  const agents={GIMENO:'ag_305a8d12a9a44be698bd',FRANK:'ag_25_0008',RICARDO:'ag_25_0002',PEP:'ag_25_0004',MARKETING:'ag_marketing_vidrioperfil'};
  for(const row of snapshot.missing){
    const id=text(row.ORDEN),contractId=text(row['CONTRATO ASOCIADO']);
    if((await db.query('SELECT 1 FROM tesoreria_ordenes WHERE id_orden=$1',[id])).rowCount)continue;
    let contract=(await db.query('SELECT * FROM comercial_contratos WHERE id_contrato=$1',[contractId])).rows[0];
    let account=contract?.id_cuenta_contrato||(await db.query('SELECT id_cuenta FROM comercial_cuentas WHERE id_edisoft=$1 OR id_cuenta=$1',[text(row['CODIGO CRM'])])).rows[0]?.id_cuenta;
    if(!account&&row.CLIENTE==='FIRA VALENCIA - APA EXPO')account='ACC61';
    if(!account&&row.CLIENTE==='DROP SEND'){
      // This CRM reference and company are new in the supplied control, with no fiscal data supplied.
      await db.query("SELECT pg_advisory_xact_lock(hashtext('comercial:cuentas:secuencia'))");
      account='ACC'+((await db.query("SELECT COALESCE(max(substring(id_cuenta from '^ACC([0-9]+)$')::bigint),0)+1 n FROM comercial_cuentas")).rows[0].n);
      await db.query('INSERT INTO comercial_cuentas(id_cuenta,nombre_empresa,id_edisoft,id_agente,datos_comerciales) VALUES($1,$2,$3,$4,$5)',[account,row.CLIENTE,text(row['CODIGO CRM']),agents[row.AGENTE]||'',{control_administrativo:{fila:row.row,archivo:'Control ADMINISTRATIVO.xlsx',sin_datos_fiscales:true}}]);
    }
    if(!account)throw Error('Cliente no resuelto: '+row.CLIENTE);
    const payment=controlPayment(row['FORMA DE COBRO']),total=Number(row['IMPORTE CON IVA']),contractBase=Number(row['IMPORTE TOTAL BI CONTRATO']),nonMonetary=total===0,cancelled=/ANULAD/i.test(text(row.ESTADO)),paid=/COBRADA/i.test(text(row.ESTADO));
    if(payment.forma==='recibo'&&!payment.banco)payment.banco='Sabadell';
    const date=cancelled||nonMonetary?'':validDate(row['FECHA DE COBRO ORDEN segun factura']),agent=agents[row.AGENTE]||contract?.id_agente_contrato||null;
    if(!contract){
      await db.query('INSERT INTO comercial_contratos(id_contrato,id_cuenta_contrato,id_agente_contrato,fecha_firma_contrato,importe_total_bi_contrato,importe_contrato_con_iva,iva_aplicable,forma_cobro_contrato,nombre_contrato,datos_importacion) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$1,$9)',[contractId,account,agent,validDate(row['FECHA FIRMA CONTRATO']),contractBase,total,Math.round(contractBase*121)===Math.round(total*100),row['FORMA DE COBRO'],{archivo:'Control ADMINISTRATIVO.xlsx',filas:[row],sin_propuesta_origen:true,sin_desglose_servicios:true}]);
      contract=(await db.query('SELECT * FROM comercial_contratos WHERE id_contrato=$1',[contractId])).rows[0];
    }
    if(nonMonetary)await db.query('UPDATE comercial_contratos SET es_intercambio=true WHERE id_contrato=$1',[contractId]);
    const invoice=(await db.query('SELECT id_factura_cliente FROM administracion_facturas_clientes WHERE numero_factura=$1',[text(row.FACTURA)])).rows;
    if(invoice.length>1)throw Error('Factura ambigua: '+row.FACTURA);
    const invoiceId=invoice[0]?.id_factura_cliente||null;
    if(!invoiceId&&/^\d+$/.test(text(row.FACTURA)))report.missingInvoices.push({order:id,client:row.CLIENTE,invoice:text(row.FACTURA)});
    const cc=(await db.query('SELECT id_cobro_contrato FROM comercial_contratos_cobros WHERE id_contrato=$1 AND numero_cobro=1',[contractId])).rows[0]?.id_cobro_contrato||'cc_control_'+hash(id);
    await db.query('INSERT INTO comercial_contratos_cobros(id_cobro_contrato,id_contrato,numero_cobro,fecha_cobro,importe_cobro,forma_cobro,banco_cobro,observaciones_cobro) VALUES($1,$2,1,$3,$4,$5,$6,$7) ON CONFLICT(id_cobro_contrato) DO NOTHING',[cc,contractId,date,total,nonMonetary?'intercambio':payment.forma,payment.banco,'Referencia original: '+id]);
    // Gross amount is known; use the established contract VAT only, not its full base as an installment base.
    const withVat=contract.iva_aplicable,base=withVat?Math.round(total/1.21*100)/100:total;
    await db.query('INSERT INTO tesoreria_ordenes(id_orden,id_contrato,id_factura,numero_cobro,etiqueta_cobro,fecha_teorica_cobro,fecha_real_cobro,forma_cobro,banco_cobro,base_imponible,cobro_total,id_cuenta,cobrada,id_cobro_contrato,id_agente,con_iva,cancelada,cancelada_at,cancelacion_detalle,datos_importacion) VALUES($1,$2,$3,1,$1,$4,\'\',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,CASE WHEN $14 THEN now() ELSE NULL END,$15,$16)',[id,contractId,invoiceId,date,nonMonetary?'intercambio':payment.forma,payment.banco,base,total,account,paid,cc,agent,withVat,cancelled,{motivo:cancelled?'Anulada en control administrativo':''},{archivo:'Control ADMINISTRATIVO.xlsx',hoja:'COBROS y CONTRATOS ',fila:row.row,original:row,source_paid:paid,estado_confirmado_control:paid,sin_movimiento_bancario_historico:paid,referencia_factura_externa:invoiceId?null:text(row.FACTURA),sin_cobro_monetario:nonMonetary}]);
    await db.query('UPDATE comercial_contratos SET array_id_ordenes=CASE WHEN array_id_ordenes @> jsonb_build_array($2::text) THEN array_id_ordenes ELSE array_id_ordenes||jsonb_build_array($2::text) END WHERE id_contrato=$1',[contractId,id]);
    await db.query('UPDATE comercial_contratos_cobros SET fecha_cobro=$2,forma_cobro=$3,banco_cobro=$4 WHERE id_cobro_contrato=$1',[cc,date,nonMonetary?'intercambio':payment.forma,payment.banco]);
    if(payment.forma==='recibo'&&!cancelled){
      const receipt=await ensureOrderReceipt(db,id);
      const remesa=text(row['Nº REMESA']);if(receipt&&remesa&&remesa!=='No procede'){
        await db.query('INSERT INTO tesoreria_remesas(id_remesa,remesa_en_carpeta) VALUES($1,\'2025\') ON CONFLICT(id_remesa) DO NOTHING',[remesa]);
        await db.query('UPDATE tesoreria_recibos_importados SET id_remesa=$2,numero_remesa=$2 WHERE numero_recibo=$1',[receipt.numero_recibo,remesa]);
      }
    }
    await orderActivity(db,id,'','ha incorporado esta orden desde el control administrativo, con sus relaciones y el estado declarado en origen.');report.created.push({id,client:row.CLIENTE,account,contract:contractId,invoice:invoiceId,paid,cancelled,nonMonetary});
  }
  const associations=[['C26.000.151','526163'],['C26.000.156','526165'],['C26.000.157','526159'],['C26.000.158','526158']];
  for(const [contractId,number] of associations){
    const invoice=(await db.query('SELECT * FROM administracion_facturas_clientes WHERE numero_factura=$1',[number])).rows;
    if(invoice.length!==1)throw Error('Número de factura no único: '+number);const fact=invoice[0];
    const canonical=(await db.query('SELECT * FROM tesoreria_ordenes WHERE id_contrato=$1 AND NOT cancelada ORDER BY numero_cobro',[contractId])).rows;
    if(!canonical.length||canonical.some(o=>o.id_cuenta!==fact.id_cuenta))throw Error('Cliente/contrato inconsistente: '+contractId);
    const duplicates=(await db.query('SELECT * FROM tesoreria_ordenes WHERE id_factura=$1 AND NOT cancelada AND id_orden<>ALL($2::text[])',[fact.id_factura_cliente,canonical.map(o=>o.id_orden)])).rows;
    for(const duplicate of duplicates){
      const target=canonical.find(o=>o.numero_cobro===duplicate.numero_cobro&&Math.round(Number(o.cobro_total)*100)===Math.round(Number(duplicate.cobro_total)*100));
      if(!target)throw Error('Vencimiento no coincide: '+duplicate.id_orden);
      if((await db.query('SELECT 1 FROM tesoreria_aplicaciones_cobro WHERE id_orden=$1',[duplicate.id_orden])).rowCount)throw Error('Duplicado con cobros: '+duplicate.id_orden);
      const receipts=(await db.query('SELECT * FROM tesoreria_recibos_importados WHERE id_orden=ANY($1::text[])',[ [duplicate.id_orden,target.id_orden] ])).rows;
      const sourceReceipt=receipts.find(r=>r.id_orden===duplicate.id_orden),targetReceipt=receipts.find(r=>r.id_orden===target.id_orden);
      if(sourceReceipt){
        if(targetReceipt){if(targetReceipt.id_remesa)throw Error('Dos recibos remesados: '+target.id_orden);await db.query('DELETE FROM tesoreria_recibos_importados WHERE numero_recibo=$1',[targetReceipt.numero_recibo]);}
        await db.query('UPDATE tesoreria_recibos_importados SET id_orden=$2 WHERE numero_recibo=$1',[sourceReceipt.numero_recibo,target.id_orden]);
      }
      await db.query('UPDATE tesoreria_ordenes SET cancelada=true,cancelada_at=now(),fecha_teorica_cobro=\'\',fecha_real_cobro=\'\',cancelacion_detalle=$2,updated_at=now() WHERE id_orden=$1',[duplicate.id_orden,{motivo:'Duplicado de importación consolidado en orden de control administrativo',orden_destino:target.id_orden,recibo_anterior:targetReceipt||null}]);
      await db.query('UPDATE administracion_facturas_clientes SET id_orden_origen=$2 WHERE id_orden_origen=$1',[duplicate.id_orden,target.id_orden]);
      await orderActivity(db,duplicate.id_orden,'','ha consolidado sus relaciones en '+target.id_orden+', conservando esta orden cancelada como historial.');report.consolidated.push({old:duplicate.id_orden,target:target.id_orden});
      await db.query('UPDATE tesoreria_ordenes SET fecha_teorica_cobro=CASE WHEN COALESCE(fecha_teorica_cobro,\'\')=\'\' THEN $2 ELSE fecha_teorica_cobro END,forma_cobro=CASE WHEN COALESCE(forma_cobro,\'\')=\'\' THEN $3 ELSE forma_cobro END,banco_cobro=CASE WHEN COALESCE(banco_cobro,\'\')=\'\' THEN $4 ELSE banco_cobro END WHERE id_orden=$1',[target.id_orden,duplicate.fecha_teorica_cobro,duplicate.forma_cobro,duplicate.banco_cobro]);
    }
    await db.query('UPDATE tesoreria_ordenes SET id_factura=$2,updated_at=now() WHERE id_contrato=$1 AND NOT cancelada',[contractId,fact.id_factura_cliente]);
    await db.query('UPDATE comercial_contratos SET id_factura=$2 WHERE id_contrato=$1',[contractId,fact.id_factura_cliente]);
    await db.query('UPDATE administracion_facturas_clientes SET id_contrato=$2,id_orden_origen=COALESCE(id_orden_origen,$3),updated_at=now() WHERE id_factura_cliente=$1',[fact.id_factura_cliente,contractId,canonical[0].id_orden]);
    await db.query('UPDATE comercial_contratos_cobros c SET fecha_cobro=o.fecha_teorica_cobro,forma_cobro=o.forma_cobro,banco_cobro=o.banco_cobro FROM tesoreria_ordenes o WHERE o.id_contrato=$1 AND o.id_cobro_contrato=c.id_cobro_contrato AND NOT o.cancelada',[contractId]);
    for(const order of canonical)await ensureOrderReceipt(db,order.id_orden);
    await syncInvoiceCollection(db,[fact.id_factura_cliente]);report.associated.push({contract:contractId,invoice:number,orders:canonical.map(o=>o.id_orden)});
  }
  for(const [orderId,lineId] of [['C26.000.119-1/1','banc_sab_26_000.000.548'],['C26.000.162-1/1','banc_san_26_000.000.066']]){
    const order=(await db.query('SELECT * FROM tesoreria_ordenes WHERE id_orden=$1',[orderId])).rows[0],line=(await db.query('SELECT * FROM tesoreria_movimientos_bancarios WHERE id_linea_banco=$1 FOR UPDATE',[lineId])).rows[0];
    if(!line.estado_revision)await reconcileBankIncome(db,line,{incomeType:'transferencia',orderIds:[orderId],entityId:order.id_cuenta});
    else if(line.id_orden!==orderId)throw Error('Ingreso ya conciliado con otra orden: '+lineId);
    report.paid.push({order:orderId,line:lineId});
  }
  const saint='C25.000.168-1/1';
  await db.query('UPDATE tesoreria_ordenes SET cobrada=true,forma_cobro=\'transferencia\',banco_cobro=\'Santander\',datos_importacion=datos_importacion||$2::jsonb,updated_at=now() WHERE id_orden=$1 AND NOT cobro_revision_bancaria',[saint,{estado_confirmado_control:true,sin_movimiento_bancario_historico:true}]);
  await syncInvoiceCollection(db,[(await db.query('SELECT id_factura FROM tesoreria_ordenes WHERE id_orden=$1',[saint])).rows[0].id_factura]);
  report.paid.push({order:saint,line:null,source:'Control administrativo; extracto de 2025 no disponible'});
  for(const {order:id} of report.paid){
    const order=(await db.query('SELECT * FROM tesoreria_ordenes WHERE id_orden=$1',[id])).rows[0];
    await db.query('UPDATE administracion_facturas_clientes SET id_contrato=$2 WHERE id_factura_cliente=$1 AND id_cuenta=$3 AND id_contrato IS NULL',[order.id_factura,order.id_contrato,order.id_cuenta]);
    await db.query('UPDATE comercial_contratos SET id_factura=$2 WHERE id_contrato=$1 AND id_factura IS NULL',[order.id_contrato,order.id_factura]);
    await db.query('UPDATE tesoreria_ordenes SET datos_importacion=datos_importacion||$2::jsonb WHERE id_orden=$1',[id,{source_paid:true,estado_confirmado_control:true}]);
  }
  await db.query(await readFile('database/migrations/20261006_0004_magazine_event_dates.sql','utf8'));
  await writeFile(join(directory,apply?'corrections.json':'corrections-preview.json'),JSON.stringify({...report,applied:apply},null,2));
  await db.query(apply?'COMMIT':'ROLLBACK');console.log(JSON.stringify({...report,applied:apply}));
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
