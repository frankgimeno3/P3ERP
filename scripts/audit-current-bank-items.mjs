// Read-only inventory; keeps the detailed review outside the repository.
import env from '@next/env';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {getPgPool} from '../server/database/pgClient.js';
import {getJuanWorkbook} from '../server/features/prevision/JuanRepository.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool();
try {
  const book=await getJuanWorkbook(pool,2026);
  const movements=(await pool.query(`SELECT m.*,p.nombre_proveedor,a.nombre_completo_agente,c.nombre_empresa
    FROM tesoreria_movimientos_bancarios m LEFT JOIN administracion_proveedores p USING(id_proveedor)
    LEFT JOIN agentes_db a USING(id_agente) LEFT JOIN comercial_cuentas c USING(id_cuenta)
    WHERE NOT estado_revision AND NOT COALESCE(duplicado_descartado,false)
    ORDER BY banco,p3_income_date(COALESCE(NULLIF(fecha_operativa,''),fecha_valor)),id_linea_banco`)).rows;
  const receipts=(await pool.query(`SELECT r.numero_recibo,r.cliente,r.importe_recibo,r.fecha_teorica,o.id_orden
    FROM tesoreria_recibos_importados r JOIN tesoreria_ordenes o USING(id_orden)
    WHERE NOT o.cancelada AND NOT o.cobrada AND r.id_remesa IS NULL
      AND NOT COALESCE((o.datos_importacion->'cierre_cobro'->>'activo')::boolean,false)
    ORDER BY p3_income_date(r.fecha_teorica),r.numero_recibo`)).rows;
  const missingMethods=book.orders.filter(o=>!o.forma_cobro?.trim());
  const unresolved=book.associations.filter(a=>a.evidence?.future?.length&&!['matched','integrated','group'].includes(a.status));
  const september=book.sheets.map((sheet,i)=>({bank:sheet.bank,juan:book.totals[i].balances[8]/100,
    statement:book.balances.find(b=>b.bank===sheet.bank&&b.month===9)||null}));
  const report={date:new Date().toISOString(),movements,receipts,missingMethods,unresolved,september,
    breakdown:Object.fromEntries(['cards','cash','transfers','other'].map(type=>[type,movements.filter(m=>{
      const s=m.concepto||'';
      return type==='cards'?/tarjeta|visa|mastercard/i.test(s):type==='cash'?/efectivo|cajero|retirada|reintegro|atm/i.test(s):type==='transfers'?/traspaso|entre cuentas|transferencia a proporcion3/i.test(s):!/tarjeta|visa|mastercard|efectivo|cajero|retirada|reintegro|atm|traspaso|entre cuentas|transferencia a proporcion3/i.test(s);
    }).map(m=>m.id_linea_banco)]))};
  const directory=path.join(process.env.USERPROFILE,'Downloads','p3erp-cierre-bancos-20261009');
  await mkdir(directory,{recursive:true});await writeFile(path.join(directory,'pending-current.json'),JSON.stringify(report,null,2));
  const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const money=value=>Number(value).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
  const table=(headers,rows)=>`<table><thead><tr>${headers.map(h=>`<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const groupNames={cards:'Tarjetas',cash:'Efectivo',transfers:'Posible traspaso propio',other:'Otros / asociación pendiente'};
  const html=`<!doctype html><html lang="es"><meta charset="utf-8"><title>P3ERP — pendientes actuales</title><style>body{font:15px system-ui;color:#172554;margin:36px auto;max-width:1280px;padding:0 24px}h1,h2{margin-top:32px}p{line-height:1.6}table{border-collapse:collapse;width:100%;font-size:13px;margin:18px 0 30px}td,th{padding:10px;border-bottom:1px solid #cbd5e1;text-align:left;vertical-align:top}th{background:#eff6ff}tr:nth-child(even){background:#f8fafc}</style><h1>P3ERP — revisión del 09/10/2026</h1>
    <p>Histórico de 2025 cerrado para gestión; FENZI: 22 € asumidos; cobro bancario real 439,06 € sobre factura de 462 €, con 0,94 € adicionales pendientes de decisión. MAZZAROPPI: se conservan 716,67 € el 20/10 y 716,67 € el 20/12. SIKA: 1.210 € pendientes; no hay evidencia bancaria de cobro.</p>
    <h2>Septiembre</h2>${table(['Banco','Realizado Juan','Saldo del extracto','Fecha'],september.map(s=>[s.bank,money(s.juan),s.statement?money(s.statement.saldo):'Sin extracto',s.statement?.date]))}
    <p>El recibo Vodafone de 74,97 € del 30/09 se incorporó al realizado de Juan. Se conserva el Excel original.</p>
    <h2>${movements.length} movimientos pendientes de revisión</h2><p>La clasificación siguiente orienta la revisión por el concepto del extracto. Las tarjetas necesitan su desglose; las retiradas acreditan efectivo retirado, cuyo uso requiere documentación. Los posibles traspasos propios necesitan la contrapartida.</p>
    ${table(['Referencia','Banco','Fecha','Importe','Grupo','Concepto'],movements.map(m=>[m.id_linea_banco,m.banco,m.fecha_operativa||m.fecha_valor,money(m.importe),Object.entries(report.breakdown).filter(([,ids])=>ids.includes(m.id_linea_banco)).map(([key])=>groupNames[key]).join(', '),m.concepto]))}
    <h2>${receipts.length} recibos registrados para remesar más adelante</h2><p>Es normal que un recibo registrado todavía no tenga remesa. Se agrupa por fecha al preparar el fichero para su envío al banco; no constituye un descuadre.</p>${table(['Recibo','Cliente','Importe','Vencimiento','Orden'],receipts.map(r=>[r.numero_recibo,r.cliente,money(r.importe_recibo),r.fecha_teorica||'Sin fecha',r.id_orden]))}
    <p>Formas de cobro pendientes en órdenes activas: ${missingMethods.length}. Asociaciones futuras de Juan sin resolver: ${unresolved.length}. La remesa agrupa los recibos; el cobro se confirma con evidencia bancaria.</p></html>`;
  await writeFile(path.join(directory,'revision.html'),html);
  console.log(JSON.stringify({movements:movements.length,receipts:receipts.length,missingMethods:missingMethods.length,
    unresolved:unresolved.map(a=>({bank:a.bank,row:a.row_id,status:a.status,label:a.evidence?.label,reason:a.evidence?.reason})),september,
    breakdown:Object.fromEntries(Object.entries(report.breakdown).map(([key,ids])=>[key,ids.length])),directory}));
} finally {await pool.end();}
