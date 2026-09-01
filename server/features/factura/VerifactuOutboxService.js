import { getPgPool } from "../../database/pgClient.js";

const finalStatuses = new Set(["ACCEPTED", "ACCEPTED_WITH_ERRORS", "REJECTED", "CANCELLED"]);

export async function claimVerifactuOutbox(workerId) {
  const pool = getPgPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(`
      SELECT * FROM verifactu_outbox
      WHERE status IN ('PENDING','RETRY_PENDING') AND available_at<=NOW()
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED LIMIT 1
    `);
    if (!rows[0]) { await client.query("COMMIT"); return null; }
    const claimed = await client.query(`
      UPDATE verifactu_outbox SET status='SENDING',locked_at=NOW(),locked_by=$1,
        attempts=attempts+1,updated_at=NOW() WHERE id=$2 RETURNING *
    `, [workerId, rows[0].id]);
    await client.query("COMMIT");
    return claimed.rows[0];
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function completeVerifactuOutbox(idOutbox, response = {}) {
  const pool = getPgPool();
  const status = String(response.status || "").toUpperCase();
  if (!finalStatuses.has(status)) throw new Error("Estado final de AEAT no válido");
  const { rows } = await pool.query(`
    UPDATE verifactu_outbox SET status=$1,response_xml=$2,response_json=$3::jsonb,
      aeat_csv=$4,aeat_error_code=$5,aeat_error_description=$6,sent_at=COALESCE(sent_at,NOW()),
      accepted_at=CASE WHEN $1 IN ('ACCEPTED','ACCEPTED_WITH_ERRORS') THEN NOW() ELSE accepted_at END,
      locked_at=NULL,locked_by=NULL,updated_at=NOW() WHERE id=$7 RETURNING *
  `, [status,response.xml || null,JSON.stringify(response.structured || {}),response.csv || null,
    response.errorCode || null,response.errorDescription || null,idOutbox]);
  return rows[0] || null;
}

export async function retryVerifactuOutbox(idOutbox, error, delaySeconds = 300) {
  const pool = getPgPool();
  const { rows } = await pool.query(`
    UPDATE verifactu_outbox SET status=CASE WHEN attempts>=10 THEN 'INCIDENT' ELSE 'RETRY_PENDING' END,
      last_error=$1,available_at=NOW()+($2||' seconds')::interval,locked_at=NULL,locked_by=NULL,
      updated_at=NOW() WHERE id=$3 RETURNING *
  `, [String(error?.message || error || "Error desconocido"),Math.max(1,Number(delaySeconds)||300),idOutbox]);
  return rows[0] || null;
}

export async function processNextVerifactuOutbox({ workerId, sendToAeat }) {
  if (typeof sendToAeat !== "function") throw new Error("El adaptador AEAT es obligatorio");
  const job = await claimVerifactuOutbox(workerId);
  if (!job) return null;
  try {
    const response = await sendToAeat(job.request_xml);
    return await completeVerifactuOutbox(job.id, response);
  } catch (error) {
    return retryVerifactuOutbox(job.id, error);
  }
}
