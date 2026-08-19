import { supabase } from "@/lib/supabase";

export function isMissingColumnError(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  const message = error.message ?? "";
  return error.code === "42703" || error.code === "PGRST204" || /schema cache/i.test(message) || /does not exist/i.test(message) || /column/i.test(message);
}

export async function fetchFreelancerProjects(freelancerId: string) {
  const selects = [
    "id, title, description, price, currency, paymentStatus, platformFeeAmount, freelancerPayoutAmount, createdAt, paidAt, checkoutStartedAt, client:User!clientId(name, email)",
    "id, title, description, price, currency, paymentStatus, platformFeeAmount, freelancerPayoutAmount, createdAt, paidAt, client:User!clientId(name, email)",
    "id, title, description, price, currency, paymentStatus, client:User!clientId(name, email)",
  ];

  for (const select of selects) {
    const { data, error } = await supabase
      .from("DeliveryProject")
      .select(select)
      .eq("freelancerId", freelancerId)
      .order("title", { ascending: true });
    if (!error) return data ?? [];
    if (!isMissingColumnError(error)) break;
  }

  return [];
}

export async function fetchDeliveryProjectById(projectId: string, selectWithGrace: string, selectWithoutGrace: string) {
  const first = await supabase.from("DeliveryProject").select(selectWithGrace).eq("id", projectId).maybeSingle();
  if (!first.error) return first;
  if (!isMissingColumnError(first.error)) return first;
  return supabase.from("DeliveryProject").select(selectWithoutGrace).eq("id", projectId).maybeSingle();
}
