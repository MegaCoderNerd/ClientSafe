"use client";

import {
  formatLocalDayLabel,
  formatLocalTime,
  getBrowserTimeZone,
  readCachedTimeZone,
  resolveUserTimeZone,
} from "@/lib/chat-time";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type TimeZoneContextValue = {
  timeZone: string;
};

const TimeZoneContext = createContext<TimeZoneContextValue>({
  timeZone: "UTC",
});

export function TimeZoneProvider({ children }: { children: React.ReactNode }) {
  const [timeZone, setTimeZone] = useState("UTC");

  useEffect(() => {
    let cancelled = false;
    const immediate = readCachedTimeZone() || getBrowserTimeZone();
    setTimeZone(immediate);

    resolveUserTimeZone()
      .then((resolved) => {
        if (!cancelled && resolved) setTimeZone(resolved);
      })
      .catch(() => {
        if (!cancelled) setTimeZone(getBrowserTimeZone());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ timeZone }), [timeZone]);

  return <TimeZoneContext.Provider value={value}>{children}</TimeZoneContext.Provider>;
}

export function useUserTimeZone() {
  return useContext(TimeZoneContext).timeZone;
}

export function useLocalTime(iso: string | null | undefined) {
  const timeZone = useUserTimeZone();
  if (!iso) return "";
  return formatLocalTime(iso, timeZone);
}

export function useLocalDayLabel(iso: string | null | undefined) {
  const timeZone = useUserTimeZone();
  if (!iso) return "";
  return formatLocalDayLabel(iso, timeZone);
}
