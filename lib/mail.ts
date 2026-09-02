type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function mailFrom() {
  return process.env.MAIL_FROM?.trim() || "";
}

export function isMailConfigured() {
  return Boolean(mailFrom() && (process.env.RESEND_API_KEY || process.env.SMTP_HOST));
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

async function sendWithSmtp(from: string, message: MailMessage) {
  const nodemailer = await import("nodemailer");
  const createTransport = nodemailer.createTransport ?? nodemailer.default.createTransport;
  const port = Number(process.env.SMTP_PORT || "587");
  const transporter = createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
  });

  await transporter.sendMail({
    from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

export async function sendMail(message: MailMessage) {
  const from = mailFrom();
  if (process.env.RESEND_API_KEY && from) {
    await sendWithResend(from, message);
    return;
  }
  if (process.env.SMTP_HOST && from) {
    await sendWithSmtp(from, message);
    return;
  }

  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    throw new Error("Email sending is not configured. Set MAIL_FROM and RESEND_API_KEY or SMTP_HOST.");
  }

  console.info(`[mail] skipped (no provider). To: ${message.to}\n${message.subject}\n${message.text}`);
}
