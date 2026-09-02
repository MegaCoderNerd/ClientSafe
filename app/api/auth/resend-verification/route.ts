import { NextResponse } from "next/server";
import { sendConfirmationEmail } from "@/lib/auth-mail";
import { findAuthUserByEmail, isAuthUserConfirmed } from "@/lib/supabase-auth-admin";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await findAuthUserByEmail(email);
    if (!user?.id) {
      return NextResponse.json({
        success: true,
        message: "If that email needs verification, we sent a link.",
      });
    }

    if (isAuthUserConfirmed(user)) {
      return NextResponse.json({
        success: true,
        message: "This email is already verified. You can sign in.",
      });
    }

    await sendConfirmationEmail(req, { id: user.id, email });

    return NextResponse.json({
      success: true,
      message: "Verification email sent. Check your inbox.",
    });
  } catch (error) {
    console.error("/api/auth/resend-verification error:", error);
    return NextResponse.json({ error: "Could not send verification email" }, { status: 500 });
  }
}
