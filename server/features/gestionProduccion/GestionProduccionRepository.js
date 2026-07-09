import { randomUUID } from "node:crypto";
import { getPgPool } from "../../database/pgClient.js";

let schemaReady = false;

const array = (value) => Array.isArray(value) ? value : [];
const id = (prefix) => `${prefix}_${randomUUID().slice(0, 12)}`;

function normalizeOrder(value) {
  return array(value)
    .map((item, index) => Array.isArray(item)
      ? { posicion: Number(item[0] ?? index), id_gestion_prod: item[1] }
      : { posicion: Number(item?.posicion ?? index), id_gestion_prod: item?.id_gestion_prod })
    .filter((item) => item.id_gestion_prod)
    .sort((a, b) => a.posicion - b.posicion)
    .map((item, posicion) => [posicion, item.id_gestion_prod]);
}

async function ensureSchema(pool = getPgPool()) {
  if (schemaReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS materiales_db (
      id_material TEXT PRIMARY KEY, nombre_material TEXT NOT NULL DEFAULT '',
      validacion_produccion TEXT NOT NULL DEFAULT 'pendiente validar',
      comentarios TEXT NOT NULL DEFAULT '', mediateca_id TEXT, archivo_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS revistas_articulos (
      id_articulo_revista TEXT PRIMARY KEY,
      array_ids_publicaciones JSONB NOT NULL DEFAULT '[]'::jsonb,
      paginas_largo INTEGER NOT NULL DEFAULT 1, numero_version INTEGER NOT NULL DEFAULT 1,
      estado TEXT NOT NULL DEFAULT 'pendiente', comentarios TEXT NOT NULL DEFAULT '',
      correcciones TEXT NOT NULL DEFAULT '', array_ids_materiales JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS gestiones_produccion_db (
      id_gestion_prod TEXT PRIMARY KEY, nombre_gestion TEXT NOT NULL DEFAULT '',
      publicaciones_array JSONB NOT NULL DEFAULT '[]'::jsonb,
      articulos_array JSONB NOT NULL DEFAULT '[]'::jsonb,
      materiales_array JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS gestiones_prod_listas (
      id_lista_gestiones_prod TEXT PRIMARY KEY, nombre_lista TEXT NOT NULL DEFAULT '',
      array_objetos_gestiones JSONB NOT NULL DEFAULT '[]'::jsonb,
      posicion_lista INTEGER NOT NULL UNIQUE CHECK (posicion_lista >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE contenidos_db
      ADD COLUMN IF NOT EXISTS id_gestion_prod TEXT,
      ADD COLUMN IF NOT EXISTS destinos_publicacion JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE gestiones_prod_listas
      ADD COLUMN IF NOT EXISTS es_lista_sistema BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS oculta_tablero BOOLEAN NOT NULL DEFAULT FALSE;
  `);
  await pool.query(`
    INSERT INTO gestiones_prod_listas (id_lista_gestiones_prod, nombre_lista, posicion_lista)
    SELECT 'lista_gestiones_general', 'General', 0
    WHERE NOT EXISTS (SELECT 1 FROM gestiones_prod_listas)
  `);
  await pool.query(`
    INSERT INTO gestiones_prod_listas
      (id_lista_gestiones_prod,nombre_lista,array_objetos_gestiones,posicion_lista,es_lista_sistema,oculta_tablero)
    VALUES
      ('lista_gestiones_publicado','Publicado','[]'::jsonb,100000,TRUE,TRUE),
      ('lista_gestiones_cancelado','Cancelado','[]'::jsonb,100001,TRUE,TRUE)
    ON CONFLICT (id_lista_gestiones_prod) DO UPDATE
    SET nombre_lista=EXCLUDED.nombre_lista,es_lista_sistema=TRUE,oculta_tablero=TRUE
  `);
  schemaReady = true;
}

export async function getGestionesData() {
  const pool = getPgPool();
  await ensureSchema(pool);
  const [listas, gestiones, publicaciones] = await Promise.all([
    pool.query("SELECT * FROM gestiones_prod_listas ORDER BY posicion_lista"),
    pool.query("SELECT * FROM gestiones_produccion_db ORDER BY created_at DESC"),
    pool.query(`
      SELECT
        p.id_publicacion,
        p.nombre_publicacion,
        p.numero_publicacion,
        CASE
          WHEN LOWER(p.tipo_publicacion) = 'newsletter' OR p.newsletter_id IS NOT NULL THEN 'newsletter'
          ELSE 'revista'
        END AS tipo_soporte,
        COALESCE(NULLIF(r.edicion, ''), NULLIF(n.edicion, ''), NULLIF(p.edicion_publicacion, ''), 'Sin edicion') AS edicion_soporte,
        COALESCE(NULLIF(r.revista, ''), NULLIF(n.nombre_newsletter, ''), NULLIF(p.nombre_publicacion, ''), p.id_publicacion) AS nombre_soporte
      FROM publicaciones_db p
      LEFT JOIN revistas_db r ON r.id_revista = p.revista_id
      LEFT JOIN newsleters_db n ON n.id_newsletter = p.newsletter_id
      ORDER BY p.fecha_publicacion DESC NULLS LAST, p.id_publicacion
    `),
  ]);
  return {
    listas: listas.rows.map((row) => ({ ...row, array_objetos_gestiones: normalizeOrder(row.array_objetos_gestiones) })),
    gestiones: gestiones.rows,
    publicaciones: publicaciones.rows,
  };
}

export async function createGestion(data = {}) {
  const pool = getPgPool();
  await ensureSchema(pool);
  const idGestion = data.id_gestion_prod || id("gestion");
  const { rows } = await pool.query(
    `INSERT INTO gestiones_produccion_db
      (id_gestion_prod, nombre_gestion, publicaciones_array, articulos_array, materiales_array)
     VALUES ($1,$2,$3::jsonb,$4::jsonb,$5::jsonb) RETURNING *`,
    [idGestion, data.nombre_gestion || "Nueva gestion", JSON.stringify(array(data.publicaciones_array)), JSON.stringify(array(data.articulos_array)), JSON.stringify(array(data.materiales_array))],
  );
  const target = data.id_lista_gestiones_prod
    ? await pool.query("SELECT * FROM gestiones_prod_listas WHERE id_lista_gestiones_prod = $1", [data.id_lista_gestiones_prod])
    : await pool.query("SELECT * FROM gestiones_prod_listas ORDER BY posicion_lista LIMIT 1");
  if (target.rows[0]) {
    const order = normalizeOrder(target.rows[0].array_objetos_gestiones);
    order.push([order.length, idGestion]);
    await pool.query("UPDATE gestiones_prod_listas SET array_objetos_gestiones=$1::jsonb, updated_at=NOW() WHERE id_lista_gestiones_prod=$2", [JSON.stringify(order), target.rows[0].id_lista_gestiones_prod]);
  }
  return rows[0];
}

export async function updateGestion(idGestion, data = {}) {
  const pool = getPgPool();
  await ensureSchema(pool);
  const { rows } = await pool.query(
    `UPDATE gestiones_produccion_db SET nombre_gestion=$1, publicaciones_array=$2::jsonb,
      articulos_array=$3::jsonb, materiales_array=$4::jsonb, updated_at=NOW()
     WHERE id_gestion_prod=$5 RETURNING *`,
    [data.nombre_gestion || "", JSON.stringify(array(data.publicaciones_array)), JSON.stringify(array(data.articulos_array)), JSON.stringify(array(data.materiales_array)), idGestion],
  );
  if (rows[0] && data.id_lista_gestiones_prod) {
    const { rows: lists } = await pool.query("SELECT * FROM gestiones_prod_listas ORDER BY posicion_lista");
    const currentList = lists.find((list) => normalizeOrder(list.array_objetos_gestiones).some((item) => item[1] === idGestion));
    const targetList = lists.find((list) => list.id_lista_gestiones_prod === data.id_lista_gestiones_prod);
    if (targetList && currentList?.id_lista_gestiones_prod !== targetList.id_lista_gestiones_prod) {
      if (currentList) {
        const sourceOrder = normalizeOrder(currentList.array_objetos_gestiones)
          .filter((item) => item[1] !== idGestion)
          .map((item, position) => [position, item[1]]);
        await pool.query("UPDATE gestiones_prod_listas SET array_objetos_gestiones=$1::jsonb,updated_at=NOW() WHERE id_lista_gestiones_prod=$2", [JSON.stringify(sourceOrder), currentList.id_lista_gestiones_prod]);
      }
      const targetOrder = normalizeOrder(targetList.array_objetos_gestiones);
      targetOrder.push([targetOrder.length, idGestion]);
      await pool.query("UPDATE gestiones_prod_listas SET array_objetos_gestiones=$1::jsonb,updated_at=NOW() WHERE id_lista_gestiones_prod=$2", [JSON.stringify(targetOrder), targetList.id_lista_gestiones_prod]);
    }
  }
  return rows[0] || null;
}

export async function createLista(data = {}) {
  const pool = getPgPool();
  await ensureSchema(pool);
  const max = await pool.query("SELECT COALESCE(MAX(posicion_lista), -1)::int AS value FROM gestiones_prod_listas WHERE es_lista_sistema=FALSE");
  const { rows } = await pool.query(
    "INSERT INTO gestiones_prod_listas (id_lista_gestiones_prod,nombre_lista,posicion_lista) VALUES ($1,$2,$3) RETURNING *",
    [id("lista_gestion"), data.nombre_lista || "Nueva lista", max.rows[0].value + 1],
  );
  return rows[0];
}

export async function updateLista(idLista, data = {}) {
  const pool = getPgPool();
  await ensureSchema(pool);
  const current = await pool.query("SELECT * FROM gestiones_prod_listas WHERE id_lista_gestiones_prod=$1", [idLista]);
  if (!current.rows[0]) return null;
  if (current.rows[0].es_lista_sistema) throw new Error("Las listas de sistema no se pueden modificar.");
  const count = await pool.query("SELECT COUNT(*)::int AS value FROM gestiones_prod_listas WHERE es_lista_sistema=FALSE");
  const requestedPosition = Number.isFinite(Number(data.posicion_lista)) ? Number(data.posicion_lista) : current.rows[0].posicion_lista;
  const nextPosition = Math.max(0, Math.min(requestedPosition, count.rows[0].value - 1));
  if (nextPosition !== current.rows[0].posicion_lista) {
    await pool.query("UPDATE gestiones_prod_listas SET posicion_lista=$1 WHERE id_lista_gestiones_prod=$2", [count.rows[0].value, idLista]);
    await pool.query("UPDATE gestiones_prod_listas SET posicion_lista=$1 WHERE posicion_lista=$2", [current.rows[0].posicion_lista, nextPosition]);
  }
  const { rows } = await pool.query(
    `UPDATE gestiones_prod_listas SET nombre_lista=$1,array_objetos_gestiones=$2::jsonb,
      posicion_lista=$3,updated_at=NOW() WHERE id_lista_gestiones_prod=$4 RETURNING *`,
    [data.nombre_lista ?? current.rows[0].nombre_lista, JSON.stringify(normalizeOrder(data.array_objetos_gestiones ?? current.rows[0].array_objetos_gestiones)), nextPosition, idLista],
  );
  return rows[0];
}

export async function deleteLista(idLista, moveTo = "") {
  const pool = getPgPool();
  await ensureSchema(pool);
  const source = await pool.query("SELECT * FROM gestiones_prod_listas WHERE id_lista_gestiones_prod=$1", [idLista]);
  if (!source.rows[0]) return null;
  if (source.rows[0].es_lista_sistema || ["publicado", "cancelado"].includes(String(source.rows[0].nombre_lista).toLowerCase())) {
    throw new Error("Las listas Publicado y Cancelado no se pueden eliminar.");
  }
  const sourceOrder = normalizeOrder(source.rows[0].array_objetos_gestiones);
  if (sourceOrder.length && !moveTo) throw new Error("Selecciona una lista destino para transferir las gestiones.");
  if (sourceOrder.length) {
    const target = await pool.query("SELECT * FROM gestiones_prod_listas WHERE id_lista_gestiones_prod=$1", [moveTo]);
    if (!target.rows[0]) throw new Error("La lista destino no existe.");
    const merged = [...normalizeOrder(target.rows[0].array_objetos_gestiones), ...sourceOrder].map((item, position) => [position, item[1]]);
    await pool.query("UPDATE gestiones_prod_listas SET array_objetos_gestiones=$1::jsonb,updated_at=NOW() WHERE id_lista_gestiones_prod=$2", [JSON.stringify(merged), moveTo]);
  }
  await pool.query("DELETE FROM gestiones_prod_listas WHERE id_lista_gestiones_prod=$1", [idLista]);
  const remaining = await pool.query("SELECT id_lista_gestiones_prod FROM gestiones_prod_listas WHERE es_lista_sistema=FALSE ORDER BY posicion_lista");
  for (const [position, row] of remaining.rows.entries()) {
    await pool.query("UPDATE gestiones_prod_listas SET posicion_lista=$1 WHERE id_lista_gestiones_prod=$2", [position, row.id_lista_gestiones_prod]);
  }
  return source.rows[0];
}

export async function getMateriales() {
  const pool = getPgPool(); await ensureSchema(pool);
  return (await pool.query("SELECT * FROM materiales_db ORDER BY created_at DESC")).rows;
}
export async function getMaterial(idMaterial) {
  const pool = getPgPool(); await ensureSchema(pool);
  return (await pool.query("SELECT * FROM materiales_db WHERE id_material=$1", [idMaterial])).rows[0] || null;
}
export async function saveMaterial(idMaterial, data = {}) {
  const pool = getPgPool(); await ensureSchema(pool);
  const materialId = idMaterial || data.id_material || id("material");
  const { rows } = await pool.query(
    `INSERT INTO materiales_db (id_material,nombre_material,validacion_produccion,comentarios,mediateca_id,archivo_url)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (id_material) DO UPDATE SET nombre_material=EXCLUDED.nombre_material,
       validacion_produccion=EXCLUDED.validacion_produccion,comentarios=EXCLUDED.comentarios,
       mediateca_id=EXCLUDED.mediateca_id,archivo_url=EXCLUDED.archivo_url,updated_at=NOW() RETURNING *`,
    [materialId, data.nombre_material || "", data.validacion_produccion || "pendiente validar", data.comentarios || "", data.mediateca_id || null, data.archivo_url || null],
  );
  return rows[0];
}

export async function getArticulos() {
  const pool = getPgPool(); await ensureSchema(pool);
  return (await pool.query("SELECT * FROM revistas_articulos ORDER BY created_at DESC")).rows;
}
export async function getArticulo(idArticulo) {
  const pool = getPgPool(); await ensureSchema(pool);
  return (await pool.query("SELECT * FROM revistas_articulos WHERE id_articulo_revista=$1", [idArticulo])).rows[0] || null;
}
export async function saveArticulo(idArticulo, data = {}) {
  const pool = getPgPool(); await ensureSchema(pool);
  const articleId = idArticulo || data.id_articulo_revista || id("articulo");
  const { rows } = await pool.query(
    `INSERT INTO revistas_articulos
      (id_articulo_revista,array_ids_publicaciones,paginas_largo,numero_version,estado,comentarios,correcciones,array_ids_materiales)
     VALUES ($1,$2::jsonb,$3,$4,$5,$6,$7,$8::jsonb)
     ON CONFLICT (id_articulo_revista) DO UPDATE SET array_ids_publicaciones=EXCLUDED.array_ids_publicaciones,
       paginas_largo=EXCLUDED.paginas_largo,numero_version=EXCLUDED.numero_version,estado=EXCLUDED.estado,
       comentarios=EXCLUDED.comentarios,correcciones=EXCLUDED.correcciones,
       array_ids_materiales=EXCLUDED.array_ids_materiales,updated_at=NOW() RETURNING *`,
    [articleId, JSON.stringify(array(data.array_ids_publicaciones)), Number(data.paginas_largo || 1), Number(data.numero_version || 1), data.estado || "pendiente", data.comentarios || "", data.correcciones || "", JSON.stringify(array(data.array_ids_materiales))],
  );
  return rows[0];
}
