import { fingerprint, generateOccurrences, ruleStart } from '../banco/BankReviewAnalysis.js';

export const todayInSpain = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date());
export function horizon(today) {
  const d = new Date(`${today}T00:00:00Z`);
  const year = d.getUTCFullYear() + 2, month = d.getUTCMonth();
  return new Date(Date.UTC(year, month, Math.min(d.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate()))).toISOString().slice(0, 10);
}
export function withStart(rule, today) {
  if (ruleStart(rule)) return rule;
  const [year, month, day] = today.split('-');
  return { ...rule, inicio_dia: day, inicio_mes: month, inicio_anio: year };
}
export function planNext(charge, existing, today, until = horizon(today)) {
  if (!['proveedor','otro'].includes(charge.tipo_cargo) || charge.activo === false || charge.termina_planificacion && charge.planificado_hasta) return [];
  if (charge.tipo_programacion === 'fechas') return generateOccurrences([charge], today, until).occurrences.filter(o => !existing.some(e => e.id === o.id));
  const result = [];
  for (const rule of charge.programacion) {
    const prior = existing.filter(o => o.id_regla === rule.id_regla && rule.importes_por_fecha?.[o.fecha]===undefined).sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1);
    const start = ruleStart(rule);
    let date = prior?.fecha || start;
    if (!date) throw new Error('La periodicidad necesita una fecha de primer vencimiento.');
    const advance = value => {
      const d = new Date(`${value}T00:00:00Z`), every = Number(rule.cada);
      if (rule.unidad === 'meses') {
        const month = d.getUTCMonth() + every;
        return new Date(Date.UTC(d.getUTCFullYear(), month, Math.min(Number(start.slice(8)), new Date(Date.UTC(d.getUTCFullYear(), month + 1, 0)).getUTCDate()))).toISOString().slice(0, 10);
      }
      d.setUTCDate(d.getUTCDate() + every * (rule.unidad === 'semanas' ? 7 : 1));
      return d.toISOString().slice(0, 10);
    };
    if (prior) date = advance(date);
    for (let count = 0; date <= until; count++, date = advance(date)) {
      if (count > 40000) throw new Error('La programación excede el límite de vencimientos.');
      const importe=Number(rule.importes_por_fecha?.[date]??rule.total_iva);
      if(importe>0)result.push({ id: fingerprint([String(charge.id_cargo_recurrente), rule.id_regla, date]), id_cargo_recurrente: String(charge.id_cargo_recurrente), id_regla: rule.id_regla, fecha: date, importe, descripcion: rule.descripcion || 'Cargo previsto', programacion: { tipo: charge.tipo_programacion, regla: rule } });
    }
    for(const [extra,amount] of Object.entries(rule.importes_por_fecha||{}))if(extra<=until&&Number(amount)>0&&!result.some(d=>d.id_regla===rule.id_regla&&d.fecha===extra)&&!existing.some(d=>d.id_regla===rule.id_regla&&d.fecha===extra))result.push({id:fingerprint([String(charge.id_cargo_recurrente),rule.id_regla,extra]),id_cargo_recurrente:String(charge.id_cargo_recurrente),id_regla:rule.id_regla,fecha:extra,importe:Number(amount),descripcion:rule.descripcion||'Cargo previsto',programacion:{tipo:charge.tipo_programacion,regla:rule}});
  }
  return result.filter(d=>!existing.some(e=>e.id===d.id));
}
export async function extendCharge(db, charge, today = todayInSpain(), rebuild = false, until = horizon(today)) {
  if (!['proveedor','otro'].includes(charge.tipo_cargo) || charge.termina_planificacion && charge.planificado_hasta) return 0;
  const existing = (await db.query("SELECT *,to_char(fecha,'YYYY-MM-DD') fecha FROM tesoreria_cargos_vencimientos WHERE id_cargo_recurrente=$1", [charge.id_cargo_recurrente])).rows;
  const planned = planNext(charge, rebuild ? [] : existing, today, until);
  let inserted = 0;
  for (const o of planned) inserted += (await db.query(`INSERT INTO tesoreria_cargos_vencimientos(id,id_cargo_recurrente,id_regla,fecha,importe,descripcion,programacion) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT DO NOTHING`, [o.id, o.id_cargo_recurrente, o.id_regla, o.fecha, o.importe, o.descripcion, JSON.stringify(o.programacion)])).rowCount;
  await db.query('UPDATE tesoreria_cargos_recurrentes SET planificado_hasta=GREATEST(planificado_hasta,$2::date),updated_at=now() WHERE id_cargo_recurrente=$1', [charge.id_cargo_recurrente, until]);
  return inserted;
}
