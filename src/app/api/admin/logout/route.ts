import { NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/admin-auth";

export async function POST(request: Request) {
  await clearAdminCookie();
  const url = new URL("/admin/login", request.url);
  return NextResponse.redirect(url, { status: 303 });
}
