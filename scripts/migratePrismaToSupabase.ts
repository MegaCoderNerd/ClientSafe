import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Starting migration from Prisma (dev.db) to Supabase...");

  // Users
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users`);
  for (const u of users) {
    const { error } = await supabase
      .from("User")
      .upsert([
        {
          id: u.id,
          email: u.email,
          name: u.name,
          password: u.password,
          externalId: u.externalId ?? null,
        },
      ], { onConflict: "id" });

    if (error) console.error("User upsert error:", error.message || error);
    else console.log(`✓ User ${u.email} migrated`);
  }

  // Projects + Assets
  const projects = await prisma.deliveryProject.findMany({ include: { asset: true } });
  console.log(`Found ${projects.length} projects`);
  for (const p of projects) {
    const { error: projErr } = await supabase
      .from("DeliveryProject")
      .upsert([
        {
          id: p.id,
          title: p.title,
          description: p.description,
          price: p.price,
          currency: p.currency,
          paymentStatus: p.paymentStatus,
          freelancerId: p.freelancerId,
          clientId: p.clientId,
        },
      ], { onConflict: "id" });

    if (projErr) console.error("Project upsert error:", projErr.message || projErr);
    else console.log(`✓ Project ${p.title} migrated`);

    if (p.asset) {
      const a = p.asset;
      const { error: assetErr } = await supabase.from("Asset").upsert([
        {
          id: a.id,
          projectId: a.projectId,
          previewUrl: a.previewUrl,
          originalFileUrl: a.originalFileUrl,
          isUnlocked: a.isUnlocked,
        },
      ], { onConflict: "id" });

      if (assetErr) console.error("Asset upsert error:", assetErr.message || assetErr);
      else console.log(`✓ Asset for ${p.title} migrated`);
    }
  }

  // Chat messages
  const chats = await prisma.chatMessage.findMany();
  console.log(`Found ${chats.length} chat messages`);
  for (const c of chats) {
    const { error: chatErr } = await supabase.from("ChatMessage").insert([
      {
        id: c.id,
        projectId: c.projectId,
        senderId: c.senderId,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
      },
    ]);

    if (chatErr) console.error("Chat insert error:", (chatErr as any).message || chatErr);
    else console.log(`✓ Chat message migrated`);
  }

  console.log("Migration complete. Verify data in Supabase.");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
