import { getPgPool } from '../../database/pgClient.js';
import { parseImportDate } from './ReceiptExcel.js';

export async function getLiquidityForecast(date, pool=getPgPool()) {
  const until=parseImportDate(date);
  if (!until) throw new Error('Indica una fecha válida');
  const {rows}=await pool.query(`
   WITH bancos AS (SELECT unnest(ARRAY['Sabadell','Santander']) banco),
   saldos AS (
    SELECT DISTINCT ON (banco) banco, COALESCE(saldo,0) saldo
    FROM tesoreria_movimientos_bancarios ORDER BY banco, id_linea_banco DESC
   ), ingresos AS (
    SELECT COALESCE(NULLIF(banco_cobro,''),'Sabadell') banco, SUM(COALESCE(cobro_total,0)) importe FROM tesoreria_ordenes
    WHERE NOT COALESCE(cobrada,false) AND p3_income_date(fecha_teorica_cobro) BETWEEN CURRENT_DATE AND p3_income_date($1) GROUP BY 1
   ), gastos AS (
    SELECT COALESCE(cuenta_pago,'Sabadell') banco, SUM(COALESCE(total_pago,0)) importe FROM tesoreria_pagos_previstos
    WHERE p3_income_date(fecha_pago) BETWEEN CURRENT_DATE AND p3_income_date($1) GROUP BY 1
   )
   SELECT b.banco, COALESCE(s.saldo,0)+COALESCE(i.importe,0)-COALESCE(g.importe,0) total FROM bancos b LEFT JOIN saldos s USING(banco) LEFT JOIN ingresos i USING(banco) LEFT JOIN gastos g USING(banco)
  `,[until]);
  return Object.fromEntries(rows.map(r=>[r.banco,Number(r.total)]));
}
