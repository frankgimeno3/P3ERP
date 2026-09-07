import { getPgPool } from '../../database/pgClient.js';

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export async function getBackupCatalog() {
  const pool = getPgPool();
  const { rows } = await pool.query(`
    SELECT
      c.table_name,
      c.column_name,
      c.data_type,
      c.ordinal_position,
      EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON kcu.constraint_name = tc.constraint_name
         AND kcu.constraint_schema = tc.constraint_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = c.table_schema
          AND tc.table_name = c.table_name
          AND kcu.column_name = c.column_name
      ) AS is_primary_key
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    ORDER BY c.table_name, c.ordinal_position
  `);

  const tables = new Map();
  for (const row of rows) {
    if (!tables.has(row.table_name)) tables.set(row.table_name, { nombre: row.table_name, columnas: [] });
    tables.get(row.table_name).columnas.push({
      nombre: row.column_name,
      tipo: row.data_type,
      esClave: row.is_primary_key,
    });
  }
  return [...tables.values()];
}

export async function getBackupRegistry() {
  const { rows } = await getPgPool().query(`
    SELECT id_copia_seguridad, nombre, fecha, detalles, estado, tablas
    FROM registro_copias_seguridad
    ORDER BY fecha DESC, id_copia_seguridad DESC
  `);
  return rows;
}

async function saveRegistry({ nombre, detalles, estado, tablas }) {
  await getPgPool().query(
    `INSERT INTO registro_copias_seguridad (nombre, detalles, estado, tablas)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [nombre, detalles, estado, JSON.stringify(tablas || [])],
  );
}

export async function generateBackup({ nombre, detalles, selecciones }) {
  const cleanName = String(nombre || '').trim();
  if (!cleanName) throw new Error('El nombre de la copia es obligatorio.');
  if (!Array.isArray(selecciones) || selecciones.length === 0) throw new Error('Selecciona al menos una tabla.');

  const catalog = await getBackupCatalog();
  const catalogMap = new Map(catalog.map((table) => [table.nombre, table]));
  const normalized = selecciones.map((selection) => {
    const table = catalogMap.get(selection.tabla);
    if (!table) throw new Error(`La tabla ${selection.tabla} no existe o no se puede copiar.`);
    const allowed = new Set(table.columnas.map((column) => column.nombre));
    const requested = new Set(Array.isArray(selection.columnas) ? selection.columnas : []);
    for (const column of table.columnas.filter((item) => item.esClave)) requested.add(column.nombre);
    const columns = table.columnas.map((column) => column.nombre).filter((column) => requested.has(column));
    if (!columns.length || columns.some((column) => !allowed.has(column))) throw new Error(`Selecciona columnas válidas para ${table.nombre}.`);
    return { tabla: table.nombre, columnas: columns, claves: table.columnas.filter((column) => column.esClave).map((column) => column.nombre) };
  });

  const client = await getPgPool().connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const contents = [];
    for (const selection of normalized) {
      const columnsSql = selection.columnas.map(quoteIdentifier).join(', ');
      const orderSql = selection.claves.length ? ` ORDER BY ${selection.claves.map(quoteIdentifier).join(', ')}` : '';
      const { rows } = await client.query(`SELECT ${columnsSql} FROM ${quoteIdentifier(selection.tabla)}${orderSql}`);
      contents.push({ tabla: selection.tabla, columnas: selection.columnas, filas: rows });
    }
    await client.query('COMMIT');

    const generatedAt = new Date().toISOString();
    const backup = {
      formato: 'p3erp-backup-v1',
      nombre: cleanName,
      generado_en: generatedAt,
      tablas: contents,
    };
    await saveRegistry({ nombre: cleanName, detalles: String(detalles || ''), estado: 'correcta', tablas: normalized.map((item) => item.tabla) });
    return backup;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    await saveRegistry({
      nombre: cleanName,
      detalles: error instanceof Error ? error.message : 'Error desconocido al generar la copia.',
      estado: 'error',
      tablas: normalized.map((item) => item.tabla),
    });
    throw error;
  } finally {
    client.release();
  }
}
