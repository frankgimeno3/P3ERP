import env from '@next/env';
import fs from 'node:fs/promises';
import {getPgPool} from '../server/database/pgClient.js';
import {contractOrderIdentifier} from '../server/features/identifiers/BusinessIdentifiers.js';
env.loadEnvConfig(process.cwd());const p=getPgPool();
try {
 const orders=(await p.query('SELECT id_orden,id_contrato,id_factura,numero_cobro,cobro_total,cobrada,cancelada,datos_importacion FROM tesoreria_ordenes ORDER BY id_orden')).rows;
 const ids=new Set(orders.map(o=>o.id_orden)),safe=[],unresolved=[];
 for(const o of orders){
  if(/^C\d{2}\.\d{3}\.\d{3}-\d+\/\d+$/.test(o.id_orden))continue;
  if(!o.id_contrato){unresolved.push({id:o.id_orden,invoice:o.id_factura,reason:'Sin contrato: falta elegir serie',amount:o.cobro_total});continue;}
  const related=orders.filter(x=>x.id_contrato===o.id_contrato);
  const total=Math.max(...related.map(x=>Number(x.numero_cobro)||1),...related.map(x=>Number(x.id_orden.match(/\/(\d+)$/)?.[1])||1));
  const n=Number(o.numero_cobro),target=contractOrderIdentifier(o.id_contrato,n,total);
  const same=related.filter(x=>Number(x.numero_cobro)===n);
  if(ids.has(target)||same.length>1){unresolved.push({id:o.id_orden,invoice:o.id_factura,contract:o.id_contrato,amount:o.cobro_total,reason:'Coincide el número de cobro',candidates:same.map(x=>({id:x.id_orden,invoice:x.id_factura,amount:x.cobro_total,cancelled:x.cancelada}))});continue;}
  safe.push({entity:'orden',table:'tesoreria_ordenes',column:'id_orden',old:o.id_orden,new:target});ids.add(target);
 }
 await fs.writeFile('C:/Users/frank/Downloads/p3erp-identificadores-20261009/order-plan.json',JSON.stringify({safe,unresolved},null,2));
 console.log(JSON.stringify({mismatches:orders.filter(o=>/^C[0-9]{2}\./.test(o.id_orden)&&o.id_contrato&&o.id_orden.split('-')[0]!==o.id_contrato).map(o=>({id:o.id_orden,contract:o.id_contrato,invoice:o.id_factura,n:o.numero_cobro,original:o.datos_importacion?.original})),safe,conflicts:unresolved.filter(o=>o.candidates),withoutContract:unresolved.filter(o=>!o.candidates).length}));
}finally{await p.end();}
