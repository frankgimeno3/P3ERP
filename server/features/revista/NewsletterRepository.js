import { getPgPool } from "../../database/pgClient.js";

let schemaReady = false;

function normalizeNewsletter(row) {
  return {
    id_publicacion: row.id_publicacion ?? "",
    id_newsletter: row.id_newsletter,
    nombre_newsletter: row.nombre_newsletter ?? row.titulo ?? "",
    titulo: row.nombre_newsletter ?? row.titulo ?? "",
    edicion: row.edicion ?? row.edicion_publicacion ?? "",
    numero: row.numero_publicacion ?? "",
    numero_publicacion: row.numero_publicacion ?? "",
    cuenta_id: row.cuenta_id ?? "",
    nombre_cuenta: row.nombre_empresa ?? "",
    contenido_id: row.contenido_id ?? "",
    contenido: row.especificaciones_contenido ?? "",
    link: row.link ?? "",
    deadline_materiales: row.deadline_materiales ?? "",
    fecha_publicacion: row.fecha_publicacion ?? "",
    estado: row.estado_publicacion ?? row.estado ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function ensureSchema(pool = getPgPool()) {
  if (schemaReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS newsleters_db (
      id_newsletter TEXT PRIMARY KEY,
      nombre_newsletter TEXT NOT NULL DEFAULT '',
      edicion TEXT NOT NULL DEFAULT '',
      titulo TEXT NOT NULL DEFAULT '',
      descripcion TEXT NOT NULL DEFAULT '',
      estado TEXT NOT NULL DEFAULT 'activo',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    ALTER TABLE newsleters_db
      ADD COLUMN IF NOT EXISTS nombre_newsletter TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS edicion TEXT NOT NULL DEFAULT '';
  `);
  await pool.query(`
    ALTER TABLE publicaciones_db
      ADD COLUMN IF NOT EXISTS tipo_publicacion TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS revista_id TEXT,
      ADD COLUMN IF NOT EXISTS newsletter_id TEXT,
      ADD COLUMN IF NOT EXISTS numero_publicacion TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS deadline_materiales TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS link TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS cuenta_id TEXT,
      ADD COLUMN IF NOT EXISTS contenido_id TEXT;
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS publicaciones_db_newsletter_id_idx ON publicaciones_db (newsletter_id);`);
  await pool.query(`
    INSERT INTO newsleters_db (id_newsletter, nombre_newsletter, edicion, titulo, estado, created_at, updated_at)
    SELECT id_newsletter, COALESCE(titulo, ''), COALESCE(estado, ''), COALESCE(titulo, ''), COALESCE(estado, 'activo'), created_at, updated_at
    FROM newsletters_db
    ON CONFLICT (id_newsletter) DO NOTHING
  `).catch(() => {});
  await pool.query(`
    INSERT INTO publicaciones_db (
      id_publicacion,
      nombre_publicacion,
      fecha_publicacion,
      estado_publicacion,
      medio_publicacion,
      detalle_publicacion,
      tipo_publicacion,
      newsletter_id,
      numero_publicacion,
      deadline_materiales,
      link,
      cuenta_id,
      contenido_id
    )
    SELECT
      'pub_' || n.id_newsletter,
      COALESCE(n.titulo, n.id_newsletter),
      COALESCE(n.fecha_publicacion, ''),
      COALESCE(n.estado, 'Pendiente'),
      'newsletter',
      COALESCE(n.titulo, ''),
      'newsletter',
      n.id_newsletter,
      COALESCE(NULLIF(regexp_replace(n.id_newsletter, '\\D', '', 'g'), ''), '1'),
      COALESCE(n.deadline_materiales, ''),
      COALESCE(n.link, ''),
      n.cuenta_id,
      n.contenido_id
    FROM newsletters_db n
    WHERE COALESCE(n.id_newsletter, '') <> ''
    ON CONFLICT (id_publicacion) DO NOTHING
  `).catch(() => {});
  schemaReady = true;
}

export async function getNewsletters(filters = {}) {
  const pool = getPgPool();
  await ensureSchema(pool);
  const values = [];
  const where = ["(p.tipo_publicacion = 'newsletter' OR (p.tipo_publicacion = '' AND p.medio_publicacion ILIKE '%newsletter%'))"];

  if (filters.estado) {
    values.push(filters.estado);
    where.push(`p.estado_publicacion = $${values.length}`);
  }

  const { rows } = await pool.query(
    `
      SELECT p.*, n.id_newsletter, n.nombre_newsletter, n.edicion, n.titulo, n.descripcion, n.estado, c.nombre_empresa, co.especificaciones_contenido
      FROM publicaciones_db p
      LEFT JOIN newsleters_db n ON n.id_newsletter = p.newsletter_id
      LEFT JOIN cuentas_db c ON c.id_cuenta = p.cuenta_id
      LEFT JOIN contenidos_db co ON co.id_contenido = p.contenido_id
      WHERE ${where.join(" AND ")}
      ORDER BY to_date(NULLIF(p.fecha_publicacion, ''), 'DD/MM/YYYY') DESC NULLS LAST, p.id_publicacion ASC
    `,
    values,
  );

  return rows.map(normalizeNewsletter);
}

export async function getNewsletterById(idNewsletter) {
  const pool = getPgPool();
  await ensureSchema(pool);
  const { rows } = await pool.query(
    `
      SELECT p.*, n.id_newsletter, n.nombre_newsletter, n.edicion, n.titulo, n.descripcion, n.estado, c.nombre_empresa, co.especificaciones_contenido
      FROM publicaciones_db p
      LEFT JOIN newsleters_db n ON n.id_newsletter = p.newsletter_id
      LEFT JOIN cuentas_db c ON c.id_cuenta = p.cuenta_id
      LEFT JOIN contenidos_db co ON co.id_contenido = p.contenido_id
      WHERE n.id_newsletter = $1 OR p.id_publicacion = $1
      LIMIT 1
    `,
    [idNewsletter],
  );

  return rows[0] ? normalizeNewsletter(rows[0]) : null;
}

export async function updateNewsletter(idNewsletter, data = {}) {
  const pool = getPgPool();
  await ensureSchema(pool);
  const current = await getNewsletterById(idNewsletter);
  const supportId = current?.id_newsletter || idNewsletter;
  const publicationId = current?.id_publicacion || idNewsletter;

  if (Object.prototype.hasOwnProperty.call(data, "nombre_newsletter") || Object.prototype.hasOwnProperty.call(data, "titulo") || Object.prototype.hasOwnProperty.call(data, "edicion")) {
    await pool.query(
      `
        UPDATE newsleters_db
        SET nombre_newsletter = COALESCE($1, nombre_newsletter),
            titulo = COALESCE($1, titulo),
            edicion = COALESCE($2, edicion),
            estado = COALESCE($2, estado),
            updated_at = NOW()
        WHERE id_newsletter = $3
      `,
      [
        Object.prototype.hasOwnProperty.call(data, "nombre_newsletter") || Object.prototype.hasOwnProperty.call(data, "titulo")
          ? data.nombre_newsletter || data.titulo || ""
          : null,
        Object.prototype.hasOwnProperty.call(data, "edicion") ? data.edicion || "" : null,
        supportId,
      ],
    );
  }

  const values = [];
  const sets = [];
  const map = {
    link: "link",
    deadline_materiales: "deadline_materiales",
    fecha_publicacion: "fecha_publicacion",
    estado: "estado_publicacion",
    edicion: "edicion_publicacion",
    numero_publicacion: "numero_publicacion",
    cuenta_id: "cuenta_id",
    contenido_id: "contenido_id",
  };
  for (const [inputField, dbField] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(data, inputField)) {
      values.push(data[inputField] || "");
      sets.push(`${dbField} = $${values.length}`);
    }
  }

  if (sets.length) {
    values.push(publicationId);
    await pool.query(
      `
        UPDATE publicaciones_db
        SET ${sets.join(", ")}, updated_at = NOW()
        WHERE newsletter_id = $${values.length} OR id_publicacion = $${values.length}
      `,
      values,
    );
  }

  return getNewsletterById(publicationId);
}

export async function createNewsletter(data = {}) {
  const pool = getPgPool();
  await ensureSchema(pool);
  const idNewsletter = data.id_newsletter?.trim() || `news_${Date.now()}`;
  const idPublicacion = data.id_publicacion?.trim() || `pub_${idNewsletter}_${Date.now()}`;

  await pool.query(
    `
      INSERT INTO newsleters_db (id_newsletter, nombre_newsletter, edicion, titulo, descripcion, estado)
      VALUES ($1, $2, $3, $2, $4, $3)
      ON CONFLICT (id_newsletter) DO UPDATE
      SET nombre_newsletter = EXCLUDED.nombre_newsletter,
          edicion = EXCLUDED.edicion,
          titulo = EXCLUDED.titulo,
          descripcion = EXCLUDED.descripcion,
          estado = EXCLUDED.estado,
          updated_at = NOW()
    `,
    [idNewsletter, data.nombre_newsletter || data.titulo || "", data.edicion || "", data.descripcion || ""],
  );

  await pool.query(
    `
      INSERT INTO publicaciones_db (
        id_publicacion,
        nombre_publicacion,
        fecha_publicacion,
        estado_publicacion,
        medio_publicacion,
        detalle_publicacion,
        tipo_publicacion,
        newsletter_id,
        numero_publicacion,
        deadline_materiales,
        link,
        cuenta_id,
        contenido_id
      )
      VALUES ($1, $2, $3, $4, 'newsletter', $5, 'newsletter', $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id_publicacion) DO UPDATE
      SET fecha_publicacion = EXCLUDED.fecha_publicacion,
          estado_publicacion = EXCLUDED.estado_publicacion,
          newsletter_id = EXCLUDED.newsletter_id,
          numero_publicacion = EXCLUDED.numero_publicacion,
          deadline_materiales = EXCLUDED.deadline_materiales,
          link = EXCLUDED.link,
          cuenta_id = EXCLUDED.cuenta_id,
          contenido_id = EXCLUDED.contenido_id,
          updated_at = NOW()
    `,
    [
      idPublicacion,
      data.nombre_newsletter || data.titulo || idNewsletter,
      data.fecha_publicacion || "",
      data.estado || "Pendiente",
      data.nombre_newsletter || data.titulo || "",
      idNewsletter,
      data.publicacion || data.numero_publicacion || "1",
      data.deadline_materiales || "",
      data.link || "",
      data.cuenta_id || null,
      data.contenido_id || null,
    ],
  );

  return getNewsletterById(idNewsletter);
}
