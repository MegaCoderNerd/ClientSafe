"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useUiSound } from "@/components/ui-sound-provider";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      {muted ? (
        <path d="m16 9 6 6M22 9l-6 6" />
      ) : (
        <>
          <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" />
          <path d="M18 7.5a6 6 0 0 1 0 9" />
        </>
      )}
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      {open ? (
        <path d="M6 6l12 12M18 6 6 18" />
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}

export function SiteHeader() {
  const { data: session } = useSession();
  const { muted, toggleMuted } = useUiSound();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const signedIn = Boolean(session?.user);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/10 bg-canvas/95 pt-[env(safe-area-inset-top)] sm:bg-canvas/80 sm:backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:h-16 sm:px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Image
            src="/logo.webp"
            alt="ClientSafe logo"
            width={36}
            height={36}
            className="h-8 w-8 shrink-0 object-contain sm:h-10 sm:w-10"
            quality={75}
          />
          <span className="truncate font-display text-base font-semibold sm:text-lg">ClientSafe</span>
        </Link>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleMuted}
            aria-pressed={muted}
            aria-label={muted ? "Unmute interface sounds" : "Mute interface sounds"}
            title={muted ? "Unmute sounds" : "Mute sounds"}
            silent
            className="px-2"
          >
            <SpeakerIcon muted={muted} />
          </Button>

          <nav className="hidden items-center gap-2 sm:flex">
            <Button href="/guide" variant="secondary" size="sm">
              Guide
            </Button>
            {signedIn ? (
              <>
                <Button href="/dashboard" variant="ghost" size="sm">
                  Dashboard
                </Button>
                <Button type="button" variant="danger" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Button href="/auth/signin" variant="secondary" size="sm">
                  Sign In
                </Button>
                <Button href="/auth/signup" size="sm">
                  Sign Up
                </Button>
              </>
            )}
          </nav>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="px-2 sm:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
            silent
          >
            <MenuIcon open={menuOpen} />
          </Button>
        </div>
      </div>

      {menuOpen ? (
        <nav
          id="mobile-nav"
          className="flex flex-col gap-2 border-t border-border/10 bg-canvas px-[max(0.75rem,env(safe-area-inset-left))] py-3 pr-[max(0.75rem,env(safe-area-inset-right))] sm:hidden"
        >
          <Button href="/guide" variant="secondary" className="w-full justify-center">
            Guide
          </Button>
          {signedIn ? (
            <>
              <Button href="/dashboard" variant="ghost" className="w-full justify-center">
                Dashboard
              </Button>
              <Button
                type="button"
                variant="danger"
                className="w-full justify-center"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Log Out
              </Button>
            </>
          ) : (
            <>
              <Button href="/auth/signin" variant="secondary" className="w-full justify-center">
                Sign In
              </Button>
              <Button href="/auth/signup" className="w-full justify-center">
                Sign Up
              </Button>
            </>
          )}
        </nav>
      ) : null}
    </header>
  );
}
