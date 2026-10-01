import { createHash } from 'node:crypto';

export const cents = value => Math.round(Number(value || 0) * 100);
const canonical = value => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
export const fingerprint = value => createHash('sha256').update(canonical(value)).digest('hex');
export function dateISO(value) {
  const text = String(value || '').slice(0, 10);
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  const iso = match ? `${match[3]}-${match[2]}-${match[1]}` : text;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const time = Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === iso ? iso : '';
}
const day = value => Date.parse(`${dateISO(value)}T00:00:00Z`) / 86400000;
export const lineDate = row => dateISO(row.fecha_operativa || row.fecha_valor);
export const ruleId = (charge, rule, index) => rule.id_regla || `legacy:${charge.id_cargo_recurrente}:${index}`;
export const withRuleIds = charge => ({ ...charge, programacion: (charge.programacion || []).map((rule, index) => ({ ...rule, id_regla: ruleId(charge, rule, index) })) });
export const ruleStart = rule => dateISO(`${String(rule.inicio_dia || '').padStart(2, '0')}/${String(rule.inicio_mes || '').padStart(2, '0')}/${rule.inicio_anio || ''}`);
// Remove only explicit receipt references and calendar information. Contract/local numbers survive.
export function conceptKey(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\b(?:referencia|ref|recibo n|recibo numero)\s*[.:#-]?\s*[a-z0-9/-]+/g, ' ')
    .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, ' ')
    .replace(/\b(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+20\d{2})?\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
const owner = row => row.id_proveedor || row.id_agente || row.id_cuenta || '';
export function coincidenceReasons(a, b) {
  const reasons = [];
  if (a.id_cargo_recurrente && String(a.id_cargo_recurrente) === String(b.id_cargo_recurrente)) reasons.push('Mismo cargo previsto');
  if (a.id_proveedor && a.id_proveedor === b.id_proveedor) reasons.push('Mismo proveedor');
  if (cents(a.importe) === cents(b.importe)) reasons.push('Mismo importe');
  const exact = value => String(value || '').trim().toLocaleLowerCase('es');
  if (exact(a.concepto) && exact(a.concepto) === exact(b.concepto)) reasons.push('Mismo concepto');
  else if (conceptKey(a.concepto) && conceptKey(a.concepto) === conceptKey(b.concepto)) reasons.push('Concepto coincidente al omitir fechas y referencias');
  const distance = Math.abs(day(lineDate(a)) - day(lineDate(b)));
  if (distance === 0) reasons.push('Misma fecha operativa');
  else if (distance <= 10) reasons.push(`Fechas próximas (${distance} ${distance===1?'día':'días'})`);
  return reasons;
}
function related(a, b) {
  if (Math.sign(Number(a.importe)) !== Math.sign(Number(b.importe))) return false;
  if (owner(a) && owner(b) && owner(a) !== owner(b)) return false;
  if (a.id_cargo_recurrente && String(a.id_cargo_recurrente) === String(b.id_cargo_recurrente)) return true;
  const key = conceptKey(a.concepto);
  return key.length >= 10 && key.split(' ').length >= 2 && key === conceptKey(b.concepto);
}
export function generateOccurrences(charges, from, to) {
  const result = [], notes = [];
  const first = day(from), last = day(to);
  for (const charge of charges.filter(c => c.activo !== false && c.tipo_cargo !== 'nomina')) {
    for (const [index, rule] of (charge.programacion || []).entries()) {
      const id = ruleId(charge, rule, index), dates = [];
      if (charge.tipo_programacion === 'fechas') {
        for (let year = Number(from.slice(0, 4)); year <= Number(to.slice(0, 4)); year++) {
          if (rule.anio && Number(rule.anio) !== year) continue;
          const iso = dateISO(`${String(rule.dia).padStart(2, '0')}/${String(rule.mes).padStart(2, '0')}/${year}`);
          if (iso) dates.push(iso);
        }
      } else {
        const start = ruleStart(rule), every = Number(rule.cada);
        if (!start) { notes.push({ chargeId: String(charge.id_cargo_recurrente), message: 'Periodicidad sin fecha de inicio: no se atribuyen periodos ni pagos pendientes automáticamente.' }); continue; }
        if (!Number.isInteger(every) || every < 1) continue;
        const anchor = new Date(`${start}T00:00:00Z`);
        const firstDate = new Date(`${from}T00:00:00Z`);
        const elapsed = rule.unidad === 'meses'
          ? (firstDate.getUTCFullYear()-anchor.getUTCFullYear())*12+firstDate.getUTCMonth()-anchor.getUTCMonth()
          : (first-day(start))/(rule.unidad === 'semanas' ? 7 : 1);
        const initial = Math.max(0,Math.floor(elapsed/every)-1);
        for (let n = initial; n < initial + 40000; n++) {
          let next;
          if (rule.unidad === 'meses') {
            const month = anchor.getUTCMonth() + n * every;
            const end = new Date(Date.UTC(anchor.getUTCFullYear(), month + 1, 0)).getUTCDate();
            next = new Date(Date.UTC(anchor.getUTCFullYear(), month, Math.min(anchor.getUTCDate(), end)));
          } else next = new Date(anchor.getTime() + n * every * (rule.unidad === 'semanas' ? 7 : 1) * 86400000);
          if (next.getTime() / 86400000 > last) break;
          if (next.getTime() / 86400000 >= first) dates.push(next.toISOString().slice(0, 10));
        }
      }
      for (const fecha of dates.filter(d => day(d) >= first && day(d) <= last)) {
        result.push({ id: fingerprint([String(charge.id_cargo_recurrente), id, fecha]), id_cargo_recurrente: String(charge.id_cargo_recurrente), id_regla: id, fecha, importe: Number(rule.total_iva), descripcion: rule.descripcion || 'Cargo previsto', programacion: { tipo: charge.tipo_programacion, regla: rule }, id_proveedor: charge.id_proveedor });
      }
    }
  }
  return { occurrences: result, notes };
}
export const lineEvidence = row => [row.id_linea_banco, lineDate(row), cents(row.importe), String(row.concepto || '').trim().toLowerCase(), owner(row), String(row.id_cargo_recurrente || ''), row.banco || ''];
export function analyzeBankReview({ lines, selectedIds, charges = [], storedOccurrences = [], applications = [], decisions = [], criteria = [], today = new Date().toISOString().slice(0, 10) }) {
  const selected = new Set(selectedIds), selectedLines = lines.filter(l => selected.has(l.id_linea_banco));
  const dates = selectedLines.map(lineDate).filter(Boolean).sort();
  const end = dates.at(-1) || today;
  const startDate = new Date(`${dates[0] || today}T00:00:00Z`); startDate.setUTCFullYear(startDate.getUTCFullYear() - 2);
  const from = startDate.toISOString().slice(0, 10);
  const extendedEnd = new Date(`${end}T00:00:00Z`); extendedEnd.setUTCMonth(extendedEnd.getUTCMonth() + 1);
  const generated = generateOccurrences(charges.filter(c => !c.planificado_hasta), from, extendedEnd.toISOString().slice(0, 10));
  const plannedCharges = new Set(charges.filter(c => c.planificado_hasta && c.activo !== false).map(c => String(c.id_cargo_recurrente)));
  generated.occurrences.push(...storedOccurrences.filter(o => plannedCharges.has(String(o.id_cargo_recurrente)) && charges.some(c => String(c.id_cargo_recurrente) === String(o.id_cargo_recurrente) && withRuleIds(c).programacion.some(r => r.id_regla === o.id_regla))).map(o => ({ ...o, fecha: dateISO(o.fecha) })));
  const relevantCharges = new Set(selectedLines.map(l => String(l.id_cargo_recurrente || '')).filter(Boolean));
  const currentIds = new Set(generated.occurrences.map(o => o.id));
  const byId = new Map(generated.occurrences.map(o => [o.id, o]));
  // Paid history retains its original forecast, even after a future price change.
  for (const o of storedOccurrences) if (applications.some(a => a.id_vencimiento === o.id)) byId.set(o.id, { ...o, fecha: dateISO(o.fecha), historical: true, orphaned: !currentIds.has(o.id) });
  const occurrences = [...byId.values()].filter(o => relevantCharges.has(String(o.id_cargo_recurrente)));
  const lineMap = new Map(lines.map(l => [l.id_linea_banco, l]));
  const validApplications = applications.filter(a => {
    const l = lineMap.get(a.id_linea_banco), o = byId.get(a.id_vencimiento);
    return l && o && Number(l.importe) < 0 && String(l.id_cargo_recurrente) === String(o.id_cargo_recurrente) && currentIds.has(o.id);
  });
  const allocations = id => validApplications.filter(a => a.id_linea_banco === id);
  const evidence = rows => ({ lines: rows.map(lineEvidence).sort((a, b) => a[0].localeCompare(b[0])), applications: rows.flatMap(l => allocations(l.id_linea_banco).map(a => [a.id_linea_banco, a.id_vencimiento, cents(a.importe)])).sort(), occurrences: [...new Set(rows.flatMap(l => allocations(l.id_linea_banco).map(a => a.id_vencimiento)))].sort().map(id => { const o = byId.get(id); return [id, o.fecha, cents(o.importe)]; }) });
  const alerts = [], history = [], resolved = [];
  const add = (type, rows, title, detail, extra = {}) => {
    const ids = rows.map(l => l.id_linea_banco).sort(), proof = { ...evidence(rows), ...extra };
    // A future schedule edit can invalidate a reusable rule, not a concrete historic acceptance.
    delete proof.reusable;
    const key = fingerprint([type, ids, extra.occurrenceId || '']);
    const alert = { key, fingerprint: fingerprint(proof), type, ids, title, detail, evidence: proof, ...extra };
    const decision = decisions.find(d => !d.revoked_at && d.clave === key && d.huella === alert.fingerprint);
    if (decision) resolved.push({ ...alert, reason: decision.motivo, decisionId: decision.id });
    else alerts.push(alert);
  };
  const pool = lines.filter(l => lineDate(l) >= from && lineDate(l) <= extendedEnd.toISOString().slice(0, 10));
  // Connected groups mean a third receipt creates new evidence, not another hidden accepted pair.
  const neighbors = new Map(pool.map(l => [l.id_linea_banco, new Set()]));
  for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
    const a = pool[i], b = pool[j];
    if (!related(a, b)) continue;
    const distance = Math.abs(day(lineDate(a)) - day(lineDate(b)));
    if (distance <= 10 && cents(a.importe) === cents(b.importe)) { neighbors.get(a.id_linea_banco).add(b.id_linea_banco); neighbors.get(b.id_linea_banco).add(a.id_linea_banco); }
    if ((selected.has(a.id_linea_banco) || selected.has(b.id_linea_banco)) && distance > 10) history.push({ ids: [a.id_linea_banco, b.id_linea_banco], detail: `${Math.round(distance)} días entre movimientos relacionados. No confirma por sí solo una periodicidad.` });
  }
  const visited = new Set();
  for (const line of pool) {
    if (visited.has(line.id_linea_banco)) continue;
    const stack = [line.id_linea_banco], ids = [];
    while (stack.length) { const id = stack.pop(); if (visited.has(id)) continue; visited.add(id); ids.push(id); stack.push(...neighbors.get(id)); }
    if (ids.length < 2 || !ids.some(id => selected.has(id))) continue;
    const rows = ids.map(id => lineMap.get(id));
    const full = rows.every(l => allocations(l.id_linea_banco).reduce((n, a) => n + cents(a.importe), 0) === Math.abs(cents(l.importe)));
    const used = rows.flatMap(l => allocations(l.id_linea_banco).map(a => a.id_vencimiento));
    if (full && new Set(used).size === used.length) { resolved.push({ ids, title: 'Recibos explicados por vencimientos distintos', reason: 'Cada movimiento tiene una aplicación completa a una obligación diferente.' }); continue; }
    // Legacy flags cover only flagged rows; a new member reopens the whole group.
    if (rows.every(l => decisions.some(d => d.tipo === 'legacy' && !d.revoked_at && d.movimientos.includes(l.id_linea_banco) && fingerprint(lineEvidence(d.evidencia)) === fingerprint(lineEvidence(l))))) { resolved.push({ ids, title: 'Descarte anterior de duplicados', reason: 'Decisión histórica sobre estos movimientos; no se aplica a futuros recibos.' }); continue; }
    const conditions = reusableConditions(rows, charges);
    const criterion = conditions && criteria.find(c => {
      const { validAfter, ...match } = c.condiciones;
      return !c.revoked_at && (!validAfter || rows.every(l=>lineDate(l)>validAfter)) && fingerprint(match) === fingerprint(conditions);
    });
    const before = alerts.length;
    add('repeat', rows, 'Posible cobro repetido', `${rows.length} movimientos relacionados con el mismo importe y próximos entre sí. Comprueba qué obligación paga cada uno.`, { reusable: conditions });
    if (criterion && alerts.length > before) {
      alerts.pop();
      resolved.push({ ids, title: 'Criterio anterior aplicado', reason: criterion.motivo || 'Mismos cargos, cantidades, importes y proximidad aceptados.', criterionId: criterion.id });
    }
  }
  for (const l of selectedLines.filter(l => Number(l.importe) < 0)) {
    const assigned = allocations(l.id_linea_banco);
    const total = assigned.reduce((n, a) => n + cents(a.importe), 0);
    if (applications.some(a => a.id_linea_banco === l.id_linea_banco && !validApplications.includes(a))) add('assignment', [l], 'Asociación a vencimiento desactualizada', 'El cargo o la programación han cambiado. Revisa la asociación guardada.');
    if (assigned.length && total !== Math.abs(cents(l.importe))) add('allocation', [l], 'Movimiento aplicado parcialmente', `Aplicado ${(total / 100).toFixed(2)} de ${Math.abs(Number(l.importe)).toFixed(2)} €. Revisa el importe restante.`);
    if (assigned.length) continue;
    const matches = occurrences.filter(o => !o.orphaned && String(o.id_cargo_recurrente) === String(l.id_cargo_recurrente) && Math.abs(day(o.fecha) - day(lineDate(l))) <= 10);
    const expected = matches.length === 1 ? cents(matches[0].importe) : null;
    const previous = pool.filter(p => p.id_linea_banco !== l.id_linea_banco && l.id_cargo_recurrente && String(p.id_cargo_recurrente) === String(l.id_cargo_recurrente) && lineDate(p) < lineDate(l)).sort((a,b) => lineDate(b).localeCompare(lineDate(a)))[0];
    const baseline = expected ?? (previous ? Math.abs(cents(previous.importe)) : null);
    if (baseline !== null && baseline !== Math.abs(cents(l.importe))) add('amount', [l], 'Cambio de importe', `Referencia ${(baseline / 100).toFixed(2)} €; movimiento ${Math.abs(Number(l.importe)).toFixed(2)} €; diferencia ${((Math.abs(cents(l.importe)) - baseline) / 100).toFixed(2)} €.`, { baseline, occurrenceId: matches.length === 1 ? matches[0].id : '' });
  }
  for (const o of occurrences) {
    const apps = validApplications.filter(a => a.id_vencimiento === o.id), paid = apps.reduce((n,a) => n + cents(a.importe), 0);
    o.applied = paid / 100; o.remaining = (cents(o.importe) - paid) / 100;
    const rows = apps.map(a => lineMap.get(a.id_linea_banco));
    if (paid > cents(o.importe) && rows.some(l => selected.has(l.id_linea_banco))) add('overpaid', rows, 'Vencimiento aplicado por encima de su importe', 'Hay más importe bancario asociado que importe previsto.', { occurrenceId: o.id, expected: cents(o.importe) });
    // State only what the data establishes; imported statement coverage is not recorded.
    if (!o.orphaned && o.fecha <= end && o.fecha < today && o.remaining > 0) history.push({ ids: [], occurrenceId: o.id, detail: `${o.descripcion} · ${o.fecha} · ${o.remaining.toFixed(2)} € sin asociar. No acredita un impago: puede faltar el extracto o la asociación.` });
  }
  const visibleLines = lines.filter(l => selected.has(l.id_linea_banco) || alerts.some(a => a.ids.includes(l.id_linea_banco)) || history.some(h => h.ids.includes(l.id_linea_banco)) || resolved.some(r => r.ids.includes(l.id_linea_banco)));
  const coincidences = Object.fromEntries(selectedLines.map(l => [l.id_linea_banco, Object.fromEntries(visibleLines.filter(other=>!selected.has(other.id_linea_banco)).map(other=>[other.id_linea_banco,coincidenceReasons(l,other)]))]));
  return { alerts, resolved, history, coincidences, occurrences, applications: applications.filter(a => selected.has(a.id_linea_banco)), notes: generated.notes.filter(n => relevantCharges.has(n.chargeId)), lines: visibleLines, criteria: criteria.filter(c => !c.revoked_at), from, to: end };
}
export function reusableConditions(rows, charges) {
  // A repeated unassigned concept must never become a blanket exception.
  if (rows.some(l => !l.id_cargo_recurrente) || new Set(rows.map(l => String(l.id_cargo_recurrente))).size < 2) return null;
  const dates = rows.map(l=>day(lineDate(l)));
  if (Math.max(...dates) - Math.min(...dates) > 10) return null;
  const chargeIds = [...new Set(rows.map(l => String(l.id_cargo_recurrente)))].sort();
  const signatures = chargeIds.map(id => { const c = charges.find(c => String(c.id_cargo_recurrente) === id); return c && c.activo !== false ? [id, c.id_proveedor, c.tipo_programacion, c.programacion] : null; });
  if (signatures.some(s => !s)) return null;
  return { version: 1, maxDays: 10, charges: signatures, members: rows.map(l => [String(l.id_cargo_recurrente), cents(l.importe), conceptKey(l.concepto)]).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) };
}
