"use client";

import { TimeZoneProvider } from "@/components/time-zone-provider";
import { UiSoundProvider } from "@/components/ui-sound-provider";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

type ProvidersProps = {
  children: React.ReactNode;
  session: Session | null;
};

export function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <TimeZoneProvider>
        <UiSoundProvider>{children}</UiSoundProvider>
      </TimeZoneProvider>
    </SessionProvider>
  );
}