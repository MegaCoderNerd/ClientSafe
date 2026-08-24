"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getUiSoundMuted, playUiSound, setUiSoundMuted, unlockUiSound } from "@/lib/ui-sound";

type UiSoundContextValue = {
  muted: boolean;
  toggleMuted: () => void;
  play: typeof playUiSound;
};

const UiSoundContext = createContext<UiSoundContextValue>({
  muted: false,
  toggleMuted: () => {},
  play: playUiSound,
});

export function UiSoundProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(getUiSoundMuted());
    function unlock() {
      unlockUiSound();
    }
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      setUiSoundMuted(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ muted, toggleMuted, play: playUiSound }), [muted, toggleMuted]);

  return <UiSoundContext.Provider value={value}>{children}</UiSoundContext.Provider>;
}

export function useUiSound() {
  return useContext(UiSoundContext);
}
