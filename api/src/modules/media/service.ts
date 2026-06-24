import { randomUUID } from "node:crypto";

// Subida de media vía URL prefirmada a Cloudflare R2 (S3-compatible).
// El cliente sube directo a R2 con la URL firmada; la API no recibe el binario.
// Si R2 no está configurado, devuelve un error claro (no rompe el resto).

export class NotConfiguredError extends Error {}
export class ValidationError extends Error {}

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

function r2Config() {
  const {
    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE,
  } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    return null;
  }
  return { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE };
}

export interface PresignResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

// Genera una URL PUT prefirmada. folder: 'avatars' | 'media'.
export async function presignUpload(
  userId: string, folder: "avatars" | "media", contentType: string, sizeBytes: number,
): Promise<PresignResult> {
  const ext = ALLOWED_TYPES[contentType];
  if (!ext) throw new ValidationError("tipo de archivo no permitido");
  if (sizeBytes > MAX_BYTES) throw new ValidationError("archivo demasiado grande (máx 8MB)");

  const cfg = r2Config();
  if (!cfg) throw new NotConfiguredError("storage no configurado");

  // import dinámico: el SDK solo se carga si R2 está configurado.
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${cfg.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: cfg.R2_ACCESS_KEY_ID, secretAccessKey: cfg.R2_SECRET_ACCESS_KEY },
  });

  const key = `${folder}/${userId}/${randomUUID()}.${ext}`;
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: cfg.R2_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  );
  const publicUrl = cfg.R2_PUBLIC_BASE ? `${cfg.R2_PUBLIC_BASE}/${key}` : key;
  return { uploadUrl, publicUrl, key, expiresIn: 300 };
}
