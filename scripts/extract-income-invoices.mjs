import env from '@next/env';import fs from 'node:fs/promises';import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());const pool=getPgPool();
const pdf=await import('file:///C:/Users/frank/Downloads/p3erp-pdf-tools/node_modules/pdfjs-dist/legacy/build/pdf.mjs');
try{const accounts=(await pool.query("SELECT id_cuenta,nombre_empresa,nombre_fiscal FROM comercial_cuentas WHERE id_cuenta IN ('ACC2496','ACC6','ACC1878')")).rows;console.log(JSON.stringify({accounts}));
for(const f of (await pool.query("SELECT id_factura_cliente,nombre,contenido FROM administracion_facturas_documentos WHERE id_factura_cliente IN ('526051','526096','526138','526015','526114') AND nombre NOT LIKE '%RECIBO%'")).rows){const target='C:/Users/frank/Downloads/p3erp-cierre-bancos-20261009/'+f.nombre;await fs.writeFile(target,f.contenido);const d=await pdf.getDocument({data:new Uint8Array(f.contenido)}).promise;const pages=[];for(let i=1;i<=d.numPages;i++){const p=await d.getPage(i);const t=await p.getTextContent();pages.push(t.items.map(x=>x.str).join(' '));}console.log(JSON.stringify({invoice:f.id_factura_cliente,file:f.nombre,text:pages}));}}
finally{await pool.end();}
