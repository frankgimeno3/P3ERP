// Removes only abandoned staged invoice uploads, never registered invoices.
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {deleteObjectFromS3} from '../server/features/mediateca/S3Service.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool();
try{
  const candidates=(await pool.query("UPDATE administracion_facturas_subidas u SET state='deleting' WHERE u.state IN ('pending','deleting') AND u.created_at<now()-interval '48 hours' AND NOT EXISTS(SELECT 1 FROM administracion_facturas_proveedores f WHERE f.documento_src=u.url) RETURNING id,s3_key")).rows;
  let removed=0,failed=0;
  for(const row of candidates)try{await deleteObjectFromS3(row.s3_key);await pool.query("UPDATE administracion_facturas_subidas SET state='removed' WHERE id=$1 AND state='deleting'",[row.id]);removed++;}catch{failed++;}
  console.log(JSON.stringify({removed,failed}));
}finally{await pool.end();}
