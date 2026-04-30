import { put } from "@vercel/blob";

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

export async function uploadResumePdf(args: {
  applicationId: string;
  fileName: string;
  buffer: Buffer;
}): Promise<string> {
  const path = `resumes/${args.applicationId}/${safeFileName(args.fileName)}`;
  const blob = await put(path, args.buffer, {
    access: "public",
    contentType: "application/pdf",
    addRandomSuffix: true, // unguessable URL — treated as a secret in admin
  });
  return blob.url;
}
