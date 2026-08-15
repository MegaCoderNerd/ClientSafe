import { findAuthUserByEmail, isAuthUserConfirmed } from "@/lib/supabase-auth-admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ needsVerification: false });
    }

    const user = await findAuthUserByEmail(email);
    return NextResponse.json({ needsVerification: Boolean(user) && !isAuthUserConfirmed(user) });
  } catch (error) {
    console.error("/api/auth/needs-verification error:", error);
    return NextResponse.json({ needsVerification: false });
  }
}
