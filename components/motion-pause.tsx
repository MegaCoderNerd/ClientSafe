"use client";

import { useEffect } from "react";

export function MotionPause() {
  useEffect(() => {
    function sync() {
      document.documentElement.classList.toggle("tab-hidden", document.hidden);
    }
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return null;
}
