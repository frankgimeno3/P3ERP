import env from '@next/env';
import fs from 'node:fs/promises';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());
const p=getPgPool(),report={};
try {
 report.mecal=(await p.query("SELECT * FROM tesoreria_ordenes WHERE id_contrato='C26.000.106' OR id_factura IN('525116','526116')")).rows;
 report.invoices=(await p.query("SELECT * FROM administracion_facturas_clientes WHERE numero_factura IN('525116','526116')")).rows;
 report.contents=(await p.query("SELECT * FROM produccion_contenidos WHERE id_contenido LIKE 'content_%' OR id_contenido LIKE '%~fila%'")).rows;
 report.providerLinks=[];
 const columns=(await p.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND column_name IN('id_proveedor','id_proveedor_factura')")).rows;
 for(const c of columns)report.providerLinks.push({...c,rows:(await p.query(`SELECT * FROM "${c.table_name}" WHERE "${c.column_name}" LIKE 'prov_demo_%'`)).rows});
 report.accounts=(await p.query("SELECT id_cuenta,nombre_empresa,id_edisoft FROM comercial_cuentas WHERE id_edisoft IN('68807','68644','68671')")).rows;
 await fs.writeFile('C:/Users/frank/Downloads/p3erp-identificadores-20261009/links.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({mecal:report.mecal.map(o=>({id:o.id_orden,invoice:o.id_factura,paid:o.cobrada,cancelled:o.cancelada,amount:o.cobro_total})),invoices:report.invoices.map(f=>({id:f.id_factura_cliente,contract:f.id_contrato,amount:f.importe_total})),contents:report.contents.map(c=>({id:c.id_contenido,name:c.nombre_contenido,contract:c.id_contrato,account:c.id_cuenta})),providerLinks:report.providerLinks.map(c=>({table:c.table_name,count:c.rows.length})),accounts:report.accounts}));
}finally{await p.end();}
