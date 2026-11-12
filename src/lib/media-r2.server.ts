import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListPartsCommand,
  S3Client,
  UploadPartCommand,
  type Part,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PART_URL_SECONDS, PLAYBACK_SECONDS, readR2Env, type R2Env } from "./media-object.ts";
import type { StoragePort } from "./media-store.ts";

/**
 * Cloudflare R2 speaks the S3 API. The bucket stays private. The browser only
 * ever receives a short-lived URL for one part or one playback.
 *
 * Bucket CORS (R2 → bucket → Settings → CORS policy). Replace the origins with
 * the live site and any local preview, scheme included, no path:
 *
 * [
 *   {
 *     "AllowedOrigins": ["https://your-live-host", "http://localhost:8080"],
 *     "AllowedMethods": ["GET", "PUT", "HEAD"],
 *     "AllowedHeaders": ["*"],
 *     "ExposeHeaders": ["ETag"],
 *     "MaxAgeSeconds": 3600
 *   }
 * ]
 *
 * ETag must be exposed or the browser cannot finish a multipart upload.
 */
let client: S3Client | null = null;
let clientKey = "";

function s3(env: R2Env): S3Client {
  const key = `${env.accountId}:${env.accessKeyId}:${env.bucket}`;
  if (client && clientKey === key) return client;
  client = new S3Client({
    region: "auto",
    endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  clientKey = key;
  return client;
}

export function cloudConfigured(): boolean {
  return readR2Env(process.env) !== null;
}

export function storagePort(): StoragePort | null {
  const env = readR2Env(process.env);
  if (!env) return null;
  const bucket = env.bucket;
  const api = s3(env);
  return {
    async start(key, mime) {
      const created = await api.send(
        new CreateMultipartUploadCommand({
          Bucket: bucket,
          Key: key,
          ContentType: mime || "application/octet-stream",
        }),
      );
      if (!created.UploadId) throw new Error("Could not start the upload.");
      return created.UploadId;
    },
    signPart(key, uploadId, partNumber) {
      return getSignedUrl(
        api,
        new UploadPartCommand({ Bucket: bucket, Key: key, UploadId: uploadId, PartNumber: partNumber }),
        { expiresIn: PART_URL_SECONDS },
      );
    },
    async parts(key, uploadId) {
      const found: { partNumber: number; etag: string }[] = [];
      let marker: string | undefined;
      do {
        const page = await api.send(
          new ListPartsCommand({
            Bucket: bucket,
            Key: key,
            UploadId: uploadId,
            PartNumberMarker: marker,
          }),
        );
        for (const part of page.Parts ?? []) {
          if (part.PartNumber && part.ETag) found.push({ partNumber: part.PartNumber, etag: part.ETag });
        }
        marker = page.IsTruncated ? page.NextPartNumberMarker : undefined;
      } while (marker);
      return found;
    },
    async finish(key, uploadId, parts) {
      const Parts: Part[] = parts.map((part) => ({ PartNumber: part.partNumber, ETag: part.etag }));
      await api.send(
        new CompleteMultipartUploadCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: { Parts },
        }),
      );
    },
    async cancel(key, uploadId) {
      await api.send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: uploadId }));
    },
    readUrl(key, mime, fileName) {
      const safeName = fileName.replace(/["\r\n]/g, "") || "file";
      return getSignedUrl(
        api,
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
          ResponseContentType: mime || undefined,
          ResponseContentDisposition: `inline; filename="${safeName}"`,
        }),
        { expiresIn: PLAYBACK_SECONDS },
      );
    },
    async remove(key) {
      await api.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}
