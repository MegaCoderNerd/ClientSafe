export function firstQueryValue(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export function safeCallbackPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return "/";
  }
  return value;
}
