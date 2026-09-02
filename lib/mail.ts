import { setDefaultResultOrder } from "node:dns";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

try {
  setDefaultResultOrder("ipv4first");
} catch {
  // Older Node runtimes without this helper.
}

type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type SmtpSettings = {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
};

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function isUnusableFrom(value: string) {
  const lower = value.toLowerCase();
  return (
    lower.includes("vercel.app") ||
    lower.includes("localhost") ||
    lower.includes("your-domain") ||
    lower.includes("onboarding@resend.dev")
  );
}

function smtpFromUrl(): SmtpSettings | null {
  const raw = env("SMTP_URL") || env("EMAIL_SERVER");
  if (!raw || !raw.includes("://")) return null;
  try {
    const url = new URL(raw);
    if (!url.hostname) return null;
    const port = Number(url.port || (url.protocol === "smtps:" ? 465 : 587));
    return {
      host: url.hostname,
      port,
      user: decodeURIComponent(url.username),
      pass: decodeURIComponent(url.password),
      secure: url.protocol === "smtps:" || port === 465,
    };
  } catch {
    return null;
  }
}

function smtpSettings(): SmtpSettings | null {
  const fromUrl = smtpFromUrl();
  if (fromUrl?.host && fromUrl.user && fromUrl.pass) return fromUrl;

  const host = env("SMTP_HOST") || env("EMAIL_SERVER_HOST");
  const user = env("SMTP_USER") || env("SMTP_USERNAME") || env("EMAIL_SERVER_USER");
  const pass = env("SMTP_PASSWORD") || env("SMTP_PASS") || env("EMAIL_SERVER_PASSWORD");
  if (!host || !user || !pass) return null;

  const defaultPort = host.toLowerCase().includes("gmail.com") ? 465 : 587;
  const port = Number(env("SMTP_PORT") || env("EMAIL_SERVER_PORT") || defaultPort);
  const secureFlag = env("SMTP_SECURE");
  const secure = secureFlag === "true" || (secureFlag !== "false" && port === 465);

  return { host, port, user, pass, secure };
}

function formatFrom(address: string) {
  if (address.includes("<")) return address;
  return `ClientSafe <${address}>`;
}

function mailFrom(smtpUser: string) {
  const configured = env("MAIL_FROM") || env("EMAIL_FROM") || env("SMTP_FROM");
  if (configured && !isUnusableFrom(configured)) return formatFrom(configured);
  if (smtpUser.includes("@")) return formatFrom(smtpUser);
  return configured ? formatFrom(configured) : "";
}

export function isMailConfigured() {
  const smtp = smtpSettings();
  if (smtp) return Boolean(mailFrom(smtp.user));
  return Boolean(env("RESEND_API_KEY") && env("MAIL_FROM") && !isUnusableFrom(env("MAIL_FROM")));
}

async function sendWithSmtp(settings: SmtpSettings, from: string, message: MailMessage) {
  const options: SMTPTransport.Options & { family: 4 } = {
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    requireTLS: !settings.secure,
    auth: { user: settings.user, pass: settings.pass },
    family: 4,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
    tls: {
      minVersion: "TLSv1.2",
      servername: settings.host,
    },
  };
  const transporter = nodemailer.createTransport(options);

  try {
    await transporter.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  } finally {
    transporter.close();
  }
}

async function sendWithResend(from: string, message: MailMessage) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend failed (${response.status}): ${detail || response.statusText}`);
  }
}

export async function sendMail(message: MailMessage) {
  const smtp = smtpSettings();
  if (smtp) {
    const from = mailFrom(smtp.user);
    if (!from) {
      throw new Error("SMTP is set but no From address is available. Set SMTP_USER to the mailbox you authenticate with.");
    }
    await sendWithSmtp(smtp, from, message);
    return;
  }

  const resendFrom = env("MAIL_FROM");
  if (env("RESEND_API_KEY") && resendFrom && !isUnusableFrom(resendFrom)) {
    await sendWithResend(resendFrom, message);
    return;
  }

  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    throw new Error(
      "Email sending is not configured. On Vercel set SMTP_HOST, SMTP_USER, SMTP_PASSWORD (and optional SMTP_PORT=465).",
    );
  }

  console.info(`[mail] skipped (no provider). To: ${message.to}\n${message.subject}\n${message.text}`);
}
