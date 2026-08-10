import type { SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

// Ensure a Prisma user exists for the current Supabase authenticated user.
// Call this from Server Components or API routes after creating the server Supabase client.
export async function ensurePrismaUserFromSupabase(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  const user = data?.user;
  if (!user) return null;

  const externalId = user.id;
  const email = user.email;
  const name = (user.user_metadata as any)?.name ?? (user.user_metadata as any)?.full_name ?? undefined;

  // Prefer matching by externalId, then by email. If no match, create.
  let existing = null;
  try {
    existing = await prisma.user.findUnique({ where: { externalId } });
  } catch (_) {
    // If Prisma client isn't migrated to include externalId yet, fallback to email lookup.
    existing = null;
  }

  if (!existing && email) {
    existing = await prisma.user.findUnique({ where: { email } }).catch(() => null);
  }

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        externalId,
        email: email ?? existing.email,
        name: name ?? existing.name,
      },
    });
  }

  // Create new user (Supabase users normally have emails)
  if (!email) return null;

  return prisma.user.create({
    data: {
      externalId,
      email,
      name: name ?? "",
      password: null,
    },
  });
}
