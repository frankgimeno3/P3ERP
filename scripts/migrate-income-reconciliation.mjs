import fs from 'node:fs';
import env from '@next/env';
import { getPgPool } from '../server/database/pgClient.js';
import { saveReceipt } from '../server/features/prevision/ReceiptImportRepository.js';
import { ensureAdditionalOrder } from '../server/features/prevision/PrevisionRepository.js';
import { ensureOrderReceipt, lockIncome, syncOrderCollections, syncInvoiceCollection } from '../server/features/prevision/IncomeReconciliation.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect();
try{
  await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'");await lockIncome(db);
  await db.query(fs.readFileSync('database/migrations/20260914_0002_income_reconciliation.sql','utf8'));
  const receipts=(await db.query('SELECT numero_recibo,numero_factura,numero_cobro,numero_remesa,remesa_en_carpeta,cliente,importe_recibo,importe_remesa,fecha_creacion,fecha_teorica FROM prevision_recibos_excel ORDER BY numero_recibo')).rows;
  for(const row of receipts){for(const key of ['numero_remesa','remesa_en_carpeta'])if(row[key]==='-')row[key]='';await saveReceipt(db,row,'');}
  for(const row of (await db.query('SELECT * FROM ingresos_adicionales_db ORDER BY id_ingreso_adicional')).rows)await ensureAdditionalOrder(db,row,'');
  const orders=(await db.query("SELECT id_orden FROM ordenes_db WHERE forma_cobro ILIKE '%recibo%' AND numero_cobro>0 ORDER BY id_orden")).rows;
  for(const order of orders)await ensureOrderReceipt(db,order.id_orden,'');
  await db.query(`INSERT INTO banco_cobros_ordenes(id_linea_banco,id_orden,id_remesa,importe)
    SELECT b.id_linea_banco,o.id_orden,r.id_remesa,b.importe FROM lineas_bancos b JOIN ordenes_db o ON o.id_orden=b.id_orden
    LEFT JOIN prevision_recibos_excel r ON r.id_orden=o.id_orden WHERE b.importe>0 ON CONFLICT DO NOTHING`);
  await db.query(`UPDATE lineas_bancos b SET tipo_ingreso=CASE WHEN r.id_remesa IS NOT NULL THEN 'remesa' WHEN o.forma_cobro ILIKE '%transf%' THEN 'transferencia' ELSE 'otro' END
    FROM ordenes_db o LEFT JOIN prevision_recibos_excel r ON r.id_orden=o.id_orden WHERE b.id_orden=o.id_orden AND b.importe>0 AND b.tipo_ingreso IS NULL`);
  const linked=(await db.query('SELECT DISTINCT id_orden FROM banco_cobros_ordenes')).rows;
  await syncOrderCollections(db,linked.map(r=>r.id_orden),'');
  await syncInvoiceCollection(db,(await db.query('SELECT DISTINCT id_factura FROM ordenes_db WHERE id_factura IS NOT NULL')).rows.map(r=>r.id_factura));
  await db.query('COMMIT');
  console.log('Income reconciliation applied. Existing receipts linked:',receipts.length,'; receipt orders checked:',orders.length,'; bank-linked orders synchronized:',linked.length);
}catch(error){await db.query('ROLLBACK');console.error(error.message);process.exitCode=1;}finally{db.release();await pool.end();}
