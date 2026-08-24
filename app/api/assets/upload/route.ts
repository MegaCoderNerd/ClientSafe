import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Direct uploads are disabled. Use signed Supabase Storage uploads." },
    { status: 410 },
  );
}
