"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useUiSound } from "@/components/ui-sound-provider";

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

export function SiteHeader() {
  const { data: session } = useSession();
  const { muted, toggleMuted } = useUiSound();

  return (
    <header className="sticky top-0 z-50 h-[calc(3.5rem+env(safe-area-inset-top))] border-b border-border/10 bg-canvas/92 sm:h-[calc(4rem+env(safe-area-inset-top))] sm:bg-canvas/70 sm:backdrop-blur-md">
      <div className="absolute left-0 top-[env(safe-area-inset-top)] flex h-14 items-center pl-[max(0.75rem,env(safe-area-inset-left))] sm:h-16 sm:pl-4">
        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          <Image
            src="/logo.webp"
            alt="ClientSafe logo"
            width={36}
            height={36}
            className="h-8 w-8 object-contain sm:h-10 sm:w-10"
            quality={75}
          />
          <span className="hidden font-display text-lg font-semibold sm:inline">ClientSafe</span>
        </Link>
      </div>

      <div className="absolute right-0 top-[env(safe-area-inset-top)] flex h-14 items-center pr-[max(0.75rem,env(safe-area-inset-right))] sm:h-16 sm:pr-4">
        <nav className="flex items-center gap-1.5 sm:gap-2">
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
          {session?.user ? (
            <>
              <Button href="/dashboard" variant="ghost" size="sm">
                Dashboard
              </Button>
              <Button href="/guide" variant="secondary" size="sm" className="hidden sm:inline-flex">
                Guide
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
      </div>

      <div className="mx-auto h-[calc(3.5rem+env(safe-area-inset-top))] max-w-5xl sm:h-[calc(4rem+env(safe-area-inset-top))]" />
    </header>
  );
}
