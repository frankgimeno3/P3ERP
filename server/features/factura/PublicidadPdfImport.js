import {createHash} from 'node:crypto';
import {getPgPool} from '../../database/pgClient.js';
import {invoiceRegionalTotals} from './InvoiceCustomerMatching.js';
import {lockIncome,receiptOrderId,ensureOrderReceipt,syncInvoiceCollection} from '../prevision/IncomeReconciliation.js';
import {accountActivity} from '../comentario/AccountActivity.js';

const cents=value=>Math.round(Number(value||0)*100);
const hash=value=>createHash('sha256').update(value).digest('hex');
const iso=value=>value.split('/').reverse().join('-');
const code=value=>String(value||'').trim().replace(/^0+/,'');
const key=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export function matchPdfContractServices(source,contractLines){
  return source.lineas.map(line=>{
    if(/DISCOUNT|DESCUENTO|PRECIO ESPECIAL|SPECIAL PRICE/i.test(line.concepto))return null;
    const text=line.concepto+' '+line.descripcion,number=text.match(/N[º°]\s*(\d+)/i)?.[1];
    const qeq=/QUIEN ES QUIEN/i.test(text),web=/VIDRIOPERFIL|OPCION|OPTION|BANNER|NEWSLETTER/i.test(text);
    if(!number&&!qeq)return null;
    const matches=contractLines.filter(candidate=>{
      const publication=String(candidate.publicacion||''),medium=key(candidate.medio);
      if(qeq&&!/QEQ|QUIEN ES QUIEN/i.test(publication))return false;
      if(number&&!new RegExp('(?:^|[^0-9])'+number+'(?:$|[^0-9])').test(publication))return false;
      if(/VIDRIO PLANO/i.test(text)&&/VENTANAS/i.test(publication))return false;
      if(/VENTANAS/i.test(text)&&/VIDRIO/i.test(publication))return false;
      if(/LATAM|LATINA/i.test(text)&&!/LATAM|LATINA/i.test(publication+' '+candidate.medio))return false;
      if(web){if(!medium.startsWith('WEB'))return false;for(const region of ['ESPANA','SPAIN','PORTUGAL','LATAM'])if(key(text).includes(region)&&!medium.includes(region==='SPAIN'?'ESPANA':region))return false;}
      else if(/DIGITAL/i.test(line.descripcion)){if(!medium.includes('DIG'))return false;}
      else if(!medium.includes('IMP'))return false;
      return true;
    });
    return matches.length===1?matches[0].id_linea_contrato:null;
  });
}
export function planPdfPayments(source,orders,receipts){
  if(source.abono||!source.forma)return {assignments:[],hold:'Sin cobro monetario definido en el documento.'};
  if(['intercambio','factoring'].includes(source.forma))return {assignments:[],hold:'Forma especial pendiente de confirmar: '+source.forma};
  if(orders.length&&orders.every(order=>!order.cancelada&&(order.cobrada||order.cobro_revision_bancaria||order.revisada))&&cents(orders.reduce((sum,order)=>sum+Number(order.cobro_total),0))===cents(source.total))return {assignments:[],hold:'',preserveCollected:true};
  const assignments=[],used=new Set();let hold='';
  for(const payment of source.cobros){
    let matches=orders.filter(order=>!used.has(order.id_orden)&&receipts.some(receipt=>receipt.id_orden===order.id_orden&&receipt.numero_cobro===payment.numero));
    if(!matches.length)matches=orders.filter(order=>!used.has(order.id_orden)&&order.fecha_teorica_cobro===payment.fecha&&cents(order.cobro_total)===cents(payment.importe));
    if(!matches.length&&orders.length===1&&source.cobros.length===1)matches=orders;
    if(!matches.length)matches=orders.filter(order=>!used.has(order.id_orden)&&order.numero_cobro===payment.numero&&!receipts.some(receipt=>receipt.id_orden===order.id_orden));
    let order=matches.length===1?matches[0]:null;
    if(matches.length>1)return {assignments:[],hold:'Varias órdenes coinciden con un vencimiento.'};
    if(!order){const exact=orders.filter(order=>!used.has(order.id_orden)&&order.fecha_teorica_cobro===payment.fecha&&cents(order.cobro_total)===cents(payment.importe));if(exact.length===1)order=exact[0];}
    if(order){
      used.add(order.id_orden);
      if(order.cancelada)return {assignments:[],hold:'Hay una orden cancelada.'};
      if((order.cobrada||order.cobro_revision_bancaria||order.revisada)&&cents(order.cobro_total)!==cents(payment.importe)){hold='Los importes o el reparto difieren de órdenes ya cobradas.';continue;}
      const receipt=receipts.find(item=>item.id_orden===order.id_orden);
      if(receipt?.id_remesa&&(source.forma!=='recibo'||cents(receipt.importe_recibo)!==cents(payment.importe)))return {assignments:[],hold:'El recibo ya remesado difiere del documento.'};
    }
    assignments.push({payment,order});
  }
  if(orders.some(order=>!used.has(order.id_orden)))return {assignments:[],hold:'Hay órdenes adicionales que no se pueden reasignar automáticamente.'};
  return {assignments:hold?assignments.filter(item=>item.order&&!item.order.cobrada&&!item.order.cobro_revision_bancaria&&!item.order.revisada):assignments,hold};
}

export async function importPublicidadPdf(rows,{pool=getPgPool(),readDocument,beforeApply,actorId='',creditOrigins=[]}={}){
  const db=await pool.connect(),result={invoices:0,lines:0,newOrders:0,newReceipts:0,documents:0,holds:[]};
  try{
    await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='5s'");await lockIncome(db);
    await db.query('LOCK TABLE administracion_facturas_clientes,administracion_lineas_factura,tesoreria_ordenes,tesoreria_recibos_importados,comercial_contratos_cobros IN SHARE ROW EXCLUSIVE MODE');
    const accounts=(await db.query('SELECT id_cuenta,id_edisoft,nombre_empresa,nombre_fiscal,vat_code FROM comercial_cuentas')).rows;
    const work=[];
    for(const source of rows){
      let matches=(await db.query('SELECT * FROM administracion_facturas_clientes WHERE numero_factura=$1',[source.numero])).rows;
      if(!matches.length)matches=(await db.query('SELECT * FROM administracion_facturas_clientes WHERE id_factura_cliente=$1',[source.numero])).rows;
      if(matches.length!==1)throw new Error('Factura ausente o ambigua: '+source.numero);
      const invoice=matches[0];if(invoice.ya_contabilizada||invoice.verifactu_generated_at||invoice.datos_importacion?.abono_aplicado||invoice.datos_importacion?.saldo_tras_abonos)throw new Error('Factura protegida: '+source.numero);
      const account=accounts.find(item=>item.id_cuenta===invoice.id_cuenta),coded=accounts.filter(item=>code(item.id_edisoft)===source.codigo);
      if(!account||(coded.length&& !coded.some(item=>item.id_cuenta===account.id_cuenta)))throw new Error('La cuenta difiere del código del PDF: '+source.numero);
      const orders=(await db.query(`SELECT o.*,EXISTS(SELECT 1 FROM tesoreria_aplicaciones_cobro a JOIN tesoreria_movimientos_bancarios b USING(id_linea_banco) WHERE a.id_orden=o.id_orden AND b.estado_revision) revisada FROM tesoreria_ordenes o WHERE id_factura=$1 ORDER BY numero_cobro`,[invoice.id_factura_cliente])).rows;
      const receipts=(await db.query('SELECT * FROM tesoreria_recibos_importados WHERE id_orden=ANY($1::text[])',[orders.map(item=>item.id_orden)])).rows;
      const lines=(await db.query('SELECT * FROM administracion_lineas_factura WHERE id_factura_cliente=$1',[invoice.id_factura_cliente])).rows;
      const contracts=[...new Set([invoice.id_contrato,...orders.map(item=>item.id_contrato)].filter(Boolean))];
      const payments=(await db.query('SELECT * FROM comercial_contratos_cobros WHERE id_cobro_contrato=ANY($1::text[])',[orders.map(item=>item.id_cobro_contrato).filter(Boolean)])).rows;
      const contractLines=(await db.query('SELECT * FROM comercial_contratos_lineas WHERE id_contrato=ANY($1::text[])',[contracts])).rows;
      const cash=creditOrigins.includes(source.originalNumero)?{assignments:[],hold:'La factura tiene un abono: compensación pendiente de confirmar.'}:planPdfPayments(source,orders,receipts);
      work.push({source,invoice,account,orders,receipts,lines,payments,contracts,contractLines,cash});
    }
    if(beforeApply)await beforeApply(work);
    for(const item of work){
      const {source,invoice,account,cash}=item;
      const metadata={...invoice.datos_importacion,publicidad_pdf:{archivo:source.file,fecha:source.fecha,codigo:source.codigo,forma_pago_texto:source.paymentText,iban:source.iban,banco_cobro:source.banco,vencimientos:source.cobros,lectura_visual:Boolean(source.lectura_visual),pendiente_revision:cash.hold,anterior:invoice.datos_importacion?.publicidad_pdf?.anterior||{factura:invoice,lineas:item.lines}}};
      metadata.importe_global_sin_desglose=false;metadata.requiere_revision_importe=false;
      const regions=invoiceRegionalTotals({importe_total:source.total,datos_fiscales:source.fiscal},account);
      if(Object.keys(regions).length!==3)throw new Error('País no reconocido: '+source.numero+' '+source.fiscal.pais);
      const fiscal={...invoice.datos_fiscales,...source.fiscal};
      // Email is absent from these PDFs; preserve it. The IBAN on a receipt is the debtor account, not the collection bank.
      await db.query(`UPDATE administracion_facturas_clientes SET fecha_factura=$2,fecha_emision=$3,base_imponible=$4,importe_total=$5,iva_porcentaje=$6,
        datos_fiscales=$7::jsonb,forma_cobro=COALESCE(NULLIF($8,''),forma_cobro),total_nac_iva=$9,total_ue=$10,total_resto=$11,datos_importacion=$12::jsonb,updated_at=NOW() WHERE id_factura_cliente=$1`,
      [invoice.id_factura_cliente,source.fecha,iso(source.fecha),source.base,source.total,source.iva,JSON.stringify(fiscal),source.forma,regions.total_nac_iva,regions.total_ue,regions.total_resto,JSON.stringify(metadata)]);
      await db.query('DELETE FROM administracion_lineas_factura WHERE id_factura_cliente=$1',[invoice.id_factura_cliente]);
      const serviceLinks=matchPdfContractServices(source,item.contractLines);
      for(const [index,line] of source.lineas.entries()){
        await db.query(`INSERT INTO administracion_lineas_factura(id_linea_factura,id_factura_cliente,posicion,concepto,descripcion,cantidad,precio_unitario,base_imponible,iva_porcentaje,importe_total,personalizada,id_linea_contrato) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11)`,['lf_pdf_'+hash(invoice.id_factura_cliente+':'+index).slice(0,24),invoice.id_factura_cliente,index+1,line.concepto,line.descripcion,line.cantidad,line.precio_unitario,line.base_imponible,line.iva_porcentaje,line.importe_total,serviceLinks[index]]);
        if(serviceLinks[index])await db.query(`UPDATE comercial_contratos_lineas SET producto=CASE WHEN COALESCE(trim(producto),'') IN ('','-') THEN $2 ELSE producto END,
          descripcion_linea=$3,linea_snapshot=jsonb_set(COALESCE(linea_snapshot,'{}'::jsonb),'{facturas_pdf}',COALESCE(linea_snapshot->'facturas_pdf','{}'::jsonb)||jsonb_build_object($4::text,$5::jsonb)),updated_at=NOW() WHERE id_linea_contrato=$1`,[serviceLinks[index],line.concepto,[line.concepto,line.descripcion].filter(Boolean).join('\n'),source.numero,JSON.stringify(line)]);
      }
      for(const assignment of cash.assignments){
        const {payment}=assignment;let order=assignment.order;
        const base=Math.round(payment.importe*source.base/source.total*100)/100;
        if(!order){
          const orderId=receiptOrderId(source.numero+'-'+String(payment.numero).padStart(3,'0'));
          order=(await db.query(`INSERT INTO tesoreria_ordenes(id_orden,id_factura,id_cuenta,numero_cobro,etiqueta_cobro,forma_cobro,banco_cobro,cobro_total,base_imponible,con_iva,fecha_teorica_cobro) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[orderId,invoice.id_factura_cliente,invoice.id_cuenta,payment.numero,'Vencimiento '+payment.numero+' factura '+source.numero,source.forma,source.banco,payment.importe,base,source.iva>0,payment.fecha])).rows[0];result.newOrders++;
        }else{
          // Paid amounts and bank reconciliation survive documentary enrichment.
          const bank=order.cobrada||order.cobro_revision_bancaria||order.revisada?order.banco_cobro||source.banco:source.banco;
          await db.query(`UPDATE tesoreria_ordenes SET forma_cobro=$2,banco_cobro=$3,cobro_total=$4,base_imponible=$5,con_iva=$6,fecha_teorica_cobro=$7,updated_at=NOW() WHERE id_orden=$1`,[order.id_orden,source.forma,bank,payment.importe,base,source.iva>0,payment.fecha]);
          const oldReceipt=item.receipts.find(receipt=>receipt.id_orden===order.id_orden);
          if(oldReceipt&&source.forma!=='recibo')await db.query('DELETE FROM tesoreria_recibos_importados WHERE id_orden=$1 AND id_remesa IS NULL',[order.id_orden]);
          if(order.id_cobro_contrato)await db.query(`UPDATE comercial_contratos_cobros SET importe_cobro=$2,fecha_cobro=$3,forma_cobro=$4,banco_cobro=$5,updated_at=NOW() WHERE id_cobro_contrato=$1`,[order.id_cobro_contrato,payment.importe,payment.fecha,source.forma,bank]);
        }
        const receipt=await ensureOrderReceipt(db,order.id_orden,actorId);
        if(receipt&&!item.receipts.some(item=>item.id_orden===order.id_orden))result.newReceipts++;
      }
      if(source.originalFactura){
        const original=(await db.query('SELECT id_factura_cliente FROM administracion_facturas_clientes WHERE numero_factura=$1 OR id_factura_cliente=$1',[source.originalFactura])).rows;
        if(original.length!==1)throw new Error('Factura de origen del abono no encontrada: '+source.numero);
        await db.query('UPDATE administracion_facturas_clientes SET factura_origen_id=$2 WHERE id_factura_cliente=$1',[invoice.id_factura_cliente,original[0].id_factura_cliente]);
      }
      if(metadata.registro_facturas){
        const totalOrders=Number((await db.query('SELECT COALESCE(sum(cobro_total),0) total FROM tesoreria_ordenes WHERE id_factura=$1 AND NOT cancelada',[invoice.id_factura_cliente])).rows[0].total);
        const warning=source.abono||cents(totalOrders)===cents(source.total)?null:{factura:source.total,ordenes:totalOrders,diferencia:(cents(source.total)-cents(totalOrders))/100};
        await db.query("UPDATE administracion_facturas_clientes SET datos_importacion=jsonb_set(datos_importacion,'{registro_facturas,discrepancia_ordenes}',$2::jsonb) WHERE id_factura_cliente=$1",[invoice.id_factura_cliente,JSON.stringify(warning)]);
      }
      for(const contractId of item.contracts)await db.query(`UPDATE comercial_contratos SET datos_facturacion=jsonb_set(COALESCE(datos_facturacion,'{}'::jsonb),'{facturas_pdf}',COALESCE(datos_facturacion->'facturas_pdf','{}'::jsonb)||jsonb_build_object($2::text,$3::jsonb)),updated_at=NOW() WHERE id_contrato=$1`,[contractId,source.numero,JSON.stringify({lineas:source.lineas,fecha:source.fecha,archivo:source.file})]);
      if(readDocument){
        for(const document of await readDocument(source)){
          const bytes=document.bytes,sha=hash(bytes);
          await db.query(`INSERT INTO administracion_facturas_documentos(id_documento,id_factura_cliente,nombre,sha256,contenido) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id_factura_cliente,sha256) DO NOTHING`,['doc_pdf_'+sha.slice(0,32),invoice.id_factura_cliente,document.name,sha,bytes]);result.documents++;
        }
      }
      if(cash.hold)result.holds.push({numero:source.numero,cliente:source.fiscal.nombre_fiscal,reason:cash.hold});
      await syncInvoiceCollection(db,[invoice.id_factura_cliente]);
      await accountActivity(db,invoice.id_cuenta,actorId,'ha actualizado datos fiscales, servicios y vencimientos de la factura '+source.numero+' desde su PDF original.');
      result.invoices++;result.lines+=source.lineas.length;
    }
    await db.query('COMMIT');return result;
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
