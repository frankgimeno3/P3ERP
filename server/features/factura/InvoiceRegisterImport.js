import {allocateAccountIdentifier,allocateOrderIdentifier,invoiceIdentifier} from '../identifiers/BusinessIdentifiers.js';
import {createHash} from 'node:crypto';
import XLSX from 'xlsx';
import {getPgPool} from '../../database/pgClient.js';
import {lockIncome,ensureOrderReceipt,syncInvoiceCollection} from '../prevision/IncomeReconciliation.js';
import {addCuentaEvento} from '../registroEventos/RegistroEventosRepository.js';

const cents=value=>Math.round(Number(value||0)*100),money=value=>Math.round(Number(value)*100)/100;
const digest=value=>createHash('sha256').update(String(value)).digest('hex').slice(0,24);
const norm=value=>String(value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const unique=items=>[...new Set(items.filter(Boolean))];
const canonical=value=>JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
export function parseInvoiceRegister(buffer,filename='REGISTRO FACTURAS.xlsx'){
  const book=XLSX.read(buffer,{type:'buffer',cellDates:false}),rows=[],reserved=[];
  const hash=createHash('sha256').update(buffer).digest('hex');
  for(const sheet of book.SheetNames){
    const matrix=XLSX.utils.sheet_to_json(book.Sheets[sheet],{header:1,defval:null});
    if(!String(matrix[0]?.[0]||'').includes('FRA'))throw new Error('Cabecera de facturas no reconocida: '+sheet);
    matrix.slice(1).forEach((raw,index)=>{
      if(raw.every(value=>value==null||!String(value).trim()))return;
      const numero=String(raw[0]||'').trim(),cliente=String(raw[3]||'').trim();
      if(numero)invoiceIdentifier(numero);
      if(numero&&raw.slice(1).every(value=>value==null||!String(value).trim())){reserved.push({sheet,row:index+2,numero});return;}
      const date=typeof raw[1]==='number'?XLSX.SSF.parse_date_code(raw[1]):null;
      const totals=raw.slice(4,7).map(value=>value==null||value===''?0:Number(value));
      if(!numero||!cliente||!date||totals.some(value=>!Number.isFinite(value))||!totals.some(value=>value!==0))throw new Error(`Factura incompleta en ${sheet}, fila ${index+2}.`);
      if(rows.some(row=>row.numero===numero))throw new Error('Número de factura repetido: '+numero);
      const nacional=money(totals[0]),ue=money(totals[1]),resto=money(totals[2]);
      const base=money(nacional/1.21+ue+resto),total=money(nacional+ue+resto);
      rows.push({numero,cliente,codigo:String(raw[2]||'').trim(),fecha:`${String(date.d).padStart(2,'0')}/${String(date.m).padStart(2,'0')}/${date.y}`,
        iso:`${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`,nacional,ue,resto,base,total,
        forma:/recibo/i.test(String(raw[7]||''))?'recibo':/transfer/i.test(String(raw[7]||''))?'transferencia':String(raw[7]||'').trim(),
        source:{archivo:filename,hoja:sheet,fila:index+2,sha256:hash,codigo:String(raw[2]||''),cliente,original:raw}});
    });
  }
  return {rows,reserved,hash};
}

export async function planInvoiceRegister(db,rows){
  const invoices=(await db.query("SELECT *,to_char(fecha_emision,'YYYY-MM-DD') fecha_emision FROM administracion_facturas_clientes")).rows;
  const accounts=(await db.query('SELECT * FROM comercial_cuentas')).rows;
  const orders=(await db.query('SELECT * FROM tesoreria_ordenes')).rows;
  const receipts=(await db.query('SELECT * FROM tesoreria_recibos_importados')).rows;
  const plan=[];
  for(const row of rows){
    const matches=invoices.filter(invoice=>invoice.numero_factura===row.numero||invoice.id_factura_cliente===row.numero);
    if(matches.length>1)throw new Error('Varias facturas coinciden con '+row.numero);
    const before=matches[0];
    if(before?.ya_contabilizada||before?.verifactu_estado_envio==='factura emitida')throw new Error('Factura bloqueada: '+row.numero);
    const aliases=unique([row.numero,before?.id_factura_cliente]);
    const linked=orders.filter(order=>aliases.includes(order.id_factura)||aliases.includes(String(order.datos_importacion?.original?.FACTURA||'').trim()));
    if(linked.some(order=>order.id_factura&&!aliases.includes(order.id_factura)))throw new Error('Una orden de '+row.numero+' ya pertenece a otra factura.');
    const coded=accounts.filter(account=>row.codigo&&account.id_edisoft===row.codigo);
    const accountIds=unique([before?.id_cuenta,...linked.map(order=>order.id_cuenta)]);
    const names=accounts.filter(account=>[norm(account.nombre_empresa),norm(account.nombre_fiscal)].includes(norm(row.cliente)));
    const accountId=before?.id_cuenta||(coded.length===1?coded[0].id_cuenta:accountIds.length===1?accountIds[0]:names.length===1?names[0].id_cuenta:null);
    if(accountIds.length>1||coded.length>1)throw new Error('Coincidencia de cuenta ambigua: '+row.numero);
    const related=receipts.filter(receipt=>aliases.includes(receipt.numero_factura)||linked.some(order=>order.id_orden===receipt.id_orden));
    const contracts=unique([before?.id_contrato,...linked.map(order=>order.id_contrato)]);
    const orderTotal=money(linked.filter(order=>!order.cancelada).reduce((sum,order)=>sum+Number(order.cobro_total||0),0));
    const warning=linked.length&&cents(orderTotal)!==cents(row.total)?{factura:row.total,ordenes:orderTotal,diferencia:money(row.total-orderTotal)}:null;
    const account=accounts.find(candidate=>candidate.id_cuenta===accountId);
    const fiscal={nombre_fiscal:account?.nombre_fiscal||account?.nombre_empresa||row.cliente,vat_code:account?.vat_code||account?.cif||'',pais:account?.pais_facturacion||'',direccion:account?.direccion_facturacion||'',poblacion:account?.poblacion_facturacion||'',cp:account?.cp_facturacion||'',email:account?.mail_contabilidad||''};
    plan.push({row,before,accountId,fiscal,newAccount:!accountId,invoiceId:before?.id_factura_cliente||row.numero,
      orderIds:linked.map(order=>order.id_orden),orders:linked,receipts:related,contracts,
      remesas:unique(related.map(receipt=>receipt.id_remesa)),warning,
      createOrder:!linked.length&&!related.length&&row.total>0});
  }
  return plan;
}

export async function importInvoiceRegister(rows,{apply=false,actorId='',pool=getPgPool(),beforeApply}={}){
  const db=await pool.connect();
  try{
    await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='5s'");await lockIncome(db);
    // Protect the reviewed plan from concurrent invoice/order changes during this transaction.
    if(apply)await db.query('LOCK TABLE administracion_facturas_clientes,tesoreria_ordenes,tesoreria_recibos_importados,comercial_cuentas IN SHARE ROW EXCLUSIVE MODE');
    const plan=await planInvoiceRegister(db,rows);
    const summary={total:plan.length,created:plan.filter(item=>!item.before).length,matched:plan.filter(item=>item.before).length,
      updated:0,unchanged:0,newAccounts:plan.filter(item=>item.newAccount).length,newOrders:plan.filter(item=>item.createOrder).length,
      linkedOrders:plan.reduce((sum,item)=>sum+item.orderIds.length,0),remesas:unique(plan.flatMap(item=>item.remesas)).length,
      warnings:plan.filter(item=>item.warning).map(item=>({numero:item.row.numero,...item.warning})),
      invoices:plan.map(item=>({numero:item.row.numero,id:item.invoiceId,cuenta:item.accountId,ordenes:item.orderIds,remesas:item.remesas,contratos:item.contracts}))};
    const backup={facturas:plan.filter(item=>item.before).map(item=>item.before),ordenes:plan.flatMap(item=>item.orders),recibos:plan.flatMap(item=>item.receipts),lineas:(await db.query('SELECT * FROM administracion_lineas_factura WHERE id_factura_cliente=ANY($1::text[])',[plan.map(item=>item.invoiceId)])).rows};
    if(!apply){await db.query('ROLLBACK');return {summary,backup};}
    if(beforeApply)await beforeApply(backup);
    const createdAccounts=new Map();
    for(const item of plan){
      const {row,before,invoiceId}=item;
      if(item.newAccount){
        const identity=row.codigo?'codigo:'+row.codigo:'nombre:'+norm(row.cliente);
        item.accountId=createdAccounts.get(identity);
        if(!item.accountId){
          item.accountId=await allocateAccountIdentifier(db);
          await db.query(`INSERT INTO comercial_cuentas(id_cuenta,nombre_empresa,id_edisoft,descripcion_cuenta) VALUES($1,$2,$3,$4)`,[item.accountId,row.cliente,row.codigo,'Creada desde el registro de facturas. Datos fiscales pendientes de completar.']);
          createdAccounts.set(identity,item.accountId);
        }
      }
      const metadata={...before?.datos_importacion?.registro_facturas,...row.source,discrepancia_ordenes:item.warning,contratos:item.contracts};
      if(before?.datos_importacion?.registro_facturas?.anterior)metadata.anterior=before.datos_importacion.registro_facturas.anterior;
      else if(before&&!before.datos_importacion?.registro_facturas)metadata.anterior={id_cuenta:before.id_cuenta,base_imponible:before.base_imponible,importe_total:before.importe_total,fecha_factura:before.fecha_factura,iva_porcentaje:before.iva_porcentaje};
      const data={numero_factura:row.numero,id_cuenta:item.accountId,fecha_factura:row.fecha,fecha_emision:row.iso,
        total_nac_iva:row.nacional,total_ue:row.ue,total_resto:row.resto,base_imponible:row.base,importe_total:row.total,
        iva_porcentaje:row.nacional?21:0,factura_tipo:row.total<0?'abono':before?.factura_tipo||'ordinaria',
        datos_importacion:{...before?.datos_importacion,registro_facturas:metadata}};
      if(row.forma)data.forma_cobro=row.forma;
      if(!Object.keys(before?.datos_fiscales||{}).length)data.datos_fiscales=item.fiscal;
      if(!before?.id_contrato&&item.contracts.length===1)data.id_contrato=item.contracts[0];
      const lines=(await db.query('SELECT * FROM administracion_lineas_factura WHERE id_factura_cliente=$1 ORDER BY posicion',[invoiceId])).rows;
      const same=(a,b)=>typeof b==='object'?canonical(a)===canonical(b):typeof b==='number'?cents(a)===cents(b):String(a??'')===String(b??'');
      const changed=Object.keys(data).filter(key=>!same(before?.[key],data[key]));
      if(!before){const fields=['id_factura_cliente',...Object.keys(data)],values=[invoiceId,...Object.values(data).map(value=>typeof value==='object'?JSON.stringify(value):value)];await db.query('INSERT INTO administracion_facturas_clientes('+fields.join(',')+') VALUES('+fields.map((_,i)=>'$'+(i+1)).join(',')+')',values);}
      else if(changed.length){await db.query('UPDATE administracion_facturas_clientes SET '+changed.map((key,index)=>key+'=$'+(index+1)).join(',')+',updated_at=now() WHERE id_factura_cliente=$'+(changed.length+1),[...changed.map(key=>typeof data[key]==='object'?JSON.stringify(data[key]):data[key]),invoiceId]);summary.updated++;}
      else summary.unchanged++;
      const linesMatch=lines.length&&cents(lines.reduce((sum,line)=>sum+Number(line.base_imponible),0))===cents(row.base)&&cents(lines.reduce((sum,line)=>sum+Number(line.importe_total),0))===cents(row.total);
      if(!linesMatch){
        if(lines.length&&!before?.datos_importacion?.registro_facturas?.lineas_anteriores)await db.query("UPDATE administracion_facturas_clientes SET datos_importacion=jsonb_set(datos_importacion,'{registro_facturas,lineas_anteriores}',$2::jsonb) WHERE id_factura_cliente=$1",[invoiceId,JSON.stringify(lines)]);
        await db.query('DELETE FROM administracion_lineas_factura WHERE id_factura_cliente=$1',[invoiceId]);
        let position=0;
        for(const [label,total,vat] of [['Nacional',row.nacional,21],['Unión Europea',row.ue,0],['Resto',row.resto,0]]){
          if(!total)continue;position++;
          const base=money(total/(1+vat/100));
          await db.query(`INSERT INTO administracion_lineas_factura(id_linea_factura,id_factura_cliente,posicion,concepto,descripcion,cantidad,precio_unitario,base_imponible,iva_porcentaje,importe_total,personalizada) VALUES($1,$2,$3,$4,$5,1,$6,$6,$7,$8,true)`,['lf_reg_'+digest(invoiceId+':'+position),invoiceId,position,`${row.cliente} · ${row.numero}`,`Importe del registro de facturas (${label}). El archivo no contiene desglose de servicios.`,base,vat,total]);
        }
      }
      if(item.createOrder){
        const orderId=await allocateOrderIdentifier(db,{invoiceId,date:row.fecha});
        await db.query(`INSERT INTO tesoreria_ordenes(id_orden,id_factura,id_cuenta,numero_cobro,etiqueta_cobro,forma_cobro,base_imponible,cobro_total,con_iva,datos_importacion) VALUES($1,$2,$3,1,$4,$5,$6,$7,$8,$9::jsonb) ON CONFLICT(id_orden) DO NOTHING`,[orderId,invoiceId,item.accountId,'Factura '+row.numero,row.forma,row.base,row.total,Boolean(row.nacional),JSON.stringify({registro_facturas:row.source,vencimiento_pendiente:true})]);item.orderIds.push(orderId);
      }
      for(const orderId of item.orderIds){await db.query("UPDATE tesoreria_ordenes SET id_factura=$2,id_cuenta=COALESCE(NULLIF(id_cuenta,''),$3),updated_at=CASE WHEN id_factura IS DISTINCT FROM $2 THEN now() ELSE updated_at END WHERE id_orden=$1",[orderId,invoiceId,item.accountId]);await ensureOrderReceipt(db,orderId,actorId);}
      for(const contractId of item.contracts)await db.query("UPDATE comercial_contratos SET id_factura=$2 WHERE id_contrato=$1 AND COALESCE(id_factura,'')=''",[contractId,invoiceId]);
      await syncInvoiceCollection(db,[invoiceId]);
      if(!before||changed.length)await addCuentaEvento({idCuenta:item.accountId,idAgente:actorId,detalles:`${before?'Actualizada':'Importada'} factura ${row.numero} desde ${row.source.archivo}, ${row.source.hoja}, fila ${row.source.fila}.`},db);
      const view=summary.invoices.find(invoice=>invoice.id===invoiceId);view.cuenta=item.accountId;view.ordenes=item.orderIds;
    }
    summary.newAccounts=createdAccounts.size;
    await db.query('COMMIT');return {summary,backup};
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
