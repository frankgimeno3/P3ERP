import env from '@next/env';
import fs from 'node:fs/promises';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());
const p=getPgPool();
try {
 const documents=(await p.query("SELECT id_factura_cliente,nombre,contenido FROM administracion_facturas_documentos WHERE id_factura_cliente IN('525116','526116')")).rows;
 const pdf=await import('pdfjs-dist/legacy/build/pdf.mjs');
 for(const f of documents){
  const d=await pdf.getDocument({data:new Uint8Array(f.contenido)}).promise;
  const text=[];for(let i=1;i<=d.numPages;i++)text.push((await (await d.getPage(i)).getTextContent()).items.map(x=>x.str).join(' '));
  await fs.writeFile('C:/Users/frank/Downloads/p3erp-identificadores-20261009/'+f.nombre,f.contenido);
  console.log(JSON.stringify({invoice:f.id_factura_cliente,file:f.nombre,text}));
 }
 console.log(JSON.stringify({documents:documents.length,receipts:(await p.query("SELECT * FROM tesoreria_recibos_importados WHERE numero_factura IN('525116','526116')")).rows,bank:(await p.query("SELECT id_linea_banco,importe,estado_revision,id_orden,concepto FROM tesoreria_movimientos_bancarios WHERE id_orden IN('C26.000.106-1/1','ord_fac_reg_1f9faa8356923f48239d0299')")).rows}));
}finally{await p.end();}
