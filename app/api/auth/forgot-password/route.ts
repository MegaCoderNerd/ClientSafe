import { NextResponse } from "next/server";
import { getAppOrigin } from "@/lib/supabase-env";
import { supabaseAnon } from "@/lib/supabase-anon";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const origin = getAppOrigin();
    const redirectTo = `${origin}/auth/callback?next=/auth/update-password`;

    const { data: appUser } = await supabase.from("User").select("id, email").eq("email", email).maybeSingle();
    if (appUser) {
      const { error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        password: crypto.randomUUID(),
      });

      if (createError && !createError.message.toLowerCase().includes("already")) {
        console.error("/api/forgot-password createUser:", createError);
      }
    }

    const { error } = await supabaseAnon.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      console.error("/api/forgot-password:", error);
    }

    return NextResponse.json({
      success: true,
      message: "If that email is registered, we sent a reset link.",
    });
  } catch (error) {
    console.error("/api/forgot-password error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
