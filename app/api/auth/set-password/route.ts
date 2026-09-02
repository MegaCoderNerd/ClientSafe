import { verifyAuthEmailToken } from "@/lib/auth-email-token";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body.token ?? "");
    const password = String(body.password ?? "");

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const payload = verifyAuthEmailToken(token, "reset");
    if (!payload) {
      return NextResponse.json({ error: "This reset link is invalid or expired. Request a new one." }, { status: 400 });
    }

    const { error } = await supabase.auth.admin.updateUserById(payload.uid, {
      password,
      email_confirm: true,
    });

    if (error) {
      console.error("/api/auth/set-password:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("/api/auth/set-password error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
