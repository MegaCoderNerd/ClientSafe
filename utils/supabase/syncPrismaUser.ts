import type { SupabaseClient } from "@supabase/supabase-js";

// Ensure a row exists in the User table for the current Supabase authenticated user.
export async function ensureUserRowFromSupabase(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  const user = data?.user;
  if (!user) return null;

  const externalId = user.id;
  const email = user.email;
  const name = (user.user_metadata as any)?.name ?? (user.user_metadata as any)?.full_name ?? undefined;

  if (!email) return null;

  // Try to find by externalId or email, otherwise create.
  const { data: existingByExternal } = await supabase.from("User").select("id").eq("externalId", externalId).single().catch(() => ({ data: null }));
  if (existingByExternal && existingByExternal.id) return existingByExternal;

  const { data: existingByEmail } = await supabase.from("User").select("id").eq("email", email).single().catch(() => ({ data: null }));
  if (existingByEmail && existingByEmail.id) {
    // update externalId if missing
    await supabase.from("User").update({ externalId }).eq("id", existingByEmail.id);
    return existingByEmail;
  }

  const { data: created } = await supabase.from("User").insert({ externalId, email, name: name ?? "" }).select("id").single().catch(() => ({ data: null }));
  return created;
}
