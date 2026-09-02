import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/auth-mail";
import { findAuthUserByEmail } from "@/lib/supabase-auth-admin";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const generic = {
      success: true,
      message: "If that email is registered, we sent a reset link.",
    };

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

    const authUser = await findAuthUserByEmail(email);
    if (!authUser?.id) {
      return NextResponse.json(generic);
    }

    try {
      await sendPasswordResetEmail(req, { id: authUser.id, email });
    } catch (mailError) {
      console.error("/api/forgot-password mail:", mailError);
    }

    return NextResponse.json(generic);
  } catch (error) {
    console.error("/api/forgot-password error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
