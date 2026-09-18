// Preview by default; --apply archives originals and removes only weekend vacation coverage.
import { randomUUID } from 'node:crypto';
import nextEnv from '@next/env';
import { getPgPool } from '../server/database/pgClient.js';
import { weekdayRanges } from '../server/features/laboral/vacationRanges.js';
nextEnv.loadEnvConfig(process.cwd());
const pool = getPgPool(), db = await pool.connect(), apply = process.argv.includes('--apply');
try {
  await db.query('BEGIN');
  await db.query("SET LOCAL lock_timeout='5s'");
  const { rows } = await db.query("SELECT e.*,inicio::text AS inicio,fin::text AS fin FROM laboral_eventos_calendario e WHERE tipo='vacaciones' FOR UPDATE");
  const changes = rows.map(event => ({ event, ranges: weekdayRanges(event.inicio, event.fin) })).filter(({ event, ranges }) => ranges.length !== 1 || ranges[0][0] !== event.inicio || ranges[0][1] !== event.fin);
  console.log(JSON.stringify({ affected: changes.length, years: [...new Set(changes.map(c => c.event.anio))], weekdayRanges: changes.reduce((n,c) => n + c.ranges.length, 0) }));
  if (apply) {
    await db.query('CREATE TABLE IF NOT EXISTS vacaciones_limpieza_archivo (id_evento TEXT PRIMARY KEY, original JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
    for (const { event, ranges } of changes) {
      await db.query('INSERT INTO vacaciones_limpieza_archivo(id_evento,original) VALUES($1,$2) ON CONFLICT DO NOTHING', [event.id, JSON.stringify(event)]);
      if (!ranges.length) await db.query('DELETE FROM laboral_eventos_calendario WHERE id=$1', [event.id]);
      for (let i = 0; i < ranges.length; i++) {
        const [inicio, fin] = ranges[i];
        if (i === 0) await db.query('UPDATE laboral_eventos_calendario SET inicio=$1,fin=$2 WHERE id=$3', [inicio,fin,event.id]);
        else await db.query('INSERT INTO laboral_eventos_calendario(id,anio,tipo,titulo,inicio,fin,comentarios,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [randomUUID(),event.anio,event.tipo,event.titulo,inicio,fin,event.comentarios,event.created_at]);
      }
    }
    await db.query('COMMIT');
    console.log('Weekend vacation associations removed; original events archived.');
  } else await db.query('ROLLBACK');
} catch (error) { await db.query('ROLLBACK'); throw error; }
finally { db.release(); await pool.end(); }
