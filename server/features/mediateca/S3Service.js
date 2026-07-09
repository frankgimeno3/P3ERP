import crypto from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region =
  process.env.IAM_REGION ||
  process.env.AWS_REGION ||
  process.env.NEXT_PUBLIC_COGNITO_REGION ||
  "eu-south-2";
const bucket = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET || "";
const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL || "";

let client;

function getCredentials() {
  const accessKeyId = process.env.IAM_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.IAM_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  return accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;
}

function getClient() {
  if (!client) {
    client = new S3Client({
      region,
      ...(getCredentials() ? { credentials: getCredentials() } : {}),
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return client;
}

function cleanFilename(filename) {
  const raw = String(filename || "file.bin").trim();
  const dotIndex = raw.lastIndexOf(".");
  const base = dotIndex > 0 ? raw.slice(0, dotIndex) : raw;
  const ext = dotIndex > 0 ? raw.slice(dotIndex + 1) : "";
  const normalizedBase =
    base
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[\s\-_–—]+/g, "_")
      .replace(/[^a-z0-9_]+/g, "")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 150) || "archivo";
  const normalizedExt = ext
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 16);
  return normalizedExt ? `${normalizedBase}.${normalizedExt}` : normalizedBase;
}

function cdnUrlForKey(s3Key) {
  const host = String(cloudFrontUrl || "").replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return host ? `https://${host}/${s3Key}` : "";
}

export async function createPresignedUpload({ filename, contentType }) {
  if (!bucket) throw new Error("S3 bucket is not configured. Set AWS_S3_BUCKET or S3_BUCKET in .env.");
  const mediaId = crypto.randomUUID();
  const safeName = cleanFilename(filename);
  const s3Key = `mediateca/${mediaId}/${safeName}`;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    ContentType: contentType || "application/octet-stream",
  });
  const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn: 300 });
  return { uploadUrl, mediaId, s3Key, cdnUrl: cdnUrlForKey(s3Key) || undefined };
}

export async function deleteObjectFromS3(s3Key) {
  if (!bucket) throw new Error("S3 bucket is not configured. Set AWS_S3_BUCKET or S3_BUCKET in .env.");
  const key = String(s3Key || "").trim();
  if (!key) throw new Error("s3Key is required");
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
