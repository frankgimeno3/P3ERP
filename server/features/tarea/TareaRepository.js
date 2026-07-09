import { randomUUID } from "node:crypto";
import { getPgPool } from "../../database/pgClient.js";

let schemaReady = false;

function normalizeTarea(row) {
  return {
    id_tarea: row.id_tarea,
    agente: row.agente ?? "",
    titulo: row.titulo ?? "",
    contenido: row.contenido ?? "",
    descripcion: row.descripcion ?? "",
    estado: row.estado ?? "",
    prioridad: row.prioridad ?? "",
    lista_tareas: row.lista_tareas ?? "",
    fecha_desde: row.fecha_desde ?? null,
    fecha_hasta: row.fecha_hasta ?? null,
    relacionada_con_cuenta: row.relacionada_con_cuenta ?? "",
    relacionada_con_contacto: row.relacionada_con_contacto ?? "",
    relacionada_con_contenido: row.relacionada_con_contenido ?? "",
    relacionada_con_feria: row.relacionada_con_feria ?? "",
    relacionada_con_proveedor: row.relacionada_con_proveedor ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeLista(row) {
  return {
    id_lista_tareas: row.id_lista_tareas,
    nombre_lista_tareas: row.nombre_lista_tareas ?? "",
    id_agente: row.id_agente ?? "",
    tareas_order_array: Array.isArray(row.tareas_order_array) ? row.tareas_order_array : [],
    orden_lista: Number(row.orden_lista ?? 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function createTaskId() {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `tar_${stamp}_${randomUUID().slice(0, 8)}`;
}

function createListId() {
  return `lis_${randomUUID().slice(0, 12)}`;
}

function normalizeOrder(tasks = []) {
  return tasks.map((item, index) => ({
    id_tarea: typeof item === "string" ? item : item?.id_tarea,
    posicion: index,
  })).filter((item) => item.id_tarea);
}

async function ensureSchema(pool = getPgPool()) {
  if (schemaReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tareas_listas (
      id_lista_tareas TEXT PRIMARY KEY,
      nombre_lista_tareas TEXT NOT NULL DEFAULT '',
      id_agente TEXT NOT NULL DEFAULT '',
      tareas_order_array JSONB NOT NULL DEFAULT '[]'::jsonb,
      orden_lista INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE tareas_db ADD COLUMN IF NOT EXISTS lista_tareas TEXT NOT NULL DEFAULT '';`);
  await pool.query(`
    ALTER TABLE tareas_db
      ADD COLUMN IF NOT EXISTS descripcion TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS fecha_desde DATE,
      ADD COLUMN IF NOT EXISTS fecha_hasta DATE,
      ADD COLUMN IF NOT EXISTS relacionada_con_cuenta TEXT,
      ADD COLUMN IF NOT EXISTS relacionada_con_contacto TEXT,
      ADD COLUMN IF NOT EXISTS relacionada_con_contenido TEXT,
      ADD COLUMN IF NOT EXISTS relacionada_con_feria TEXT,
      ADD COLUMN IF NOT EXISTS relacionada_con_proveedor TEXT;
  `);
  await pool.query(`
    UPDATE tareas_listas
    SET nombre_lista_tareas = 'archivadas', updated_at = NOW()
    WHERE LOWER(nombre_lista_tareas) IN ('archivada', 'archivado');
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS tareas_db_lista_tareas_idx ON tareas_db (lista_tareas);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS tareas_listas_agente_idx ON tareas_listas (id_agente);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS tareas_listas_orden_idx ON tareas_listas (id_agente, orden_lista);`);

  schemaReady = true;
}

export async function ensureTaskListsForAgents() {
  const pool = getPgPool();
  await ensureSchema(pool);

  const { rows: agentes } = await pool.query(`
    SELECT id_agente
    FROM agentes_db
    WHERE COALESCE(LOWER(estado_agente), '') NOT IN ('inactivo', 'bloqueado', 'archivado')
      AND COALESCE(id_agente, '') <> ''
  `);

  for (const agente of agentes) {
    await ensureDefaultLists(agente.id_agente, pool);
  }
}

async function ensureDefaultLists(idAgente, pool = getPgPool()) {
  if (!idAgente) return [];
  await ensureSchema(pool);

  const defaults = [
    { nombre: "general", orden: 0 },
    { nombre: "archivadas", orden: 999 },
  ];

  for (const item of defaults) {
    await pool.query(
      `
        INSERT INTO tareas_listas (id_lista_tareas, nombre_lista_tareas, id_agente, orden_lista)
        SELECT $1, $2, $3, $4
        WHERE NOT EXISTS (
          SELECT 1 FROM tareas_listas
          WHERE id_agente = $3 AND LOWER(nombre_lista_tareas) = LOWER($2)
        )
      `,
      [createListId(), item.nombre, idAgente, item.orden],
    );
  }

  const { rows: listas } = await pool.query(
    `
      SELECT *
      FROM tareas_listas
      WHERE id_agente = $1
      ORDER BY orden_lista ASC, created_at ASC
    `,
    [idAgente],
  );

  const general = listas.find((lista) => String(lista.nombre_lista_tareas).toLowerCase() === "general") || listas[0];
  if (general) {
    await pool.query(
      `
        UPDATE tareas_db
        SET lista_tareas = $1
        WHERE agente = $2 AND COALESCE(lista_tareas, '') = ''
      `,
      [general.id_lista_tareas, idAgente],
    );
  }

  await syncTaskOrders(idAgente, pool);
  return listas.map(normalizeLista);
}

async function syncTaskOrders(idAgente, pool = getPgPool()) {
  if (!idAgente) return;
  const { rows: listas } = await pool.query(
    `SELECT * FROM tareas_listas WHERE id_agente = $1 ORDER BY orden_lista ASC, created_at ASC`,
    [idAgente],
  );
  const { rows: tareas } = await pool.query(
    `SELECT id_tarea, lista_tareas FROM tareas_db WHERE agente = $1 ORDER BY created_at ASC`,
    [idAgente],
  );

  for (const lista of listas) {
    const taskIds = new Set(tareas.filter((tarea) => tarea.lista_tareas === lista.id_lista_tareas).map((tarea) => tarea.id_tarea));
    const existing = normalizeOrder(lista.tareas_order_array).map((item) => item.id_tarea).filter((id) => taskIds.has(id));
    const missing = [...taskIds].filter((id) => !existing.includes(id));
    const order = normalizeOrder([...existing, ...missing]);
    await pool.query(
      `UPDATE tareas_listas SET tareas_order_array = $1::jsonb, updated_at = NOW() WHERE id_lista_tareas = $2`,
      [JSON.stringify(order), lista.id_lista_tareas],
    );
  }
}

async function appendTaskToList(pool, idLista, idTarea) {
  if (!idLista || !idTarea) return;
  const { rows } = await pool.query(`SELECT tareas_order_array FROM tareas_listas WHERE id_lista_tareas = $1`, [idLista]);
  if (!rows[0]) return;
  const ordered = normalizeOrder(rows[0].tareas_order_array).filter((item) => item.id_tarea !== idTarea);
  ordered.push({ id_tarea: idTarea, posicion: ordered.length });
  await pool.query(
    `UPDATE tareas_listas SET tareas_order_array = $1::jsonb, updated_at = NOW() WHERE id_lista_tareas = $2`,
    [JSON.stringify(normalizeOrder(ordered)), idLista],
  );
}

async function removeTaskFromList(pool, idLista, idTarea) {
  if (!idLista || !idTarea) return;
  const { rows } = await pool.query(`SELECT tareas_order_array FROM tareas_listas WHERE id_lista_tareas = $1`, [idLista]);
  if (!rows[0]) return;
  const ordered = normalizeOrder(rows[0].tareas_order_array).filter((item) => item.id_tarea !== idTarea);
  await pool.query(
    `UPDATE tareas_listas SET tareas_order_array = $1::jsonb, updated_at = NOW() WHERE id_lista_tareas = $2`,
    [JSON.stringify(normalizeOrder(ordered)), idLista],
  );
}

export async function getTareas(filters = {}) {
  const pool = getPgPool();
  await ensureSchema(pool);
  if (filters.agente) await ensureDefaultLists(filters.agente, pool);

  const values = [];
  const where = [];

  if (filters.agente) {
    values.push(filters.agente);
    where.push(`agente = $${values.length}`);
  }

  const { rows } = await pool.query(
    `
      SELECT *
      FROM tareas_db
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY
        CASE prioridad
          WHEN 'alta' THEN 1
          WHEN 'media' THEN 2
          WHEN 'baja' THEN 3
          ELSE 4
        END,
        created_at DESC
    `,
    values,
  );

  return rows.map(normalizeTarea);
}

export async function createTarea(data = {}) {
  const pool = getPgPool();
  await ensureSchema(pool);
  if (data.agente) await ensureDefaultLists(data.agente, pool);

  const idTarea = data.id_tarea || createTaskId();
  const listaTareas = data.lista_tareas || (await getGeneralListId(data.agente, pool));

  const { rows } = await pool.query(
    `
      INSERT INTO tareas_db (
        id_tarea, agente, titulo, contenido, descripcion, estado, prioridad, lista_tareas,
        fecha_desde, fecha_hasta, relacionada_con_cuenta, relacionada_con_contacto,
        relacionada_con_contenido, relacionada_con_feria, relacionada_con_proveedor
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `,
    [
      idTarea,
      data.agente ?? "",
      data.titulo ?? "",
      data.contenido ?? "",
      data.descripcion ?? "",
      data.estado ?? "pendiente",
      data.prioridad ?? "media",
      listaTareas ?? "",
      data.fecha_desde || null,
      data.fecha_hasta || null,
      data.relacionada_con_cuenta || null,
      data.relacionada_con_contacto || null,
      data.relacionada_con_contenido || null,
      data.relacionada_con_feria || null,
      data.relacionada_con_proveedor || null,
    ],
  );

  await appendTaskToList(pool, listaTareas, idTarea);
  return normalizeTarea(rows[0]);
}

export async function updateTarea(idTarea, data = {}) {
  const pool = getPgPool();
  await ensureSchema(pool);
  const { rows: currentRows } = await pool.query(`SELECT * FROM tareas_db WHERE id_tarea = $1`, [idTarea]);
  const current = currentRows[0];
  if (!current) return null;

  const nextAgente = data.agente ?? current.agente ?? "";
  if (nextAgente) await ensureDefaultLists(nextAgente, pool);
  const nextLista = data.lista_tareas || current.lista_tareas || (await getGeneralListId(nextAgente, pool)) || "";

  const { rows } = await pool.query(
    `
      UPDATE tareas_db
      SET agente = $1,
          titulo = $2,
          contenido = $3,
          descripcion = $4,
          estado = $5,
          prioridad = $6,
          lista_tareas = $7,
          fecha_desde = $8,
          fecha_hasta = $9,
          relacionada_con_cuenta = $10,
          relacionada_con_contacto = $11,
          relacionada_con_contenido = $12,
          relacionada_con_feria = $13,
          relacionada_con_proveedor = $14,
          updated_at = NOW()
      WHERE id_tarea = $15
      RETURNING *
    `,
    [
      nextAgente,
      data.titulo ?? current.titulo ?? "",
      data.contenido ?? current.contenido ?? "",
      data.descripcion ?? current.descripcion ?? "",
      data.estado ?? current.estado ?? "pendiente",
      data.prioridad ?? current.prioridad ?? "media",
      nextLista,
      data.fecha_desde || null,
      data.fecha_hasta || null,
      data.relacionada_con_cuenta || null,
      data.relacionada_con_contacto || null,
      data.relacionada_con_contenido || null,
      data.relacionada_con_feria || null,
      data.relacionada_con_proveedor || null,
      idTarea,
    ],
  );

  if (current.lista_tareas !== nextLista) {
    await removeTaskFromList(pool, current.lista_tareas, idTarea);
    await appendTaskToList(pool, nextLista, idTarea);
  }

  return rows[0] ? normalizeTarea(rows[0]) : null;
}

async function getGeneralListId(idAgente, pool = getPgPool()) {
  if (!idAgente) return "";
  const listas = await ensureDefaultLists(idAgente, pool);
  return listas.find((lista) => lista.nombre_lista_tareas.toLowerCase() === "general")?.id_lista_tareas || listas[0]?.id_lista_tareas || "";
}

export async function deleteTarea(idTarea) {
  const pool = getPgPool();
  await ensureSchema(pool);
  const { rows } = await pool.query(`DELETE FROM tareas_db WHERE id_tarea = $1 RETURNING *`, [idTarea]);
  if (!rows[0]) return null;
  await removeTaskFromList(pool, rows[0].lista_tareas, idTarea);
  return normalizeTarea(rows[0]);
}

export async function getTareasListas(idAgente) {
  const pool = getPgPool();
  await ensureDefaultLists(idAgente, pool);
  const { rows } = await pool.query(
    `
      SELECT *
      FROM tareas_listas
      WHERE id_agente = $1
      ORDER BY orden_lista ASC, created_at ASC
    `,
    [idAgente],
  );
  return rows.map(normalizeLista);
}

export async function createTareasLista(data = {}) {
  const pool = getPgPool();
  await ensureDefaultLists(data.id_agente, pool);
  const { rows: maxRows } = await pool.query(`SELECT COALESCE(MAX(orden_lista), -1) AS max FROM tareas_listas WHERE id_agente = $1 AND LOWER(nombre_lista_tareas) <> 'archivadas'`, [data.id_agente]);
  const orden = Number.isFinite(Number(data.orden_lista)) ? Number(data.orden_lista) : Number(maxRows[0]?.max ?? -1) + 1;
  const idLista = data.id_lista_tareas || createListId();

  const { rows } = await pool.query(
    `
      INSERT INTO tareas_listas (id_lista_tareas, nombre_lista_tareas, id_agente, tareas_order_array, orden_lista)
      VALUES ($1, $2, $3, '[]'::jsonb, $4)
      RETURNING *
    `,
    [idLista, data.nombre_lista_tareas ?? "Nueva lista", data.id_agente ?? "", orden],
  );

  await normalizeListOrders(data.id_agente, pool);
  return normalizeLista(rows[0]);
}

export async function updateTareasLista(idLista, data = {}) {
  const pool = getPgPool();
  await ensureSchema(pool);
  const { rows: currentRows } = await pool.query(`SELECT * FROM tareas_listas WHERE id_lista_tareas = $1`, [idLista]);
  const current = currentRows[0];
  if (!current) return null;

  const nextOrder = Number.isFinite(Number(data.orden_lista)) ? Number(data.orden_lista) : current.orden_lista;
  if (nextOrder !== current.orden_lista) {
    await pool.query(
      `
        UPDATE tareas_listas
        SET orden_lista = CASE
          WHEN id_lista_tareas = $1 THEN $2
          WHEN orden_lista = $2 AND id_agente = $3 THEN $4
          ELSE orden_lista
        END
        WHERE id_agente = $3
      `,
      [idLista, nextOrder, current.id_agente, current.orden_lista],
    );
  }

  const orderArray = data.tareas_order_array ? normalizeOrder(data.tareas_order_array) : normalizeOrder(current.tareas_order_array);
  const { rows } = await pool.query(
    `
      UPDATE tareas_listas
      SET nombre_lista_tareas = $1,
          tareas_order_array = $2::jsonb,
          orden_lista = $3,
          updated_at = NOW()
      WHERE id_lista_tareas = $4
      RETURNING *
    `,
    [
      data.nombre_lista_tareas ?? current.nombre_lista_tareas,
      JSON.stringify(orderArray),
      nextOrder,
      idLista,
    ],
  );

  await normalizeListOrders(current.id_agente, pool);
  return rows[0] ? normalizeLista(rows[0]) : null;
}

export async function deleteTareasLista(idLista, moveToList = "") {
  const pool = getPgPool();
  await ensureSchema(pool);
  const { rows: currentRows } = await pool.query(`SELECT * FROM tareas_listas WHERE id_lista_tareas = $1`, [idLista]);
  const current = currentRows[0];
  if (!current) return null;

  const { rows: tareas } = await pool.query(`SELECT id_tarea FROM tareas_db WHERE lista_tareas = $1 ORDER BY created_at ASC`, [idLista]);
  if (tareas.length && !moveToList) {
    const error = new Error("La lista tiene tareas. Elige una lista destino para moverlas.");
    error.code = "LIST_HAS_TASKS";
    throw error;
  }

  if (tareas.length && moveToList) {
    await pool.query(`UPDATE tareas_db SET lista_tareas = $1, updated_at = NOW() WHERE lista_tareas = $2`, [moveToList, idLista]);
    for (const tarea of tareas) {
      await appendTaskToList(pool, moveToList, tarea.id_tarea);
    }
  }

  const { rows } = await pool.query(`DELETE FROM tareas_listas WHERE id_lista_tareas = $1 RETURNING *`, [idLista]);
  await normalizeListOrders(current.id_agente, pool);
  return rows[0] ? normalizeLista(rows[0]) : null;
}

async function normalizeListOrders(idAgente, pool = getPgPool()) {
  const { rows } = await pool.query(`SELECT id_lista_tareas FROM tareas_listas WHERE id_agente = $1 ORDER BY orden_lista ASC, created_at ASC`, [idAgente]);
  for (const [index, row] of rows.entries()) {
    await pool.query(`UPDATE tareas_listas SET orden_lista = $1 WHERE id_lista_tareas = $2`, [index, row.id_lista_tareas]);
  }
}
