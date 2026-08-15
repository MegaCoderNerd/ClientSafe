import { getSupabaseUrl } from "@/lib/supabase-env";

export type AuthAdminUser = {
  id?: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
};

type AuthAdminListPayload = {
  users?: AuthAdminUser[];
  nextPage?: number | null;
} & AuthAdminUser;

export function isAuthUserConfirmed(user: AuthAdminUser | null | undefined) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

export async function findAuthUserByEmail(email: string): Promise<AuthAdminUser | null> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;

  const normalized = email.trim().toLowerCase();
  const perPage = 200;
  const maxPages = 50;

  for (let page = 1; page <= maxPages; page++) {
    const endpoint = new URL("/auth/v1/admin/users", getSupabaseUrl());
    endpoint.searchParams.set("page", String(page));
    endpoint.searchParams.set("per_page", String(perPage));

    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as AuthAdminListPayload;
    const users = Array.isArray(payload.users) ? payload.users : payload.email ? [payload] : [];
    const match = users.find((user) => user.email?.trim().toLowerCase() === normalized);
    if (match) return match;
    if (users.length < perPage) break;
  }

  return null;
}
