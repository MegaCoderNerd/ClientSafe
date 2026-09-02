import { NextResponse } from "next/server";
import { sendConfirmationEmail } from "@/lib/auth-mail";
import { ensureAppUserFromAuth } from "@/lib/ensure-app-user";
import { isMailConfigured } from "@/lib/mail";
import { findAuthUserByEmail, isAuthUserConfirmed } from "@/lib/supabase-auth-admin";
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

export const runtime = "nodejs";
export const maxDuration = 30;

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

    if (!isMailConfigured() && (process.env.VERCEL || process.env.NODE_ENV === "production")) {
      return NextResponse.json(
        { error: "Email sending is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD on Vercel." },
        { status: 500 },
      );
    }

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

    const { data, error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
      user_metadata: { name: name.trim() },
    });

    if (error) {
      console.error("/api/signup auth error:", error);
      if (error.message.toLowerCase().includes("already")) {
        return existingEmailConflict(normalizedEmail);
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ error: "Could not create account" }, { status: 500 });
    }

    const appUser = await ensureAppUserFromAuth(data.user);
    if (!appUser) {
      return NextResponse.json(
        { error: "Account was created but could not be saved. Try resending the confirmation email." },
        { status: 500 },
      );
    }

    try {
      await sendConfirmationEmail(req, { id: data.user.id, email: normalizedEmail });
    } catch (mailError) {
      console.error("/api/signup mail error:", mailError);
      return NextResponse.json(
        {
          success: true,
          needsVerification: true,
          canResend: true,
          error: "Account created, but the confirmation email could not be sent. Check SMTP settings on Vercel.",
        },
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
