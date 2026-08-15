const STORAGE_KEY = "clientvault.user-timezone";

export function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function parseInstant(iso: string) {
  if (!iso) return new Date(NaN);
  const trimmed = iso.trim().replace(" ", "T");
  if (/Z|[+-]\d{2}:?\d{2}$/.test(trimmed)) return new Date(trimmed);
  return new Date(`${trimmed}Z`);
}

export function localDayKey(iso: string, timeZone?: string | null) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || undefined,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parseInstant(iso));
}

function shiftDayKey(dayKey: string, days: number) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  const yyyy = shifted.getUTCFullYear();
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(shifted.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatLocalDayLabel(iso: string, timeZone = getBrowserTimeZone()) {
  const todayKey = localDayKey(new Date().toISOString(), timeZone);
  const messageKey = localDayKey(iso, timeZone);

  if (messageKey === todayKey) return "Today";
  if (messageKey === shiftDayKey(todayKey, -1)) return "Yesterday";

  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseInstant(iso));
}

export function formatLocalTime(iso: string, timeZone = getBrowserTimeZone()) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(parseInstant(iso));
}

export function readCachedTimeZone() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeCachedTimeZone(timeZone: string) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, timeZone);
  } catch {
    // Ignore storage failures.
  }
}

async function timeZoneFromCoordinates(latitude: number, longitude: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=auto`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  const payload = (await response.json()) as { timezone?: string };
  return payload.timezone || null;
}

function currentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: 60 * 60 * 1000,
      timeout: 8000,
    });
  });
}

export async function resolveUserTimeZone() {
  const cached = readCachedTimeZone();
  if (cached) return cached;

  const fallback = getBrowserTimeZone();

  try {
    const position = await currentPosition();
    const geoZone = await timeZoneFromCoordinates(position.coords.latitude, position.coords.longitude);
    const timeZone = geoZone || fallback;
    writeCachedTimeZone(timeZone);
    return timeZone;
  } catch {
    writeCachedTimeZone(fallback);
    return fallback;
  }
}

/** @deprecated Use getBrowserTimeZone or the TimeZoneProvider. */
export const getLocalTimeZone = getBrowserTimeZone;
export const formatChatDayLabel = formatLocalDayLabel;
export const formatChatTime = formatLocalTime;
