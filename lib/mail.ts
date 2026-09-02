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
  let value = process.env[name]?.trim() || "";
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

function isGmailHost(host: string) {
  const lower = host.toLowerCase();
  return lower.includes("gmail.com") || lower.includes("googlemail.com");
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
      pass: decodeURIComponent(url.password).replace(/\s+/g, ""),
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
  const pass = (env("SMTP_PASSWORD") || env("SMTP_PASS") || env("EMAIL_SERVER_PASSWORD")).replace(/\s+/g, "");
  if (!host || !user || !pass) return null;

  const defaultPort = isGmailHost(host) ? 465 : 587;
  const port = Number(env("SMTP_PORT") || env("EMAIL_SERVER_PORT") || defaultPort);
  const secureFlag = env("SMTP_SECURE");
  const secure = secureFlag === "true" || (secureFlag !== "false" && port === 465);

  return { host, port, user, pass, secure };
}

function formatFrom(address: string) {
  if (address.includes("<")) return address;
  return `ClientSafe <${address}>`;
}

function mailFrom(settings: SmtpSettings) {
  if (isGmailHost(settings.host) && settings.user.includes("@")) {
    return formatFrom(settings.user);
  }
  const configured = env("MAIL_FROM") || env("EMAIL_FROM") || env("SMTP_FROM");
  if (configured && !isUnusableFrom(configured)) return formatFrom(configured);
  if (settings.user.includes("@")) return formatFrom(settings.user);
  return configured ? formatFrom(configured) : "";
}

export function isMailConfigured() {
  const smtp = smtpSettings();
  if (smtp) return Boolean(mailFrom(smtp));
  return Boolean(env("RESEND_API_KEY") && env("MAIL_FROM") && !isUnusableFrom(env("MAIL_FROM")));
}

export function describeMailError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const extra =
    error && typeof error === "object"
      ? [("code" in error && error.code) || "", ("response" in error && error.response) || ""]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
          .join(" ")
      : "";
  const combined = `${message} ${extra}`.toLowerCase();

  if (/invalid login|username and password not accepted|535|eauth|authentication failed/i.test(combined)) {
    return "Gmail rejected the SMTP login. SMTP_USER must be the full Gmail address, and SMTP_PASSWORD must be the 16-character App Password with no spaces (not your normal Gmail password). Save the vars on Production and Preview, then redeploy.";
  }
  if (/timeout|etimedout|econnrefused|enotfound|enetunreach|socket/i.test(combined)) {
    return "The Vercel server could not connect to SMTP. Use SMTP_HOST=smtp.gmail.com and SMTP_PORT=465.";
  }
  if (/must issue a starttls|wrong version number|ssl|tls/i.test(combined)) {
    return "SMTP TLS failed. For Gmail set SMTP_PORT=465 (or 587) and leave MAIL_FROM empty so the Gmail address is used.";
  }
  return message.replace(/\s+/g, " ").trim().slice(0, 240) || "SMTP send failed";
}

function smtpAttempts(settings: SmtpSettings): SMTPTransport.Options[] {
  const auth = { user: settings.user, pass: settings.pass };
    const timeouts = {
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 12_000,
    } as const;

  const attempts: SMTPTransport.Options[] = [];
  if (isGmailHost(settings.host)) {
    attempts.push({ service: "gmail", auth, ...timeouts });
  }

  attempts.push({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    requireTLS: !settings.secure,
    auth,
    ...timeouts,
    tls: { servername: settings.host },
  });

  const altPort = settings.port === 465 ? 587 : 465;
  attempts.push({
    host: settings.host,
    port: altPort,
    secure: altPort === 465,
    requireTLS: altPort !== 465,
    auth,
    ...timeouts,
    tls: { servername: settings.host },
  });

  return attempts;
}

async function sendWithSmtp(settings: SmtpSettings, from: string, message: MailMessage) {
  if (isGmailHost(settings.host) && !settings.user.includes("@")) {
    throw new Error("SMTP_USER must be the full Gmail address, for example you@gmail.com.");
  }

  let lastError: unknown;
  for (const options of smtpAttempts(settings)) {
    const transporter = nodemailer.createTransport(options);
    try {
      await transporter.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      return;
    } catch (error) {
      lastError = error;
      console.error("[mail] SMTP attempt failed", {
        host: settings.host,
        port: "port" in options ? options.port : undefined,
        service: "service" in options ? options.service : undefined,
        message: error instanceof Error ? error.message : error,
      });
      const combined = `${error instanceof Error ? error.message : ""} ${
        error && typeof error === "object" && "response" in error ? error.response : ""
      }`.toLowerCase();
      if (/invalid login|username and password not accepted|535|eauth|authentication failed/i.test(combined)) {
        throw error;
      }
    } finally {
      transporter.close();
    }
  }
  throw lastError instanceof Error ? lastError : new Error("SMTP send failed");
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
    const from = mailFrom(smtp);
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
