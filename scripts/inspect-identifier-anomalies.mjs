import env from '@next/env';import fs from 'node:fs/promises';import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());const p=getPgPool(),dir='C:/Users/frank/Downloads/p3erp-identificadores-20261009';
try{
 const orders=(await p.query("SELECT * FROM tesoreria_ordenes WHERE id_orden!~'^C[0-9]{2}\\.[0-9]{3}\\.[0-9]{3}-[0-9]+/[0-9]+$' ORDER BY id_factura,id_orden")).rows;
 const accounts=(await p.query("SELECT * FROM comercial_cuentas WHERE id_cuenta!~'^ACC[0-9]+$' ORDER BY id_cuenta")).rows;
 const invoices=(await p.query("SELECT * FROM administracion_facturas_clientes WHERE id_factura_cliente LIKE 'fac_excel_%'")).rows;
 const agents=(await p.query('SELECT id_agente,nombre_completo_agente,created_at,rol_agente FROM agentes_db ORDER BY id_agente')).rows;
 const providers=(await p.query("SELECT id_proveedor,nombre_proveedor,created_at FROM administracion_proveedores WHERE id_proveedor LIKE 'prov_demo_%'")).rows;
 const orderSource=(await p.query("SELECT id_orden,id_factura,datos_importacion FROM tesoreria_ordenes WHERE id_factura='526116' OR datos_importacion::text LIKE '%526116%'")).rows;
 await fs.writeFile(dir+'/anomalies.json',JSON.stringify({orders,accounts,invoices,agents,providers,orderSource},null,2));
 console.log(JSON.stringify({counts:{orders:orders.length,accounts:accounts.length,invoices:invoices.length},accounts:accounts.map(a=>({id:a.id_cuenta,name:a.nombre_empresa,edisoft:a.id_edisoft,crm:a.datos_comerciales})),mecal:orderSource,providers,agents,orders:orders.map(o=>({id:o.id_orden,invoice:o.id_factura,contract:o.id_contrato,ordinal:o.numero_cobro,amount:o.cobro_total,cancelled:o.cancelada,original:o.datos_importacion?.original?.ORDEN,year:o.datos_importacion?.original?.['FECHA FIRMA CONTRATO']}))}));
}finally{await p.end();}
