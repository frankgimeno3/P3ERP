import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { LaboralError } from './validation.js';
import { addDocument, documentOwner, getDocument } from './LaboralRepository.js';

let client;
function storage() {
  const bucket = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET;
  if (!bucket) throw new LaboralError('No está configurado el almacenamiento de documentos.', 503);
  if (!client) {
    const accessKeyId = process.env.IAM_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.IAM_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    client = new S3Client({
      region: process.env.IAM_REGION || process.env.AWS_REGION || process.env.NEXT_PUBLIC_COGNITO_REGION || 'eu-south-2',
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
  }
  return { bucket, client };
}
export async function uploadDocument(request, kind, ownerId) {
  await documentOwner(kind, ownerId);
  const limit = 15 * 1024 * 1024;
  if (Number(request.headers.get('content-length')) > limit + 65536) throw new LaboralError('El archivo supera los 15 MB.', 413);
  const form = await request.formData(), file = form.get('file');
  if (!file || typeof file.arrayBuffer !== 'function' || !file.size || file.size > limit) throw new LaboralError('Selecciona un archivo de entre 1 byte y 15 MB.');
  const id = randomUUID(), contenido = Buffer.from(await file.arrayBuffer());
  const metadata = { id, nombre: file.name.slice(0,255), contentType: file.type || 'application/octet-stream', size: file.size };
  if (!(process.env.AWS_S3_BUCKET || process.env.S3_BUCKET)) return addDocument(kind, ownerId, { ...metadata, contenido });
  const { bucket, client } = storage();
  const key = `laboral/${kind}/${ownerId}/${id}`;
  // Documents are downloaded only through the authenticated Dirección endpoint.
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: contenido, ContentType: 'application/octet-stream', ContentDisposition: 'attachment' }));
  try {
    return await addDocument(kind, ownerId, { ...metadata, key });
  } catch (error) {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    throw error;
  }
}
export async function downloadDocument(id) {
  const doc = await getDocument(id);
  let bytes = doc.contenido;
  if (!bytes) {
    const { bucket, client } = storage();
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: doc.s3_key }));
    bytes = await result.Body.transformToByteArray();
  }
  return new Response(bytes, { headers: {
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(doc.nombre).replaceAll("'", '%27')}`,
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
  } });
}
