/** Normalize any mailbox so confirmation mail is sent to the address the user typed. */
export function normalizeEmailAddress(raw: string) {
  const trimmed = String(raw ?? "").trim().replace(/^mailto:/i, "");
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return null;
  if (/\s/.test(trimmed)) return null;

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1).replace(/\.+$/, "").toLowerCase();
  if (!local || !domain || domain.startsWith(".") || domain.endsWith(".")) return null;

  return `${local}@${domain}`.toLowerCase();
}
