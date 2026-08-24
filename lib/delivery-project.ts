import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function isMissingColumnError(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  const message = error.message ?? "";
  return error.code === "42703" || error.code === "PGRST204" || /schema cache/i.test(message) || /does not exist/i.test(message) || /column/i.test(message);
}

export type Related<T> = T | T[] | null | undefined;

export type PersonRel = {
  name?: string | null;
  email?: string | null;
};

export type VaultAssetRel = {
  id?: string;
  previewUrl?: string | null;
  previewVideoUrl?: string | null;
  demoIndexUrl?: string | null;
  originalFileUrl?: string | null;
  isUnlocked?: boolean;
};

export type FreelancerProjectRow = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  paymentStatus: string;
  platformFeeAmount?: number | null;
  freelancerPayoutAmount?: number | null;
  createdAt?: string;
  paidAt?: string | null;
  checkoutStartedAt?: string | null;
  client?: Related<PersonRel>;
};

export type VaultPageRow = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  paymentStatus: string;
  freelancerId: string;
  clientId: string;
  checkoutStartedAt?: string | null;
  platformFeePercent?: number | null;
  platformFeeAmount?: number | null;
  freelancerPayoutAmount?: number | null;
  freelancer?: Related<PersonRel>;
  client?: Related<PersonRel>;
  asset?: Related<VaultAssetRel>;
};

export type EditVaultPageRow = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  paymentStatus: string;
  freelancerId: string;
  clientId: string;
  checkoutStartedAt?: string | null;
  asset?: Related<VaultAssetRel>;
};

export type UpdateVaultRow = {
  id: string;
  freelancerId: string;
  clientId: string;
  paymentStatus: string;
  price: number;
  checkoutStartedAt?: string | null;
  asset?: Related<VaultAssetRel>;
};

export type DeleteVaultRow = {
  id: string;
  freelancerId: string;
  paymentStatus: string;
  paypalOrderId?: string | null;
  checkoutStartedAt?: string | null;
  asset?: Related<VaultAssetRel>;
};

type FetchByIdResult<T> = {
  data: T | null;
  error: PostgrestError | null;
};

export async function fetchFreelancerProjects(freelancerId: string): Promise<FreelancerProjectRow[]> {
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
    if (!error) return (data ?? []) as unknown as FreelancerProjectRow[];
    if (!isMissingColumnError(error)) break;
  }

  return [];
}

export async function fetchDeliveryProjectById<T>(
  projectId: string,
  selectWithGrace: string,
  selectWithoutGrace: string,
): Promise<FetchByIdResult<T>> {
  const first = await supabase.from("DeliveryProject").select(selectWithGrace).eq("id", projectId).maybeSingle();
  if (!first.error) {
    return { data: (first.data as T | null) ?? null, error: null };
  }
  if (!isMissingColumnError(first.error)) {
    return { data: (first.data as T | null) ?? null, error: first.error };
  }
  const second = await supabase.from("DeliveryProject").select(selectWithoutGrace).eq("id", projectId).maybeSingle();
  return { data: (second.data as T | null) ?? null, error: second.error };
}
