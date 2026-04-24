import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { applications } from "@/db/schema";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getResumeSignedUrl, isStorageConfigured } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "Resume storage is not configured" },
      { status: 503 },
    );
  }

  const { id } = await context.params;

  const [row] = await db
    .select({ path: applications.resumeStoragePath })
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);

  if (!row?.path) {
    return NextResponse.json({ error: "No resume on file" }, { status: 404 });
  }

  try {
    const url = await getResumeSignedUrl(row.path);
    return NextResponse.redirect(url, { status: 302 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Could not generate download link" },
      { status: 500 },
    );
  }
}
