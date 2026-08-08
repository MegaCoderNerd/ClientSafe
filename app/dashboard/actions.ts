"use server";

import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createProject(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.FREELANCER) {
    throw new Error("Only freelancers can create projects.");
  }

  const clientId = String(formData.get("clientId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const currency = String(formData.get("currency") ?? "USD").trim().toUpperCase();
  const previewUrl = String(formData.get("previewUrl") ?? "").trim();
  const originalFileUrl = String(formData.get("originalFileUrl") ?? "").trim();
  const priceInDollars = Number(formData.get("price") ?? "0");

  if (
    !clientId ||
    !title ||
    !description ||
    !currency ||
    !previewUrl ||
    !originalFileUrl ||
    Number.isNaN(priceInDollars) ||
    priceInDollars <= 0
  ) {
    throw new Error("Please provide valid project and asset details.");
  }

  await prisma.deliveryProject.create({
    data: {
      title,
      description,
      currency,
      price: Math.round(priceInDollars * 100),
      freelancerId: session.user.id,
      clientId,
      asset: {
        create: {
          previewUrl,
          originalFileUrl,
        },
      },
    },
  });

  revalidatePath("/dashboard");
}
