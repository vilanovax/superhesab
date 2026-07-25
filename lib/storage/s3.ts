import "server-only";
import { randomBytes } from "node:crypto";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const PRESIGN_PUT_SECONDS = 60 * 10;
const PRESIGN_GET_SECONDS = 60 * 15;

export type StorageConfig = {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl?: string;
};

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY,
  );
}

function readConfig(): StorageConfig {
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 storage is not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.",
    );
  }
  return {
    endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
    region: process.env.S3_REGION?.trim() || "auto",
    bucket,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL?.trim() || undefined,
  };
}

const globalForS3 = globalThis as unknown as {
  superhesabS3?: S3Client;
};

function getClient(): S3Client {
  if (globalForS3.superhesabS3) return globalForS3.superhesabS3;
  const cfg = readConfig();
  const client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: Boolean(cfg.endpoint),
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
  if (process.env.NODE_ENV !== "production") {
    globalForS3.superhesabS3 = client;
  }
  return client;
}

export function getStorageBucket(): string {
  return readConfig().bucket;
}

/** Extension from mime, default bin. */
export function extFromMime(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

export function chargeProofObjectKey(input: {
  spaceId: string;
  paymentId: string;
  mimeType: string;
}): string {
  const id = randomBytes(12).toString("hex");
  const ext = extFromMime(input.mimeType);
  return `spaces/${input.spaceId}/charge-proofs/${input.paymentId}/${id}.${ext}`;
}

export function fundProofObjectKey(input: {
  spaceId: string;
  periodIndex: number;
  memberId: string;
  mimeType: string;
}): string {
  const id = randomBytes(12).toString("hex");
  const ext = extFromMime(input.mimeType);
  return `spaces/${input.spaceId}/fund-proofs/${input.periodIndex}/${input.memberId}/${id}.${ext}`;
}

export async function presignPutObject(input: {
  key: string;
  mimeType: string;
  byteSize: number;
}): Promise<{ uploadUrl: string; key: string }> {
  const cfg = readConfig();
  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: input.key,
    ContentType: input.mimeType,
    ContentLength: input.byteSize,
  });
  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: PRESIGN_PUT_SECONDS,
  });
  return { uploadUrl, key: input.key };
}

export async function presignGetObject(key: string): Promise<string> {
  const cfg = readConfig();
  const client = getClient();
  const command = new GetObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn: PRESIGN_GET_SECONDS });
}
