import { NextResponse } from "next/server";
import { ensureAppUserFromAuth } from "@/lib/ensure-app-user";
import { findAuthUserByEmail, isAuthUserConfirmed } from "@/lib/supabase-auth-admin";
import { getAppOrigin } from "@/lib/supabase-env";
import { getSupabaseAnon } from "@/lib/supabase-anon";
import { supabase } from "@/lib/supabase";

async function existingEmailConflict(email: string) {
  const authUser = await findAuthUserByEmail(email);

  if (!authUser) {
    return NextResponse.json(
      {
        error: "An account with this email already exists. Use password reset to set a password and sign in.",
        canResend: false,
        canResetPassword: true,
      },
      { status: 400 },
    );
  }

  if (!isAuthUserConfirmed(authUser)) {
    return NextResponse.json(
      {
        error: "An account with this email already exists. If you have not verified it yet, resend the confirmation email.",
        canResend: true,
        canResetPassword: false,
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      error: "An account with this email already exists. Sign in, or reset your password if you forgot it.",
      canResend: false,
      canResetPassword: true,
    },
    { status: 400 },
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, password } = body as { email?: string; name?: string; password?: string };

    if (!email || !name || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const origin = getAppOrigin();

    const { data: existing, error: lookupError } = await supabase
      .from("User")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (lookupError) {
      console.error("/api/signup lookup error:", lookupError);
      return NextResponse.json({ error: "Could not create account" }, { status: 500 });
    }

    if (existing) {
      return existingEmailConflict(normalizedEmail);
    }

    const { data, error } = await getSupabaseAnon().auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { name: name.trim() },
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("/api/signup auth error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ error: "Could not create account" }, { status: 500 });
    }

    if (data.user.identities && data.user.identities.length === 0) {
      return existingEmailConflict(normalizedEmail);
    }

    const appUser = await ensureAppUserFromAuth(data.user);
    if (!appUser) {
      return NextResponse.json(
        { error: "Account was created but could not be saved. Try resending the confirmation email." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      needsVerification: true,
      message: "Check your inbox to verify your email before signing in.",
    });
  } catch (error) {
    console.error("/api/signup error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
