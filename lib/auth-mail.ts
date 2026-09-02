import { createAuthEmailToken } from "@/lib/auth-email-token";
import { sendMail } from "@/lib/mail";
import { getAppUrl } from "@/lib/supabase-env";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendConfirmationEmail(request: Request, user: { id: string; email: string }) {
  const token = createAuthEmailToken({ purpose: "confirm", uid: user.id, email: user.email });
  const confirmUrl = getAppUrl(`/auth/confirm?token=${encodeURIComponent(token)}`, request);
  await sendMail({
    to: user.email,
    subject: "Confirm your ClientSafe email",
    text: `Welcome to ClientSafe.\n\nConfirm your email by opening this link:\n${confirmUrl}\n\nThis link expires in 24 hours. If you did not create an account, you can ignore this email.`,
    html: `<p>Welcome to ClientSafe.</p><p><a href="${escapeHtml(confirmUrl)}">Confirm your email</a></p><p>This link expires in 24 hours.</p><p>If you did not create an account, you can ignore this email.</p>`,
  });
}

export async function sendPasswordResetEmail(request: Request, user: { id: string; email: string }) {
  const token = createAuthEmailToken({ purpose: "reset", uid: user.id, email: user.email });
  const resetUrl = getAppUrl(`/auth/update-password?token=${encodeURIComponent(token)}`, request);
  await sendMail({
    to: user.email,
    subject: "Reset your ClientSafe password",
    text: `Reset your ClientSafe password by opening this link:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not ask for a reset, you can ignore this email.`,
    html: `<p>Reset your ClientSafe password:</p><p><a href="${escapeHtml(resetUrl)}">Choose a new password</a></p><p>This link expires in 1 hour.</p><p>If you did not ask for a reset, you can ignore this email.</p>`,
  });
}
