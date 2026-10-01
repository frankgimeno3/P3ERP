import { getPgPool } from '../../database/pgClient.js';
import { parseImportDate } from './ReceiptExcel.js';
import { cents, generateOccurrences, ruleStart } from '../banco/BankReviewAnalysis.js';
import { cardLiquidity } from '../proveedor/CardSettlementRepository.js';
const bank = value => ['Sabadell','Santander'].includes(value) ? value : 'Sin asignar';

// Actual payroll replaces its employee/month estimate. Paid advances are deducted once.
export function forecastPayroll(charges, payrolls, advances, from, until) {
  const periods = new Map();
  for (const charge of charges) {
    const programacion = charge.programacion.map(rule => {
      if (ruleStart(rule)) return rule;
      const [year,month] = new Date(charge.created_at).toISOString().slice(0,7).split('-').map(Number);
      return {...rule,estimateMonthEnd:rule.unidad==='meses',inicio_dia:new Date(Date.UTC(year,month,0)).getUTCDate(),inicio_mes:month,inicio_anio:year};
    });
    for (const due of generateOccurrences([{...charge,tipo_cargo:'otro',programacion}],from.slice(0,7)+'-01',until).occurrences) {
      if(due.programacion.regla.estimateMonthEnd) {const [y,m]=due.fecha.split('-').map(Number);due.fecha=new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);}
      if(due.fecha<from || due.fecha>until)continue;
      const key = `${charge.id_agente}:${due.fecha.slice(0,7)}`;
      const prior = periods.get(key);
      periods.set(key,{employee:charge.id_agente,month:due.fecha.slice(0,7),amount:(prior?.amount || 0)+cents(due.importe),bank:bank(charge.banco_pago)});
    }
  }
  for (const payroll of payrolls) {
    const month = `${payroll.anio}-${String(payroll.mes).padStart(2,'0')}`;
    const key = `${payroll.id_empleado}:${month}`;
    const due = new Date(Date.UTC(Number(payroll.anio),Number(payroll.mes),0)).toISOString().slice(0,10);
    if (!periods.has(key) && (due < from || due > until)) continue;
    periods.set(key,{employee:payroll.id_empleado,month,amount:payroll.estado==='pagado'?0:cents(payroll.importe_neto),bank:periods.get(key)?.bank || bank(charges.find(c=>c.id_agente===payroll.id_empleado)?.banco_pago)});
  }
  return [...periods.values()].map(period=>({...period,amount:Math.max(0,period.amount-advances.filter(a=>a.id_empleado===period.employee && `${a.anio}-${String(a.mes).padStart(2,'0')}`===period.month && a.estado==='pagado').reduce((sum,a)=>sum+cents(a.importe_neto),0))/100}));
}

export async function getLiquidityForecast(date, pool=getPgPool()) {
  const until=parseImportDate(date);
  if (!until) throw new Error('Indica una fecha valida');
  const {rows}=await pool.query(`
   WITH limits AS (SELECT (now() AT TIME ZONE 'Europe/Madrid')::date today,p3_income_date($1) until),
   bancos AS (SELECT unnest(ARRAY['Sabadell','Santander','Sin asignar']) banco),
   saldos AS (
    SELECT DISTINCT ON (banco) banco, COALESCE(saldo,0) saldo
    FROM tesoreria_movimientos_bancarios
    ORDER BY banco,COALESCE(p3_income_date(fecha_operativa),p3_income_date(fecha_valor)) DESC NULLS LAST,id_linea_banco DESC
   ), ingresos AS (
    SELECT CASE WHEN banco_cobro IN ('Sabadell','Santander') THEN banco_cobro ELSE 'Sin asignar' END banco,
      SUM(GREATEST(0,COALESCE(cobro_total,0)-COALESCE((SELECT sum(a.importe) FROM tesoreria_aplicaciones_cobro a JOIN tesoreria_movimientos_bancarios m USING(id_linea_banco) WHERE a.id_orden=o.id_orden AND m.estado_revision),0))) importe
    FROM tesoreria_ordenes o,limits
    WHERE NOT cancelada AND NOT COALESCE(cobrada,false) AND p3_income_date(fecha_teorica_cobro) BETWEEN today AND until GROUP BY 1
   ), pagos AS (
    SELECT CASE WHEN cuenta_pago IN ('Sabadell','Santander') THEN cuenta_pago ELSE 'Sin asignar' END banco,
      GREATEST(0,COALESCE(total_pago,0)-COALESCE((SELECT sum(abs(m.importe)) FROM tesoreria_movimientos_bancarios m WHERE m.id_pago=p.id_pago AND m.importe<0),0)) importe
    FROM tesoreria_pagos_previstos p,limits WHERE p3_income_date(fecha_pago) BETWEEN today AND until
   ), vencimientos AS (
    SELECT COALESCE(c.banco_pago,'Sin asignar') banco,
      GREATEST(0,v.importe-COALESCE((SELECT sum(a.importe) FROM tesoreria_vencimientos_aplicaciones a JOIN tesoreria_movimientos_bancarios m USING(id_linea_banco) WHERE a.id_vencimiento=v.id AND m.id_cargo_recurrente=v.id_cargo_recurrente AND m.importe<0),0)) importe
    FROM tesoreria_cargos_vencimientos v JOIN tesoreria_cargos_recurrentes c USING(id_cargo_recurrente),limits
    WHERE c.activo AND c.id_tarjeta IS NULL AND c.tipo_cargo IN ('proveedor','otro') AND v.fecha BETWEEN today AND until
   ), gastos AS (SELECT banco,sum(importe) importe FROM (SELECT * FROM pagos UNION ALL SELECT * FROM vencimientos) g GROUP BY banco)
   SELECT b.banco,COALESCE(s.saldo,0)+COALESCE(i.importe,0)-COALESCE(g.importe,0) total,
     to_char(l.today,'YYYY-MM-DD') today,to_char(l.until,'YYYY-MM-DD') until
   FROM bancos b CROSS JOIN limits l LEFT JOIN saldos s USING(banco) LEFT JOIN ingresos i USING(banco) LEFT JOIN gastos g USING(banco)
  `,[until]);
  const snapshot=(await pool.query(`SELECT
    (SELECT COALESCE(jsonb_agg(c),'[]'::jsonb) FROM tesoreria_cargos_recurrentes c WHERE activo AND tipo_cargo='nomina') charges,
    (SELECT COALESCE(jsonb_agg(n),'[]'::jsonb) FROM laboral_nominas n) payrolls,
    (SELECT COALESCE(jsonb_agg(a),'[]'::jsonb) FROM laboral_anticipos a WHERE estado='pagado') advances,
    (SELECT count(*)::int FROM tesoreria_movimientos_bancarios m JOIN tesoreria_cargos_recurrentes c USING(id_cargo_recurrente)
      WHERE c.activo AND c.tipo_cargo IN ('proveedor','otro') AND m.importe<0 AND NOT EXISTS(SELECT 1 FROM tesoreria_vencimientos_aplicaciones a WHERE a.id_linea_banco=m.id_linea_banco)) unapplied,
    (SELECT count(*)::int FROM tesoreria_cargos_recurrentes c WHERE c.activo AND c.tipo_cargo IN ('proveedor','otro') AND NOT c.termina_planificacion AND (c.planificado_hasta IS NULL OR c.planificado_hasta<p3_income_date($1))) incomplete`,[until])).rows[0];
  const result=Object.fromEntries(rows.map(r=>[r.banco,Number(r.total)]));
  const cards=await cardLiquidity(rows[0].today,rows[0].until,pool);
  for(const [name,amount] of Object.entries(cards))result[name]-=amount;
  for(const payroll of forecastPayroll(snapshot.charges,snapshot.payrolls,snapshot.advances,rows[0].today,rows[0].until)) result[payroll.bank]-=payroll.amount;
  return {...result,total:Math.round(Object.values(result).reduce((sum,n)=>sum+n,0)*100)/100,
    avisos:[...(snapshot.unapplied ? [`${snapshot.unapplied} movimientos asociados a cargos no tienen vencimiento aplicado. Sus previsiones siguen pendientes hasta indicar qué vencimiento pagan en Conciliación.`] : []),...(snapshot.incomplete ? [`${snapshot.incomplete} cargos no tienen planificación completa hasta la fecha elegida. Genera sus vencimientos o revisa su programación.`] : [])]};
}
