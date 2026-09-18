import { getPgPool } from '../../database/pgClient.js';

const accountMap = {
  'Número de Cuenta': 'id_cuenta', 'Nombre de Cuenta': 'nombre_empresa', 'Página web': 'website',
  'Asignado a': 'asignado_a', AGENTE: 'id_agente', 'Potencial actual - Relación': 'potencial_actual_relacion',
  'Potencial futuro - Encaje con nuestros medios': 'potencial_futuro_encaje', Descripción: 'descripcion_cuenta',
  Tipo: 'tipo_cuenta', ACTIVIDADES: 'actividades_cuenta', 'De Correo Electrónico Principal': 'correo_principal',
  'DESCRIPCIÓN DE ACTIVIDAD': 'descripcion_actividad', 'RED SOCIAL PRIORITARIA': 'red_social_prioritaria',
  'CATÁLOGOS': 'catalogos', 'Dirección (Factura)': 'direccion_facturacion', 'Población (Factura)': 'poblacion_facturacion',
  'Código Postal (Factura)': 'cp_facturacion', 'País (Factura)': 'pais_facturacion', CAMPAÑAS: 'campanas',
  'ESTADO LEADS FRÍOS': 'estado_leads_frios', 'FACTURAS EMITIDAS': 'detalles_facturacion',
};
const contactMap = {
  'Contacto Id': 'id_contacto', Nombre: 'nombre_contacto', Apellido: 'apellidos_contacto',
  'Nombre Cuenta': 'nombre_empresa', 'De Correo Electrónico Principal': 'email_contacto', CARGO: 'cargo_contacto',
  'Teléfono Empresa': 'telefono_contacto', 'País (Factura)': 'pais_contacto', 'RED SOCIAL': 'linkedin_cuenta',
  Descripción: 'otros_datos_interes', 'PUBLICACIONES QUE RECIBE': 'suscripciones',
};
const allowed = {
  cuentas: new Set(['id_cuenta','nombre_empresa','website','asignado_a','id_agente','potencial_actual_relacion','potencial_futuro_encaje','descripcion_cuenta','tipo_cuenta','actividades_cuenta','correo_principal','descripcion_actividad','red_social_prioritaria','catalogos','direccion_facturacion','poblacion_facturacion','cp_facturacion','pais_facturacion','campanas','estado_leads_frios','detalles_facturacion','datos_comerciales']),
  contactos: new Set(['id_contacto','nombre_contacto','apellidos_contacto','nombre_completo_contacto','nombre_empresa','email_contacto','cargo_contacto','telefono_contacto','pais_contacto','linkedin_cuenta','otros_datos_interes','suscripciones']),
};
const jsonCols = new Set(['datos_comerciales','suscripciones']);
const blank = (v) => v == null || String(v).trim() === '';

function mapRow(type, source) {
  const map = type === 'cuentas' ? accountMap : contactMap;
  const row = {};
  for (const [header, column] of Object.entries(map)) row[column] = source[header] ?? '';
  if (type === 'cuentas') {
    row.datos_comerciales = { telefono_principal_cuenta: source['Teléfono Principal'] ?? '' };
  } else {
    row.nombre_completo_contacto = `${row.nombre_contacto} ${row.apellidos_contacto}`.trim();
    row.suscripciones = String(row.suscripciones || '').split('|##|').map((v) => v.trim()).filter(Boolean);
  }
  return row;
}

export async function importTiger(type, sourceRows, mode) {
  const pool = getPgPool();
  const client = await pool.connect();
  const table = type === 'cuentas' ? 'comercial_cuentas' : 'comercial_contactos';
  const key = type === 'cuentas' ? 'id_cuenta' : 'id_contacto';
  const changes = [];
  let created = 0, updated = 0, skipped = 0;
  try {
    await client.query('BEGIN');
    for (const source of sourceRows) {
      const incoming = mapRow(type, source);
      const id = String(incoming[key] || '').trim();
      if (!id) { skipped++; continue; }
      const { rows } = await client.query(`SELECT * FROM ${table} WHERE ${key}=$1 LIMIT 1`, [id]);
      const current = rows[0];
      if (!current) {
        const columns = Object.keys(incoming).filter((c) => allowed[type].has(c));
        const values = columns.map((c) => jsonCols.has(c) ? JSON.stringify(incoming[c]) : incoming[c]);
        const placeholders = columns.map((c, i) => `$${i + 1}${jsonCols.has(c) ? '::jsonb' : ''}`);
        await client.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders.join(',')})`, values);
        changes.push({ [`${type === 'cuentas' ? 'cuenta' : 'contacto'} creado`]: id, campos: incoming });
        created++;
      } else if (mode === 'crear') {
        skipped++;
      } else {
        const fields = [];
        for (const [column, value] of Object.entries(incoming)) {
          if (column === key || !allowed[type].has(column)) continue;
          if (mode === 'rellenar' && !blank(current[column])) continue;
          const oldValue = current[column];
          if (JSON.stringify(oldValue ?? '') !== JSON.stringify(value ?? '')) fields.push({ column, oldValue, value });
        }
        if (!fields.length) { skipped++; continue; }
        const values = fields.map((f) => jsonCols.has(f.column) ? JSON.stringify(f.value) : f.value);
        values.push(id);
        await client.query(`UPDATE ${table} SET ${fields.map((f,i) => `${f.column}=$${i+1}${jsonCols.has(f.column) ? '::jsonb' : ''}`).join(',')}, updated_at=NOW() WHERE ${key}=$${values.length}`, values);
        changes.push({ [`${type === 'cuentas' ? 'cuenta' : 'contacto'} modificada`]: id, 'campos modificados': fields.map((f) => ({ 'nombre campo': f.column, 'valor anterior': f.oldValue, 'valor actual': f.value })) });
        updated++;
      }
    }
    const detalles = `${created} creados, ${updated} actualizados y ${skipped} omitidos`;
    const { rows: history } = await client.query(`INSERT INTO general_tiger_actualizaciones (tipo, detalles, descripcion) VALUES ($1,$2,$3::jsonb) RETURNING *`, [type, detalles, JSON.stringify(changes)]);
    await client.query('COMMIT');
    return { history: history[0], created, updated, skipped };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function getTigerHistory(type = '') {
  const values = type ? [type] : [];
  const { rows } = await getPgPool().query(`SELECT id, fecha_hora, tipo, detalles FROM general_tiger_actualizaciones ${type ? 'WHERE tipo=$1' : ''} ORDER BY fecha_hora DESC`, values);
  return rows;
}
export async function getTigerHistoryItem(id) {
  const { rows } = await getPgPool().query('SELECT * FROM general_tiger_actualizaciones WHERE id=$1 LIMIT 1', [id]);
  return rows[0] || null;
}
