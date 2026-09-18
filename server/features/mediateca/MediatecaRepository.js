import crypto from "node:crypto";
import { getPgPool } from "../../database/pgClient.js";
import { createPresignedUpload, deleteObjectFromS3 } from "./S3Service.js";

export function normalizeMediatecaRouteSegment(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s\-_–—]+/g, "_")
    .replace(/[^a-z0-9_]+/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeSegment(value) {
  return normalizeMediatecaRouteSegment(value);
}

function pathSegments(path) {
  return String(path || "")
    .split("/")
    .map(normalizeSegment)
    .filter(Boolean);
}

function buildUrl(row) {
  if (row.mediateca_content_src) return row.mediateca_content_src;
  const host = String(process.env.NEXT_PUBLIC_CLOUDFRONT_URL || "").replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return host && row.mediateca_s3_key ? `https://${host}/${row.mediateca_s3_key}` : "";
}

function mediaTypeFromMime(mimeType, fallback = "image") {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.includes("pdf")) return "pdf";
  return fallback === "pdf" ? "pdf" : "image";
}

function normalizeFolder(row, path = "") {
  return {
    id: row.mediateca_folder_id,
    name: row.mediateca_folder_name || "",
    parentId: row.mediateca_parent_folder_id || null,
    path,
  };
}

function normalizeMedia(row, folderPath = "") {
  const mimeType = row.mediateca_content_mime_type || "";
  const type = row.mediateca_content_type || mediaTypeFromMime(mimeType);
  return {
    id: row.mediateca_content_id,
    name: row.mediateca_content_name || "",
    s3Key: row.mediateca_s3_key || "",
    url: buildUrl(row),
    folderId: row.mediateca_folder_id || null,
    folderPath,
    type,
    mimeType,
    createdAt: row.mediateca_content_created_at,
    updatedAt: row.mediateca_content_updated_at,
  };
}

async function getFolderRowById(client, folderId) {
  if (!folderId) return null;
  const { rows } = await client.query(
    "SELECT * FROM mediateca_carpetas WHERE mediateca_folder_id = $1 LIMIT 1",
    [folderId],
  );
  return rows[0] || null;
}

export async function getFolderPathById(folderId) {
  const pool = getPgPool();
  const segments = [];
  let currentId = folderId || null;
  while (currentId) {
    const row = await getFolderRowById(pool, currentId);
    if (!row) break;
    segments.unshift(row.mediateca_folder_name);
    currentId = row.mediateca_parent_folder_id;
  }
  return segments.join("/");
}

export async function getFolderIdByPath(path) {
  const pool = getPgPool();
  let parentId = null;
  for (const segment of pathSegments(path)) {
    const values = [segment.toLowerCase()];
    let parentSql = "mediateca_parent_folder_id IS NULL";
    if (parentId) {
      values.push(parentId);
      parentSql = `mediateca_parent_folder_id = $${values.length}`;
    }
    const { rows } = await pool.query(
      `
        SELECT mediateca_folder_id
        FROM mediateca_carpetas
        WHERE lower(regexp_replace(mediateca_folder_name, '\\s+', ' ', 'g')) = $1
          AND ${parentSql}
        ORDER BY mediateca_folder_created_at ASC
        LIMIT 1
      `,
      values,
    );
    if (!rows[0]) return null;
    parentId = rows[0].mediateca_folder_id;
  }
  return parentId;
}

export async function getFolders({ path = "" } = {}) {
  const pool = getPgPool();
  const parentId = await getFolderIdByPath(path);
  if (pathSegments(path).length > 0 && !parentId) return [];
  const values = [];
  let where = "mediateca_parent_folder_id IS NULL";
  if (parentId) {
    values.push(parentId);
    where = `mediateca_parent_folder_id = $1`;
  }
  const { rows } = await pool.query(
    `
      SELECT *
      FROM mediateca_carpetas
      WHERE ${where}
      ORDER BY mediateca_folder_name ASC
    `,
    values,
  );
  return rows.map((row) => normalizeFolder(row, path ? `${path}/${row.mediateca_folder_name}` : row.mediateca_folder_name));
}

export async function getFolderByPath(path) {
  const id = await getFolderIdByPath(path);
  if (!id) return null;
  const pool = getPgPool();
  const row = await getFolderRowById(pool, id);
  return row ? normalizeFolder(row, await getFolderPathById(id)) : null;
}

export async function createFolder(data) {
  const pool = getPgPool();
  const name = normalizeSegment(data?.name);
  const path = String(data?.path || "").trim();
  if (!name) throw new Error("name is required");
  const parentId = await getFolderIdByPath(path);
  if (pathSegments(path).length > 0 && !parentId) throw new Error("Parent folder not found");

  const existsValues = [name.toLowerCase()];
  let parentSql = "mediateca_parent_folder_id IS NULL";
  if (parentId) {
    existsValues.push(parentId);
    parentSql = `mediateca_parent_folder_id = $${existsValues.length}`;
  }
  const existing = await pool.query(
    `
      SELECT mediateca_folder_id
      FROM mediateca_carpetas
      WHERE lower(regexp_replace(mediateca_folder_name, '\\s+', ' ', 'g')) = $1
        AND ${parentSql}
      LIMIT 1
    `,
    existsValues,
  );
  if (existing.rows[0]) throw new Error("Ya existe una carpeta con ese nombre en esta ruta");

  const id = crypto.randomUUID();
  const { rows } = await pool.query(
    `
      INSERT INTO mediateca_carpetas (mediateca_folder_id, mediateca_folder_name, mediateca_parent_folder_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [id, name, parentId],
  );
  return normalizeFolder(rows[0], path ? `${path}/${name}` : name);
}

export async function updateFolder(folderId, data) {
  const pool = getPgPool();
  const name = normalizeSegment(data?.name);
  if (!name) throw new Error("name is required");
  const current = await getFolderRowById(pool, folderId);
  if (!current) throw new Error("Folder not found");
  const { rows } = await pool.query(
    `
      UPDATE mediateca_carpetas
      SET mediateca_folder_name = $2,
          mediateca_folder_updated_at = NOW()
      WHERE mediateca_folder_id = $1
      RETURNING *
    `,
    [folderId, name],
  );
  return normalizeFolder(rows[0], await getFolderPathById(folderId));
}

async function descendantFolderIds(client, folderId) {
  const ids = [folderId];
  let frontier = [folderId];
  while (frontier.length) {
    const { rows } = await client.query(
      "SELECT mediateca_folder_id FROM mediateca_carpetas WHERE mediateca_parent_folder_id = ANY($1::uuid[])",
      [frontier],
    );
    frontier = rows.map((row) => row.mediateca_folder_id);
    ids.push(...frontier);
  }
  return ids;
}

export async function deleteFolder(folderId) {
  const pool = getPgPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await getFolderRowById(client, folderId);
    if (!current) throw new Error("Folder not found");
    const folderIds = await descendantFolderIds(client, folderId);
    const media = await client.query(
      "SELECT mediateca_content_id, mediateca_s3_key FROM mediateca_archivos WHERE mediateca_folder_id = ANY($1::uuid[])",
      [folderIds],
    );
    for (const row of media.rows) {
      if (row.mediateca_s3_key) {
        try {
          await deleteObjectFromS3(row.mediateca_s3_key);
        } catch (error) {
          console.warn("Mediateca delete folder S3 warning:", error?.message || error);
        }
      }
    }
    await client.query("DELETE FROM mediateca_archivos WHERE mediateca_folder_id = ANY($1::uuid[])", [folderIds]);
    await client.query("DELETE FROM mediateca_carpetas WHERE mediateca_folder_id = ANY($1::uuid[])", [folderIds]);
    await client.query("COMMIT");
    return { deleted: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getMedia(params = {}) {
  const pool = getPgPool();
  const folderIdParam = String(params.folderId || "").trim();
  const folderPath = String(params.folderPath || "").trim();
  const search = String(params.search || "").trim();
  const folderId = folderIdParam || await getFolderIdByPath(folderPath);
  if (pathSegments(folderPath).length > 0 && !folderId) return [];
  const values = [];
  let where = "m.mediateca_folder_id IS NULL";
  if (folderId) {
    values.push(folderId);
    where = `m.mediateca_folder_id = $${values.length}`;
  }
  if (search) {
    values.push(`%${search}%`);
    where += ` AND m.mediateca_content_name ILIKE $${values.length}`;
  }
  const { rows } = await pool.query(
    `
      SELECT m.*
      FROM mediateca_archivos m
      WHERE ${where}
      ORDER BY m.mediateca_content_created_at DESC
    `,
    values,
  );
  const resolvedPath = folderId ? await getFolderPathById(folderId) : "";
  return rows.map((row) => normalizeMedia(row, resolvedPath));
}

export async function createPresign(data) {
  return createPresignedUpload({
    filename: data?.filename,
    contentType: data?.contentType,
    prefix: data?.prefix,
  });
}

export async function createMedia(data) {
  const pool = getPgPool();
  const id = String(data?.mediaId || data?.id || crypto.randomUUID()).trim();
  const name = normalizeSegment(data?.contentName || data?.name);
  const s3Key = String(data?.s3Key || "").trim();
  if (!id || !name || !s3Key) throw new Error("mediaId, name and s3Key are required");
  const folderId = data?.folderId ? String(data.folderId).trim() : await getFolderIdByPath(data?.folderPath || "");
  if (String(data?.folderPath || "").trim() && !folderId) throw new Error("Destination folder not found");
  const mimeType = String(data?.contentType || data?.mimeType || "").trim();
  const type = data?.type === "pdf" || data?.type === "image" ? data.type : mediaTypeFromMime(mimeType);
  const cdnUrl = String(data?.cdnUrl || "").trim();
  const { rows } = await pool.query(
    `
      INSERT INTO mediateca_archivos (
        mediateca_content_id,
        mediateca_folder_id,
        mediateca_content_name,
        mediateca_s3_key,
        mediateca_content_src,
        mediateca_content_mime_type,
        mediateca_content_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [id, folderId || null, name, s3Key, cdnUrl, mimeType, type],
  );
  return normalizeMedia(rows[0], folderId ? await getFolderPathById(folderId) : "");
}

export async function getMediaById(mediaId) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    "SELECT * FROM mediateca_archivos WHERE mediateca_content_id = $1 LIMIT 1",
    [mediaId],
  );
  if (!rows[0]) return null;
  const folderPath = rows[0].mediateca_folder_id ? await getFolderPathById(rows[0].mediateca_folder_id) : "";
  return normalizeMedia(rows[0], folderPath);
}

export async function updateMedia(mediaId, data) {
  const pool = getPgPool();
  const current = await getMediaById(mediaId);
  if (!current) throw new Error("Media not found");
  const updates = [];
  const values = [];
  if (data?.contentName != null || data?.name != null) {
    values.push(normalizeSegment(data.contentName || data.name));
    updates.push(`mediateca_content_name = $${values.length}`);
  }
  if (Object.prototype.hasOwnProperty.call(data || {}, "folderPath")) {
    const folderPath = String(data.folderPath || "").trim();
    const folderId = folderPath ? await getFolderIdByPath(folderPath) : null;
    if (folderPath && !folderId) throw new Error("Destination folder not found");
    values.push(folderId);
    updates.push(`mediateca_folder_id = $${values.length}`);
  }
  if (!updates.length) return current;
  values.push(mediaId);
  await pool.query(
    `
      UPDATE mediateca_archivos
      SET ${updates.join(", ")},
          mediateca_content_updated_at = NOW()
      WHERE mediateca_content_id = $${values.length}
    `,
    values,
  );
  return getMediaById(mediaId);
}

export async function deleteMedia(mediaId) {
  const pool = getPgPool();
  const current = await getMediaById(mediaId);
  if (!current) throw new Error("Media not found");
  if (current.s3Key) {
    try {
      await deleteObjectFromS3(current.s3Key);
    } catch (error) {
      console.warn("Mediateca delete media S3 warning:", error?.message || error);
    }
  }
  await pool.query("DELETE FROM mediateca_archivos WHERE mediateca_content_id = $1", [mediaId]);
  return { deleted: true };
}
