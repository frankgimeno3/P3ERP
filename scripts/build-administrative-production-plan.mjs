// Pure offline preparation. It does not change the database.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseImportDate} from '../server/features/prevision/ReceiptExcel.js';
const folder=path.resolve(process.env.USERPROFILE,'OneDrive/Escritorio/importacion-administracion-produccion-20260920');
const read=n=>JSON.parse(fs.readFileSync(path.join(folder,n+'.json'),'utf8'));
const source=read('source'),production=Object.entries(source).slice(1).flatMap(([sheet,rows])=>rows.map(r=>({...r,sheet})));
let admin=Object.values(source)[0];
const decisions=read('user-decisions');
const decisionsDigest=createHash('sha256').update(JSON.stringify(decisions)).digest('hex');
const text=v=>String(v??'').trim(),money=v=>Math.round(Number(v||0)*100)/100;
const group=(rows,key)=>rows.reduce((all,row)=>{(all[key(row)]??=[]).push(row);return all;},{});
const id=(prefix,value)=>prefix+'_'+createHash('sha256').update(value).digest('hex').slice(0,24);
const date=v=>{if(!text(v)||text(v)==='-')return '';try{return parseImportDate(v);}catch{return '';}};
const contractCode=v=>/^C\d{2}\.\d{3}\.\d{3}$/.test(text(v))?text(v):null;
const tables={agentes_db:[],comercial_cuentas:[],comercial_contratos:[],comercial_contratos_lineas:[],comercial_contratos_cobros:[],administracion_facturas_clientes:[],administracion_lineas_factura:[],tesoreria_ordenes:[],tesoreria_remesas:[],tesoreria_recibos_importados:[],produccion_contenidos:[]};
const accounts=read('accounts-resolved-snapshot'),agents=read('agentes_db'),warnings=[];
let marketing=agents.find(a=>text(a.email_agente).toLowerCase()==='marketing@vidrioperfil.com');
if(!marketing){marketing={id_agente:'ag_marketing_vidrioperfil',nombre_agente:'Marketing',apellidos_agente:'',nombre_completo_agente:'Marketing',email_agente:'marketing@vidrioperfil.com',rol_agente:'base',estado_agente:'activo',is_empleado_account:false};tables.agentes_db.push(marketing);}
const agent={PEP:'ag_25_0004',GIMENO:'ag_305a8d12a9a44be698bd',MONTSE:'ag_8ebc433331614e8dbf2b',RICARDO:'ag_25_0002',FRANK:'ag_25_0008',MARKETING:marketing.id_agente};
function accountMatches(row){
 const code=text(row['CODIGO CRM']);
 const override=decisions.accountOverrides[code]||(row.sheet?decisions.productionNameMatches?.[code]:null);
 return override?accounts.filter(a=>a.id_cuenta===override):accounts.filter(a=>text(a.id_edisoft)===code);
}
function account(row){
 const matches=accountMatches(row);
 if(matches.length!==1)throw Error(`Cuenta pendiente de resolver: ${row.CLIENTE}, código ${row['CODIGO CRM']}, fila ${row.sourceRow}`);
 return matches[0];
}
const originalPriceIssues=new Set(read('plan').priceIssues.map(issue=>issue.code));
const excludedOrders=[];
admin=admin.filter(row=>{
 const unresolvedAccount=accountMatches(row).length!==1;
 const unresolvedAmount=originalPriceIssues.has(text(row['CONTRATO ASOCIADO']))&&!decisions.amountOverrides[text(row['CONTRATO ASOCIADO'])];
 if(text(row.ORDEN).startsWith(decisions.omitIncidentOrdersStartingWith)&&(unresolvedAccount||unresolvedAmount)){
  excludedOrders.push({row:row.sourceRow,order:row.ORDEN,unresolvedAccount,unresolvedAmount});return false;
 }
 return true;
});
for(const row of [...admin,...production])account(row);
const adminGroups=group(admin,r=>contractCode(r['CONTRATO ASOCIADO'])||'');
const productionGroups=group(production,r=>contractCode(r.CONTRATO)||'');
const contracts=new Map();
for(const code of new Set([...Object.keys(adminGroups),...Object.keys(productionGroups)].filter(Boolean))){
 const orders=adminGroups[code]||[],contents=productionGroups[code]||[];
 const bases=[...new Set(orders.map(r=>money(r['IMPORTE TOTAL BI CONTRATO'])))];
 let base=orders.length?money(bases.reduce((a,b)=>a+b,0)):null;
 const total=orders.length?money(orders.reduce((sum,r)=>sum+money(r['IMPORTE CON IVA']),0)):null;
 const adjustment=decisions.amountOverrides[code];
 if(adjustment){
  if(adjustment.vatPercent==null||!Number.isFinite(adjustment.vatPercent))throw Error('IVA pendiente: '+code);
  if(total!==adjustment.total)throw Error('El total autorizado ha cambiado: '+code);
  base=money(total/(1+adjustment.vatPercent/100));
 }
 const exchange=base>0&&total===0;
 const rate=adjustment?adjustment.vatPercent:base>0&&total>0?[0,4,10,21].find(rate=>Math.abs(total-base*(1+rate/100))<=Math.max(0.02,orders.length*0.005)+0.000001):0;
 const inconsistent=base>0&&total>0&&rate===undefined;
 if(inconsistent)warnings.push({type:'importe',code,base,total});
 const accountIds=[...new Set([...contents,...orders].map(r=>account(r).id_cuenta))];
 const commercialAgents=[...new Set(orders.map(r=>agent[text(r.AGENTE)]).filter(Boolean))];
 const entry={id_contrato:code,nombre_contrato:code,id_cuenta_contrato:accountIds.length===1?accountIds[0]:null,id_agente_contrato:commercialAgents.length===1?commercialAgents[0]:null,id_propuesta:'',fecha_firma_contrato:date(orders[0]?.['FECHA FIRMA CONTRATO']),importe_total_bi_contrato:base,importe_contrato_con_iva:total,iva_aplicable:rate>0,forma_cobro_contrato:exchange?'intercambio':text(orders[0]?.['FORMA DE COBRO']),es_intercambio:exchange,importe_intercambio:exchange?base:0,array_contenidos:[],array_id_ordenes:[],datos_importacion:{archivo:'Control ADMINISTRATIVO  (1).xlsx',filas:orders,cuentas:accountIds,agentes_comerciales:commercialAgents,iva_porcentaje:rate??null,requiere_revision_importe:inconsistent,importe_desconocido:!orders.length,sin_propuesta_origen:true}};
 if(adjustment)entry.datos_importacion.ajuste_autorizado={...adjustment,base_calculada:base,bases_originales:bases};
 contracts.set(code,entry);tables.comercial_contratos.push(entry);
}
const orderGroups=group(admin,r=>text(r.ORDEN)),orderNumbers=new Map();
for(const row of admin){
 const code=contractCode(row['CONTRATO ASOCIADO']),contract=contracts.get(code),acc=account(row);
 const original=text(row.ORDEN),orderId=orderGroups[original].length>1||!contractCode(original.split('-')[0])?`${original||'SIN-ORDEN'}~fila${row.sourceRow}`:original;
 const total=money(row['IMPORTE CON IVA']),exchange=contract?.es_intercambio===true;
 const rate=contract?.datos_importacion.iva_porcentaje;
 const rawBase=money(row['IMPORTE TOTAL BI CONTRATO']);
 const base=exchange?0:rate!=null?money(total/(1+rate/100)):rawBase;
 const number=(orderNumbers.get(code||'')||0)+1;orderNumbers.set(code||'',number);
 const invoice=/^(?:\d+|P\d+)$/.test(text(row.FACTURA))?text(row.FACTURA):null;
 const method=exchange?'intercambio':total===0?'sin cobro monetario':text(row['FORMA DE COBRO']).startsWith('TRANSF')?'transferencia':text(row['FORMA DE COBRO']).toLowerCase();
 const bank=/SAN/.test(text(row['FORMA DE COBRO']))?'Santander':/SAB/.test(text(row['FORMA DE COBRO']))?'Sabadell':null;
 const order={id_orden:orderId,id_contrato:code,id_factura:invoice,id_cuenta:acc.id_cuenta,id_agente:agent[text(row.AGENTE)]||null,numero_cobro:number,etiqueta_cobro:original,fecha_teorica_cobro:date(row['FECHA DE COBRO PREVISTA'])||date(row['FECHA DE COBRO ORDEN segun factura']),fecha_real_cobro:'',forma_cobro:method,banco_cobro:bank,base_imponible:base,cobro_total:total,cobrada:text(row.ESTADO).toLowerCase()==='cobrada',cancelada:text(row.ESTADO).toUpperCase()==='ANULADO',con_iva:rate>0,datos_importacion:{archivo:'Control ADMINISTRATIVO  (1).xlsx',hoja:Object.keys(source)[0],fila:row.sourceRow,original:row,cliente:acc.nombre_empresa,agente:text(row.AGENTE),sin_cobro_monetario:total===0,requiere_revision_importe:contract?.datos_importacion.requiere_revision_importe||false},comentarios:text(row['COMISIONES PAGADAS'])?`Comisiones pagadas (Excel): ${text(row['COMISIONES PAGADAS'])}`:''};
 if(!contract&&total>0){const b=rawBase;order.base_imponible=b;order.con_iva=Math.abs(total-b*1.21)<0.02;}
 if(contract){const paymentId=id('cc_excel',orderId);order.id_cobro_contrato=paymentId;contract.array_id_ordenes.push(orderId);tables.comercial_contratos_cobros.push({id_cobro_contrato:paymentId,id_contrato:code,numero_cobro:number,fecha_cobro:order.fecha_teorica_cobro,importe_cobro:total,forma_cobro:method,banco_cobro:bank,observaciones_cobro:'Referencia original: '+original});}
 tables.tesoreria_ordenes.push(order);
 if(method==='recibo' && !order.cancelada){
  const n=Number(row['Nº RECIBO']),receipt=`${invoice||orderId}-${String(n).padStart(3,'0')}`;
  if(!Number.isInteger(n)||n<1)throw Error('Número de recibo inválido: '+row.sourceRow);
  const remesa=text(row['Nº REMESA']);
  const remesaId=remesa&&!/^(No procede|-)$/i.test(remesa)?remesa:null;
  tables.tesoreria_recibos_importados.push({numero_recibo:receipt,numero_factura:invoice,numero_cobro:n,numero_remesa:remesaId||'',id_remesa:remesaId,id_orden:orderId,cliente:acc.nombre_empresa,importe_recibo:total,fecha_creacion:date(row['FECHA FACTURA']),fecha_teorica:order.fecha_teorica_cobro});
 }
}
for(const [invoice,orders] of Object.entries(group(tables.tesoreria_ordenes.filter(o=>o.id_factura),o=>o.id_factura))){
 const accountIds=[...new Set(orders.map(o=>o.id_cuenta))];if(accountIds.length!==1)throw Error('Factura con varios pagadores: '+invoice);
 const cids=[...new Set(orders.map(o=>o.id_contrato).filter(Boolean))];
 const total=money(orders.reduce((s,o)=>s+o.cobro_total,0)),base=money(orders.reduce((s,o)=>s+o.base_imponible,0));
 const rate=base&&Math.abs(total-base*1.21)<Math.max(.02,orders.length*.01)?21:0;
 const raw=orders[0].datos_importacion.original,acc=accounts.find(a=>a.id_cuenta===accountIds[0]);
 const fiscal={nombre_fiscal:acc.nombre_fiscal||'',vat_code:acc.vat_code||'',pais_facturacion:acc.pais_facturacion||'',direccion_facturacion:acc.direccion_facturacion||''};
 const factura={id_factura_cliente:invoice,numero_factura:invoice.startsWith('prev_excel_')?'':invoice,id_cuenta:accountIds[0],id_contrato:cids.length===1?cids[0]:null,base_imponible:base,importe_total:total,fecha_factura:date(raw['FECHA FACTURA']),estado:'en proceso',verifactu_estado_envio:'borrador',ya_contabilizada:false,cobrada:orders.every(o=>o.cobrada),importe_cobrado:money(orders.filter(o=>o.cobrada).reduce((s,o)=>s+o.cobro_total,0)),forma_cobro:orders[0].forma_cobro,iva_porcentaje:rate,datos_fiscales:fiscal,datos_importacion:{archivo:'Control ADMINISTRATIVO  (1).xlsx',filas:orders.map(o=>o.datos_importacion.fila),contratos:cids,importe_global_sin_desglose:true,requiere_revision_importe:orders.some(o=>o.datos_importacion.requiere_revision_importe)},factura_snapshot:{origen:'excel_control_administrativo',sin_desglose:true}};
 tables.administracion_facturas_clientes.push(factura);
 tables.administracion_lineas_factura.push({id_linea_factura:id('lf_excel',invoice),id_factura_cliente:invoice,posicion:1,concepto:'Importe global según control administrativo',descripcion:'Sin desglose de precios unitarios. Contratos: '+(cids.join(', ')||'sin contrato registrado'),cantidad:1,precio_unitario:0,precio_no_desglosado:true,base_imponible:base,importe_total:total,iva_porcentaje:rate,personalizada:true});
}
for(const [remesa,receipts] of Object.entries(group(tables.tesoreria_recibos_importados.filter(r=>r.id_remesa),r=>r.id_remesa)))tables.tesoreria_remesas.push({id_remesa:remesa,importe_declarado:money(receipts.reduce((s,r)=>s+r.importe_recibo,0))});
const contentIds=group(production,r=>text(r.IDENTIFICADOR));
for(const row of production){
 const original=text(row.IDENTIFICADOR),contentId=contentIds[original].length>1?`${original}~fila${row.sourceRow}`:original;
 const acc=account(row),code=contractCode(row.CONTRATO),contract=contracts.get(code),lineId=contract?id('lc_excel',row.sheet+':'+row.sourceRow):null;
 const publication=text(row['PUBLICACION / Nº WEB']||row['PUBLICACION / Nº RICARDO']);
 const content={id_contenido:contentId,id_cuenta:acc.id_cuenta,id_agente:agent[text(row.AGENTE)]||null,id_contrato:code,id_linea_contrato:lineId,hoja_prod:true,ano_publicacion:row.sheet==='Anteriores'?'Anteriores':'2026',codigo_crm_hoja:text(row['CODIGO CRM']),cliente_hoja:acc.nombre_empresa,publicacion_num_web:publication,tipo_revista_servicio:text(row['TIPO REVISTA / SERVICIO']),especificaciones_contenido:text(row['CONTENIDO/-']),anuncio_hoja:text(row.ANUNCIO),articulo_hoja:text(row.ARTICULO),estado_contenido:text(row.ESTADO),factura_hoja:text(row.FACTURA),pagina_hoja:text(row.PAGINA),caduca_web:date(row['CADUCA (web)']||row.CADUCA)||text(row['CADUCA (web)']||row.CADUCA),comentarios_hoja:text(row.Comentarios),nombre_contenido:[publication,row['CONTENIDO/-']].filter(Boolean).join(' · '),datos_importacion:{archivo:'Hoja de produccion.xlsx',hoja:row.sheet,fila:row.sourceRow,original:row}};
 tables.produccion_contenidos.push(content);
 if(contract){contract.array_contenidos.push({id_contenido:contentId});tables.comercial_contratos_lineas.push({id_linea_contrato:lineId,id_contrato:code,numero_linea_contrato:contract.array_contenidos.length,medio:text(row['TIPO REVISTA / SERVICIO']),publicacion:publication,producto:text(row['CONTENIDO/-'])||publication,descripcion_linea:content.nombre_contenido,array_id_contenidos:[contentId],precio_unitario:0,precio_total_personalizado:0,modo_precio:'personalizado',precio_no_desglosado:true,linea_snapshot:{origen:'excel_produccion',incluido_en_importe_global:true,precio_no_desglosado:true}});}
}
for(const contract of contracts.values()){
 tables.comercial_contratos_lineas.push({id_linea_contrato:id('lc_global',contract.id_contrato),id_contrato:contract.id_contrato,numero_linea_contrato:contract.array_contenidos.length+1,producto:'Valor global del contrato',descripcion_linea:'Importe conjunto sin reparto entre contenidos.',precio_unitario:0,precio_no_desglosado:true,precio_total_personalizado:contract.importe_total_bi_contrato,modo_precio:'personalizado',linea_snapshot:{importe_global:true,importe_desconocido:contract.importe_total_bi_contrato==null}});
 const invoices=tables.administracion_facturas_clientes.filter(f=>f.id_contrato===contract.id_contrato);contract.id_factura=invoices[0]?.id_factura_cliente||null;
}
for(const [table,key] of [['tesoreria_ordenes','id_orden'],['produccion_contenidos','id_contenido'],['tesoreria_recibos_importados','numero_recibo']])if(new Set(tables[table].map(r=>r[key])).size!==tables[table].length)throw Error('Duplicados sin resolver: '+table);
const output={decisionsDigest,excludedOrders,tables,warnings,requiresApproval:{provisionalAccounts:tables.comercial_cuentas.map(r=>({code:r.id_edisoft,name:r.nombre_empresa})),inconsistentAmounts:warnings},totals:Object.fromEntries(Object.entries(tables).map(([t,r])=>[t,r.length]))};
fs.writeFileSync(path.join(folder,'prepared-import.json'),JSON.stringify(output,null,2));
console.log(JSON.stringify({totals:output.totals,warnings,provisionalAccounts:tables.comercial_cuentas.length},null,2));
