import fs from 'node:fs';
import path from 'node:path';
import {parseImportDate} from '../server/features/prevision/ReceiptExcel.js';
const folder=path.join(process.env.USERPROFILE,'Downloads/updates/revision-tesoreria-20261003'),read=n=>JSON.parse(fs.readFileSync(path.join(folder,n+'.json'),'utf8'));
const source=read('sources'),before=read('before'),schema=read('schema');
const text=v=>String(v??'').trim(),norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''),cents=v=>Math.round(Number(v||0)*100);
const rows=matrix=>matrix.slice(1).map((r,i)=>({sourceRow:i+2,...Object.fromEntries(matrix[0].map((h,j)=>[text(h),r[j]??'']))})).filter(r=>Object.entries(r).some(([k,v])=>k!=='sourceRow'&&text(v)));
const date=v=>{if(!text(v)||text(v)==='-')return '';try{return parseImportDate(v);}catch{return '';}};
const admin=rows(source['Control ADMINISTRATIVO.xlsx'].sheets['COBROS y CONTRATOS ']).filter(r=>text(r.ORDEN));
const production=['PublicaciónEn2026','Anteriores'].flatMap(sheet=>rows(source['Hoja de produccion.xlsx'].sheets[sheet]).filter(r=>text(r.IDENTIFICADOR)).map(r=>({...r,sheet})));
let decisions={accountOverrides:{},productionNameMatches:{}};const oldDecisions=path.join(process.env.USERPROFILE,'OneDrive/Escritorio/importacion-administracion-produccion-20260920/user-decisions.json');if(fs.existsSync(oldDecisions))decisions=JSON.parse(fs.readFileSync(oldDecisions,'utf8'));
const accountMatches=(r,existing)=>{const override=decisions.accountOverrides?.[text(r['CODIGO CRM'])]||decisions.productionNameMatches?.[text(r['CODIGO CRM'])];const candidates=before.comercial_cuentas.filter(a=>override?a.id_cuenta===override:text(a.id_edisoft)===text(r['CODIGO CRM']));if(candidates.length===1)return candidates;if(existing?.id_cuenta)return before.comercial_cuentas.filter(a=>a.id_cuenta===existing.id_cuenta);return before.comercial_cuentas.filter(a=>norm(a.nombre_empresa)===norm(r.CLIENTE));};
const orderPlans=[],issues=[];
for(const r of admin){
 const code=text(r.ORDEN),invoice=text(r.FACTURA),crm=text(r['CODIGO CRM']);
 let matches=before.tesoreria_ordenes.filter(o=>o.id_orden===code);
 if(!matches.length)matches=before.tesoreria_ordenes.filter(o=>{const prev=o.datos_importacion?.original;return prev&&text(prev.ORDEN)===code&&text(prev['CODIGO CRM'])===crm&&text(prev.FACTURA)===invoice&&text(prev['Nº RECIBO'])===text(r['Nº RECIBO'])&&date(prev['FECHA DE COBRO PREVISTA']||prev['FECHA DE COBRO ORDEN segun factura'])===date(r['FECHA DE COBRO PREVISTA']||r['FECHA DE COBRO ORDEN segun factura']);});
 if(matches.length>1){issues.push({type:'order_identity',row:r.sourceRow,code,matches:matches.map(o=>o.id_orden)});continue;}
 const existing=matches[0];if(!existing&&code.startsWith(decisions.omitIncidentOrdersStartingWith||'__none__')){issues.push({type:'previously_excluded',row:r.sourceRow,code});continue;}const accounts=accountMatches(r,existing);
 if(accounts.length!==1){issues.push({type:'account',row:r.sourceRow,code,crm,client:r.CLIENTE,matches:accounts.map(a=>a.id_cuenta)});continue;}
 const total=Number(r['IMPORTE CON IVA']),method=/TRANSF/i.test(text(r['FORMA DE COBRO']))?'transferencia':text(r['FORMA DE COBRO']).toLowerCase(),bank=/recibo|remesa/i.test(method)?'Sabadell':/SAN/i.test(text(r['FORMA DE COBRO']))?'Santander':/SAB/i.test(text(r['FORMA DE COBRO']))?'Sabadell':existing?.banco_cobro||null;
 const contract=/^C\d{2}\.\d{3}\.\d{3}$/.test(text(r['CONTRATO ASOCIADO']))?text(r['CONTRATO ASOCIADO']):null;
 const data={id_orden:existing?.id_orden||(/^C\d{2}\.\d{3}\.\d{3}-.+$/.test(code)?code:`${code}~fila${r.sourceRow}`),id_cuenta:accounts[0].id_cuenta,id_contrato:contract,invoice:/^(\d+|P\d+)$/.test(invoice)?invoice:null,cobro_total:total,forma_cobro:method,banco_cobro:bank,fecha_teorica_cobro:date(r['FECHA DE COBRO PREVISTA'])||date(r['FECHA DE COBRO ORDEN segun factura']),source_paid:/^cobrada$/i.test(text(r.ESTADO)),source_cancelled:/anulad/i.test(text(r.ESTADO)),raw:r};
 const changes=existing?['id_cuenta','id_contrato','cobro_total','forma_cobro','banco_cobro','fecha_teorica_cobro'].filter(k=>k==='cobro_total'?cents(existing[k])!==cents(data[k]):text(existing[k])!==text(data[k])):[];
 if(existing&&data.invoice!==text(existing.id_factura)&&data.invoice!==before.administracion_facturas_clientes.find(f=>f.id_factura_cliente===existing.id_factura)?.numero_factura)changes.push('invoice');
 if(existing&&existing.cobrada!==data.source_paid)changes.push('source_paid');
 orderPlans.push({action:existing?'update':'create',id:data.id_orden,changes,data,existing:existing?.id_orden});
}
const contentPlans=[];
for(const r of production){
 const id=text(r.IDENTIFICADOR),rawMatches=before.produccion_contenidos.filter(c=>c.id_contenido===id||text(c.datos_importacion?.original?.IDENTIFICADOR)===id);
 const matching=rawMatches.length>1?rawMatches.filter(c=>text(c.datos_importacion?.original?.['CODIGO CRM'])===text(r['CODIGO CRM'])&&text(c.publicacion_num_web)===text(r['PUBLICACION / Nº WEB']||r['PUBLICACION / Nº RICARDO'])):rawMatches;
 if(matching.length>1){issues.push({type:'content_identity',row:r.sourceRow,sheet:r.sheet,id});continue;}
 const existing=matching[0],accounts=accountMatches(r,existing);
 if(accounts.length!==1){issues.push({type:'content_account',row:r.sourceRow,sheet:r.sheet,id,crm:r['CODIGO CRM'],client:r.CLIENTE});continue;}
 const contract=/^C\d{2}\.\d{3}\.\d{3}$/.test(text(r.CONTRATO))?text(r.CONTRATO):null;
 const data={id_contenido:existing?.id_contenido||id,id_cuenta:accounts[0].id_cuenta,id_contrato:contract,ano_publicacion:r.sheet==='Anteriores'?'Anteriores':'2026',publicacion_num_web:text(r['PUBLICACION / Nº WEB']||r['PUBLICACION / Nº RICARDO']),tipo_revista_servicio:text(r['TIPO REVISTA / SERVICIO']),especificaciones_contenido:text(r['CONTENIDO/-']),anuncio_hoja:text(r.ANUNCIO),articulo_hoja:text(r.ARTICULO),estado_contenido:text(r.ESTADO),factura_hoja:text(r.FACTURA),pagina_hoja:text(r.PAGINA),caduca_web:date(r['CADUCA (web)']||r.CADUCA)||text(r['CADUCA (web)']||r.CADUCA),comentarios_hoja:text(r.Comentarios),raw:r};
 if(existing){for(const [key,header] of [['anuncio_hoja','ANUNCIO'],['articulo_hoja','ARTICULO']])if(!(header in r))data[key]=existing[key];}
 const changes=existing?Object.keys(data).filter(k=>!['raw','id_contenido'].includes(k)&&text(existing[k])!==text(data[k])):[];
 contentPlans.push({action:existing?'update':'create',id:data.id_contenido,changes,data});
}
const suppliers=Object.entries(source['CONTROL FACTURAS PROVEEDORES.xlsx'].sheets).flatMap(([sheet,matrix])=>matrix.length?rows(matrix).filter(r=>text(r['Orden Compra P3'])).map(r=>({...r,sheet})):[]);
const contracts=new Set([...orderPlans.map(p=>p.data.id_contrato),...contentPlans.map(p=>p.data.id_contrato)].filter(Boolean));
const newContracts=[...contracts].filter(id=>!before.comercial_contratos.some(c=>c.id_contrato===id));
const plan={hashes:Object.fromEntries(Object.entries(source).map(([k,v])=>[k,v.hash])),orderPlans,contentPlans,suppliers,newContracts,issues};fs.writeFileSync(path.join(folder,'update-plan.json'),JSON.stringify(plan));
console.log(JSON.stringify({sourceCounts:{admin:admin.length,production:production.length,suppliers:suppliers.length},orders:{matched:orderPlans.filter(p=>p.existing).length,new:orderPlans.filter(p=>!p.existing).length,changed:orderPlans.filter(p=>p.changes.length).length},contents:{matched:contentPlans.filter(p=>p.action==='update').length,new:contentPlans.filter(p=>p.action==='create').length,changed:contentPlans.filter(p=>p.changes.length).length},newContracts,issues,supplierColumns:schema.filter(c=>c.table_name==='administracion_facturas_proveedores').map(c=>c.column_name)},null,2));
