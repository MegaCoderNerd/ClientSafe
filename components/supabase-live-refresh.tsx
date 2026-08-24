"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type LiveTable = {
  table: string;
  filter?: string;
};

export function SupabaseLiveRefresh({ tables }: { tables: LiveTable[] }) {
  const router = useRouter();
  const tablesKey = JSON.stringify(tables);

  useEffect(() => {
    const watched = JSON.parse(tablesKey) as LiveTable[];
    const supabase = createClient();
    const channel = supabase.channel(`live:${tablesKey}`);

    for (const { table, filter } of watched) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter,
        },
        () => {
          router.refresh();
        },
      );
    }

    channel.subscribe();

    function refresh() {
      router.refresh();
    }

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      void supabase.removeChannel(channel);
    };
  }, [router, tablesKey]);

  return null;
}
