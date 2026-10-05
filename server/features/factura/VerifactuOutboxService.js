import { getPgPool } from "../../database/pgClient.js";

const finalStatuses = new Set(["ACCEPTED", "ACCEPTED_WITH_ERRORS", "REJECTED", "CANCELLED"]);

export async function claimVerifactuOutbox(workerId) {
  const pool = getPgPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`UPDATE fiscal_verifactu_envios SET status=CASE WHEN attempts>=10 THEN 'INCIDENT' ELSE 'RETRY_PENDING' END,available_at=now(),locked_at=NULL,locked_by=NULL,last_error='El envío perdió su bloqueo; se reintentará con la misma identidad fiscal',updated_at=now() WHERE status='SENDING' AND locked_at < now()-interval '10 minutes'`);
    const { rows } = await client.query(`
      SELECT * FROM fiscal_verifactu_envios
      WHERE status IN ('PENDING','RETRY_PENDING') AND available_at<=NOW()
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED LIMIT 1
    `);
    if (!rows[0]) { await client.query("COMMIT"); return null; }
    const claimed = await client.query(`
      UPDATE fiscal_verifactu_envios SET status='SENDING',locked_at=NOW(),locked_by=$1,
        attempts=attempts+1,updated_at=NOW() WHERE id=$2 RETURNING *
    `, [workerId, rows[0].id]);
    await client.query("COMMIT");
    return claimed.rows[0];
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function completeVerifactuOutbox(idOutbox, response = {}, workerId = null) {
  const pool = getPgPool();
  const status = String(response.status || "").toUpperCase();
  if (!finalStatuses.has(status)) throw new Error("Estado final de AEAT no válido");
  const db=await pool.connect();
  try { await db.query('BEGIN');
  const { rows } = await db.query(`
    UPDATE fiscal_verifactu_envios SET status=$1,response_xml=$2,response_json=$3::jsonb,
      aeat_csv=$4,aeat_error_code=$5,aeat_error_description=$6,sent_at=COALESCE(sent_at,NOW()),
      accepted_at=CASE WHEN $1 IN ('ACCEPTED','ACCEPTED_WITH_ERRORS') THEN NOW() ELSE accepted_at END,
      locked_at=NULL,locked_by=NULL,updated_at=NOW() WHERE id=$7 AND status='SENDING' AND ($8::text IS NULL OR locked_by=$8) RETURNING *
  `, [status,response.xml || null,JSON.stringify(response.structured || {}),response.csv || null,
    response.errorCode || null,response.errorDescription || null,idOutbox,workerId]);
  if(rows[0]) await db.query(`UPDATE administracion_facturas_clientes f SET verifactu_aeat_status=$1 WHERE f.id_factura_cliente=(SELECT invoice_id FROM fiscal_verifactu_registros WHERE id=$2)`,[status,rows[0].record_id]);
  await db.query('COMMIT');return rows[0] || null;
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}

export async function retryVerifactuOutbox(idOutbox, error, delaySeconds = 300, workerId = null) {
  const pool = getPgPool();
  const { rows } = await pool.query(`
    UPDATE fiscal_verifactu_envios SET status=CASE WHEN attempts>=10 THEN 'INCIDENT' ELSE 'RETRY_PENDING' END,
      last_error=$1,available_at=NOW()+($2||' seconds')::interval,locked_at=NULL,locked_by=NULL,
      updated_at=NOW() WHERE id=$3 AND status='SENDING' AND ($4::text IS NULL OR locked_by=$4) RETURNING *
  `, [String(error?.message || error || "Error desconocido"),Math.max(1,Number(delaySeconds)||300),idOutbox,workerId]);
  return rows[0] || null;
}

export async function processNextVerifactuOutbox({ workerId, sendToAeat }) {
  if (typeof sendToAeat !== "function") throw new Error("El adaptador AEAT es obligatorio");
  const job = await claimVerifactuOutbox(workerId);
  if (!job) return null;
  try {
    const response = await sendToAeat(job.request_xml);
    return await completeVerifactuOutbox(job.id, response, workerId);
  } catch (error) {
    return retryVerifactuOutbox(job.id, error,Math.min(3600,30*2**Math.min(job.attempts,7)),workerId);
  }
}
