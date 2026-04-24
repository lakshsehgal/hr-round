import { createClient, SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_BUCKET = "resumes";
const SIGNED_URL_TTL_SECONDS = 60 * 10; // 10 minutes

let cached: { client: SupabaseClient; bucket: string } | null = null;

function getClient(): { client: SupabaseClient; bucket: string } {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  const bucket = process.env.SUPABASE_BUCKET ?? DEFAULT_BUCKET;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  cached = { client, bucket };
  return cached;
}

export function isStorageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function ensureResumeBucket(): Promise<void> {
  const { client, bucket } = getClient();
  const { data: existing, error: listError } = await client.storage.listBuckets();
  if (listError) throw new Error(`Supabase listBuckets failed: ${listError.message}`);
  if (existing?.some((b) => b.name === bucket)) return;

  const { error } = await client.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: "5MB",
    allowedMimeTypes: ["application/pdf"],
  });
  if (error) throw new Error(`Supabase createBucket failed: ${error.message}`);
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

export async function uploadResume(args: {
  applicationId: string;
  fileName: string;
  buffer: Buffer;
}): Promise<string> {
  const { client, bucket } = getClient();
  const path = `${args.applicationId}/${safeFileName(args.fileName)}`;
  const { error } = await client.storage
    .from(bucket)
    .upload(path, args.buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (error) throw new Error(`Supabase upload failed: ${error.message}`);
  return path;
}

export async function getResumeSignedUrl(path: string): Promise<string> {
  const { client, bucket } = getClient();
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) throw new Error(`Supabase signed URL failed: ${error?.message}`);
  return data.signedUrl;
}
