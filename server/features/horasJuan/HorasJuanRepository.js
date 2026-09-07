import { getPgPool } from "../../database/pgClient.js";
const n = (value) => value === null || value === undefined ? null : Number(value);
function normalize(row) { return { ...row, id_horas_juan: Number(row.id_horas_juan), mes: Number(row.mes), anio: Number(row.anio), horas: n(row.horas), horas_enteras: n(row.horas_enteras), minutos: n(row.minutos), precio_hora: n(row.precio_hora), importe_generado: n(row.importe_generado), importe_anticipo: n(row.importe_anticipo), importe_ajuste: n(row.importe_ajuste) || 0, importe_pagar: n(row.importe_pagar), saldo_pendiente: n(row.saldo_pendiente) || 0, compensado_en_id: n(row.compensado_en_id) }; }
export async function getHorasJuan() { const { rows } = await getPgPool().query(`SELECT * FROM horas_juan ORDER BY anio DESC, mes DESC, fecha DESC, id_horas_juan DESC`); return rows.map(normalize); }
export async function getHorasJuanById(id) { const { rows } = await getPgPool().query(`SELECT * FROM horas_juan WHERE id_horas_juan = $1`, [id]); if (!rows[0]) return null; const { rows: sources } = await getPgPool().query(`SELECT id_horas_juan, mes, anio, tipo, saldo_pendiente, importe_anticipo, importe_ajuste, motivo_ajuste FROM horas_juan WHERE compensado_en_id = $1 ORDER BY anio, mes, id_horas_juan`, [id]); return { ...normalize(rows[0]), compensaciones: sources.map(normalize) }; }
export async function getHorasJuanDebts() { const { rows } = await getPgPool().query(`SELECT * FROM horas_juan WHERE saldo_pendiente <> 0 AND compensado_en_id IS NULL ORDER BY anio DESC, mes DESC, id_horas_juan DESC`); return rows.map(row => ({ ...normalize(row), deudor: Number(row.saldo_pendiente) > 0 ? 'Proporción 3 a Juan' : 'Juan a Proporción 3', importe_deuda: Math.abs(Number(row.saldo_pendiente)) })); }
async function getPending(client, nombre, mes, anio, tipo) {
  const { rows: informativas } = await client.query(`SELECT * FROM horas_juan WHERE nombre = $1 AND tipo IN ('informativa', 'normal') AND saldo_pendiente <> 0 AND compensado_en_id IS NULL AND (anio < $3 OR (anio = $3 AND mes <= $2)) ORDER BY anio, mes, id_horas_juan FOR UPDATE`, [nombre, mes, anio]);
  const { rows: anticipos } = await client.query(`SELECT * FROM horas_juan WHERE nombre = $1 AND tipo = 'anticipo' AND mes = $2 AND anio = $3 AND compensado_en_id IS NULL ORDER BY id_horas_juan FOR UPDATE`, [nombre, mes, anio]);
  return tipo === 'informativa' ? { informativas: [], anticipos } : { informativas, anticipos };
}
export async function getHorasJuanSuggestion({ nombre = 'Juan', mes, anio, tipo }) {
  if (!['normal', 'informativa'].includes(tipo)) return { importe_ajuste: 0, importe_anticipado: 0, origenes: [] };
  const client = await getPgPool().connect();
  try { await client.query('BEGIN'); const pending = await getPending(client, nombre, mes, anio, tipo); await client.query('ROLLBACK'); const infos = pending.informativas.reduce((s, r) => s + Number(r.saldo_pendiente), 0); const advances = pending.anticipos.reduce((s, r) => s + Number(r.importe_anticipo), 0); return { importe_ajuste: tipo === 'normal' ? infos - advances : -advances, importe_anticipado: advances, origenes: [...pending.informativas, ...pending.anticipos].map(normalize) }; } finally { client.release(); }
}
export async function createHorasJuan(data) {
  const tipo = String(data.tipo || ''), nombre = String(data.nombre || 'Juan').trim() || 'Juan', mes = Number(data.mes), anio = Number(data.anio), fecha = String(data.fecha || '');
  if (!['normal', 'informativa', 'anticipo'].includes(tipo)) throw new Error('Tipo de informe no válido');
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(anio) || anio < 2000 || anio > 2100) throw new Error('Periodo no válido');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error('Fecha no válida');
  const client = await getPgPool().connect();
  try {
    await client.query('BEGIN');
    if (tipo === 'anticipo') {
      const importe = Math.round(Number(data.importe_anticipo) * 100) / 100;
      if (!Number.isFinite(importe) || importe <= 0) throw new Error('El importe del anticipo debe ser mayor que cero');
      const { rows } = await client.query(`INSERT INTO horas_juan (mes, anio, nombre, tipo, importe_anticipo, importe_pagar, fecha) VALUES ($1,$2,$3,'anticipo',$4,$4,$5) RETURNING *`, [mes, anio, nombre, importe, fecha]);
      await client.query('COMMIT'); return normalize(rows[0]);
    }
    const horasEnteras = Number(data.horas_enteras), minutos = Number(data.minutos);
    if (!Number.isInteger(horasEnteras) || horasEnteras < 0 || !Number.isInteger(minutos) || minutos < 0 || minutos > 59 || horasEnteras + minutos === 0) throw new Error('Las horas y minutos no son válidos');
    const horas = Math.round((horasEnteras + minutos / 60) * 100) / 100, generado = Math.round(horas * 15 * 100) / 100;
    const pending = await getPending(client, nombre, mes, anio, tipo);
    const anticipado = Math.round(pending.anticipos.reduce((s, r) => s + Number(r.importe_anticipo), 0) * 100) / 100;
    if (tipo === 'informativa' && pending.anticipos.length === 0) throw new Error('No hay anticipos pendientes de este mes para crear una informativa');
    const infos = Math.round(pending.informativas.reduce((s, r) => s + Number(r.saldo_pendiente), 0) * 100) / 100;
    const suggestedAdjustment = tipo === 'informativa' ? Math.round((generado - anticipado) * 100) / 100 : Math.round((infos - anticipado) * 100) / 100;
    const requestedAdjustment = Number(data.importe_ajuste);
    const ajuste = tipo === 'normal' && Number.isFinite(requestedAdjustment) ? Math.round(requestedAdjustment * 100) / 100 : suggestedAdjustment;
    const motivoAjuste = tipo === 'normal' && ajuste !== 0 ? String(data.motivo_ajuste || '').trim().slice(0, 500) : null;
    const total = Math.round((generado + ajuste) * 100) / 100;
    const pagar = tipo === 'normal' ? Math.max(0, total) : null;
    const saldoPendiente = tipo === 'informativa' ? ajuste : Math.min(0, total);
    const { rows } = await client.query(`INSERT INTO horas_juan (mes,anio,nombre,tipo,horas,horas_enteras,minutos,precio_hora,importe_generado,importe_anticipo,importe_ajuste,importe_pagar,saldo_pendiente,fecha,motivo_ajuste) VALUES ($1,$2,$3,$4,$5,$6,$7,15,$8,$9,$10,$11,$12,$13,$14) RETURNING *`, [mes, anio, nombre, tipo, horas, horasEnteras, minutos, generado, anticipado, ajuste, pagar, saldoPendiente, fecha, motivoAjuste]);
    const created = rows[0], sourceIds = (tipo === 'informativa' ? pending.anticipos : [...pending.informativas, ...pending.anticipos]).map(r => r.id_horas_juan);
    if (sourceIds.length) await client.query(`UPDATE horas_juan SET compensado_en_id = $1, updated_at = NOW() WHERE id_horas_juan = ANY($2::bigint[])`, [created.id_horas_juan, sourceIds]);
    await client.query('COMMIT'); return normalize(created);
  } catch (error) { await client.query('ROLLBACK'); if (error.code === '23505') throw new Error(`Ya existe un informe ${tipo} para ese mes`); throw error; } finally { client.release(); }
}

export async function getHorasJuanDeleteImpact(id) {
  const report = await getHorasJuanById(id);
  if (!report) return null;
  const { rows } = await getPgPool().query(`WITH RECURSIVE cadena AS (SELECT id_horas_juan, mes, anio, tipo, compensado_en_id FROM horas_juan WHERE id_horas_juan = $1 UNION ALL SELECT h.id_horas_juan, h.mes, h.anio, h.tipo, h.compensado_en_id FROM horas_juan h JOIN cadena c ON h.id_horas_juan = c.compensado_en_id) SELECT id_horas_juan, mes, anio, tipo FROM cadena WHERE id_horas_juan <> $1 ORDER BY anio, mes, id_horas_juan`, [id]);
  return { informe: report, dependientes: rows.map(row => ({ ...row, id_horas_juan: Number(row.id_horas_juan), mes: Number(row.mes), anio: Number(row.anio) })) };
}

export async function deleteHorasJuan(id, confirmDependencies = false) {
  const impact = await getHorasJuanDeleteImpact(id);
  if (!impact) return null;
  if (impact.informe.tipo === 'anticipo' && impact.dependientes.length && !confirmDependencies) { const error = new Error('Debes confirmar la eliminación de los informes posteriores vinculados.'); error.code = 'DEPENDENCIES_CONFIRMATION'; error.impact = impact; throw error; }
  const ids = [Number(id), ...(impact.informe.tipo === 'anticipo' ? impact.dependientes.map(row => row.id_horas_juan) : [])];
  const { rowCount } = await getPgPool().query(`DELETE FROM horas_juan WHERE id_horas_juan = ANY($1::bigint[])`, [ids]);
  return { eliminados: rowCount, ids };
}
