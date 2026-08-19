"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <Button type="button" variant="danger" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
      Log Out
    </Button>
  );
}
