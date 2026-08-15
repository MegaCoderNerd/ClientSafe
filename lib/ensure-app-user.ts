import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

export async function ensureAppUserFromAuth(authUser: AuthUser) {
  const email = authUser.email?.trim().toLowerCase();
  if (!email) return null;

  const nameFromMeta = authUser.user_metadata?.name;
  const name =
    typeof nameFromMeta === "string" && nameFromMeta.trim()
      ? nameFromMeta.trim()
      : email.split("@")[0];

  const { data: byExternal } = await supabase
    .from("User")
    .select("id, email, name")
    .eq("externalId", authUser.id)
    .maybeSingle();

  if (byExternal) return byExternal;

  const { data: byEmail } = await supabase
    .from("User")
    .select("id, email, name")
    .eq("email", email)
    .maybeSingle();

  if (byEmail) {
    await supabase.from("User").update({ externalId: authUser.id, name }).eq("id", byEmail.id);
    return { ...byEmail, name };
  }

  const { data: created, error } = await supabase
    .from("User")
    .insert({
      id: randomUUID(),
      email,
      name,
      externalId: authUser.id,
    })
    .select("id, email, name")
    .single();

  if (!error && created) return created;

  const { data: raced } = await supabase.from("User").select("id, email, name").eq("email", email).maybeSingle();
  if (raced) {
    await supabase.from("User").update({ externalId: authUser.id, name }).eq("id", raced.id);
    return { ...raced, name };
  }

  console.error("[auth] failed to create app user", error);
  return null;
}
