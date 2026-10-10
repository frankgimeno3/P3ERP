import env from '@next/env';
import fs from 'node:fs/promises';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());
const pdf=await import('file:///C:/Users/frank/Downloads/p3erp-pdf-tools/node_modules/pdfjs-dist/legacy/build/pdf.mjs');
const document=await pdf.getDocument({data:new Uint8Array(await fs.readFile('C:/Users/frank/OneDrive/Escritorio/CASP 50 GARAJE DERRAMA ADECUACIONES MANTENIMIENTO, VADO PERMANENTE Y PROYECTO.pdf')),useSystemFonts:true}).promise;
for(let i=1;i<=document.numPages;i++){const page=await document.getPage(i);const content=await page.getTextContent();console.log(JSON.stringify({page:i,items:content.items.map(x=>({text:x.str,x:x.transform[4],y:x.transform[5]}))}));}
const pool=getPgPool();
try {
 const data={};
 for(const [name,sql] of Object.entries({
  pending:`SELECT * FROM tesoreria_movimientos_bancarios WHERE NOT estado_revision AND NOT COALESCE(duplicado_descartado,false) AND importe>0 ORDER BY fecha_operativa`,
  accounts:`SELECT * FROM comercial_cuentas WHERE nombre_empresa ~* 'mediate|handm|h.m.|almeida|proven|provenç|casp|mavhi|tecno|hanjiang|diamon|fds|tung|mazzar'`,
  providers:`SELECT * FROM administracion_proveedores WHERE nombre_proveedor ~* 'proven|casp'`,
  historic:`SELECT * FROM tesoreria_movimientos_bancarios WHERE concepto ~* 'proven|casp|mediate|handm|almeida|paypal|remesa' ORDER BY fecha_operativa`,
  orders:`SELECT o.*,COALESCE(NULLIF(o.id_cuenta,''),c.id_cuenta_contrato,f.id_cuenta) account,f.numero_factura,f.fecha_factura,f.importe_total invoice_total,(SELECT jsonb_agg(a) FROM tesoreria_aplicaciones_cobro a WHERE a.id_orden=o.id_orden) applications FROM tesoreria_ordenes o LEFT JOIN comercial_contratos c USING(id_contrato) LEFT JOIN administracion_facturas_clientes f ON f.id_factura_cliente=o.id_factura`,
  charges:`SELECT * FROM tesoreria_cargos_recurrentes`,
  receipts:`SELECT * FROM tesoreria_recibos_importados`
 })) data[name]=(await pool.query(sql)).rows;
 await fs.writeFile('C:/Users/frank/Downloads/p3erp-cierre-bancos-20261009/income-and-casp-evidence.json',JSON.stringify(data,null,2));
 console.log(JSON.stringify({pending:data.pending.map(x=>({id:x.id_linea_banco,amount:x.importe,date:x.fecha_operativa,concept:x.concepto})),accounts:data.accounts.map(x=>({id:x.id_cuenta,name:x.nombre_empresa})),providers:data.providers,historic:data.historic.filter(x=>/proven|casp/i.test(x.concepto)),charges:data.charges.filter(x=>/proven|casp/i.test(JSON.stringify(x)))}));
}finally{await pool.end();}
