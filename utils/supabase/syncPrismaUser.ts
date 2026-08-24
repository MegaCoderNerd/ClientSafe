import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// Ensure a row exists in the User table for the current Supabase authenticated user.
export async function ensureUserRowFromSupabase(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  const user = data?.user;
  if (!user) return null;

  const externalId = user.id;
  const email = user.email;
  const metadata = user.user_metadata as { name?: string; full_name?: string } | undefined;
  const name = metadata?.name ?? metadata?.full_name;

  if (!email) return null;

  const { data: existingByExternal } = await supabase.from("User").select("id").eq("externalId", externalId).maybeSingle();
  if (existingByExternal?.id) return existingByExternal;

  const { data: existingByEmail } = await supabase.from("User").select("id").eq("email", email).maybeSingle();
  if (existingByEmail?.id) {
    await supabase.from("User").update({ externalId }).eq("id", existingByEmail.id);
    return existingByEmail;
  }

  const { data: created } = await supabase
    .from("User")
    .insert({ id: randomUUID(), externalId, email, name: name ?? "" })
    .select("id")
    .maybeSingle();
  return created;
}
