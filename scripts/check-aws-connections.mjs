// Read-only checks. Never prints credentials, object keys or personal records.
import env from '@next/env';
import { S3Client, HeadBucketCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import { getPgPool } from '../server/database/pgClient.js';

env.loadEnvConfig(process.cwd());
const report = {};
async function check(name, fn) {
  try { report[name] = { ok: true, ...await fn() }; }
  catch (error) { report[name] = { ok: false, error: error.code || error.name, status: error.$metadata?.httpStatusCode }; }
  console.log(JSON.stringify({ [name]: report[name] }));
}
const region = process.env.IAM_REGION || process.env.AWS_REGION || process.env.NEXT_PUBLIC_COGNITO_REGION || 'eu-south-2';
const accessKeyId = process.env.IAM_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.IAM_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const bucket = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET;
const s3 = new S3Client({ region, maxAttempts: 1,
  ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}) });
const pool = getPgPool();
try {
  await check('rds', async () => {
    const db = await pool.connect();
    try {
      await db.query('BEGIN READ ONLY');
      await db.query("SET LOCAL statement_timeout='5s'");
      const tls = (await db.query('SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()')).rows[0]?.ssl;
      const counts = (await db.query(`SELECT (SELECT count(*)::int FROM comercial_cuentas) cuentas,
        (SELECT count(*)::int FROM tesoreria_ordenes) ordenes,
        (SELECT count(*)::int FROM mediateca_archivos) archivos,
        (SELECT count(*)::int FROM laboral_documentos WHERE s3_key IS NOT NULL) documentos_s3,
        (SELECT count(*)::int FROM laboral_documentos WHERE contenido IS NOT NULL) documentos_rds,
        (SELECT count(*)::int FROM comercial_cuentas WHERE id_cuenta ILIKE '%demo%') cuentas_identificadas_demo`)).rows[0];
      return { awsHost: /\.rds\.amazonaws\.com$/.test(process.env.DATABASE_HOST || ''), tls, counts };
    } finally { await db.query('ROLLBACK'); db.release(); }
  });
  await check('s3', async () => {
    if (!bucket) throw Object.assign(new Error(), { code: 'S3_BUCKET_NOT_CONFIGURED' });
    await s3.send(new HeadBucketCommand({ Bucket: bucket }), { abortSignal: AbortSignal.timeout(15000) });
    return { reachable: true };
  });
  await check('s3_object_and_cdn', async () => {
    if (!bucket) throw Object.assign(new Error(), { code: 'S3_BUCKET_NOT_CONFIGURED' });
    const listing = await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }), { abortSignal: AbortSignal.timeout(15000) });
    const key = listing.Contents?.[0]?.Key;
    if (!key) return { sample: 'empty bucket; object read not checked' };
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: AbortSignal.timeout(15000) });
    const host = (process.env.NEXT_PUBLIC_CLOUDFRONT_URL || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const cdn = host ? await fetch('https://' + host + '/' + key.split('/').map(encodeURIComponent).join('/'), { method: 'HEAD', signal: AbortSignal.timeout(15000) }) : null;
    return { objectReadable: true, cdnStatus: cdn?.status ?? 'not configured' };
  });
  await check('cognito_jwks', async () => {
    const response = await fetch(`https://cognito-idp.${process.env.NEXT_PUBLIC_COGNITO_REGION}.amazonaws.com/${process.env.NEXT_PUBLIC_USER_POOL_ID}/.well-known/jwks.json`, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('JwksUnavailable');
    return { keysAvailable: Boolean((await response.json()).keys?.length) };
  });
  await check('cognito_admin', async () => {
    const cognito = new CognitoIdentityProviderClient({ region: process.env.NEXT_PUBLIC_COGNITO_REGION, maxAttempts: 1 });
    try {
      const response = await cognito.send(new ListUsersCommand({ UserPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID, Limit: 1 }), { abortSignal: AbortSignal.timeout(15000) });
      return { hasUsers: Boolean(response.Users?.length) };
    } finally { cognito.destroy(); }
  });
} finally { s3.destroy(); await pool.end(); }
if (Object.values(report).some(result => !result.ok || (typeof result.cdnStatus === 'number' && result.cdnStatus >= 400))) process.exitCode = 1;
