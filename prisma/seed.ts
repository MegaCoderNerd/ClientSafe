import { PrismaClient, PaymentStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const freelancer = await prisma.user.upsert({
    where: { email: "demo@clientvault.dev" },
    update: {},
    create: {
      email: "demo@clientvault.dev",
      name: "Demo User",
      password: "demo123",
    },
  });

  const client = freelancer;

  await prisma.deliveryProject.upsert({
    where: { id: "demo-locked-project" },
    update: {
      paymentStatus: PaymentStatus.PENDING,
    },
    create: {
      id: "demo-locked-project",
      title: "Landing Page Source Package",
      description: "Watermarked preview only until payment is completed.",
      price: 4999,
      currency: "USD",
      paymentStatus: PaymentStatus.PENDING,
      freelancerId: freelancer.id,
      clientId: client.id,
      asset: {
        create: {
          previewUrl: "https://placehold.co/1200x700?text=Watermarked+Preview",
          originalFileUrl: "https://example.com/files/landing-page-source.zip",
          isUnlocked: false,
        },
      },
    },
  });

  await prisma.deliveryProject.upsert({
    where: { id: "demo-unlocked-project" },
    update: {
      paymentStatus: PaymentStatus.COMPLETED,
    },
    create: {
      id: "demo-unlocked-project",
      title: "Brand Kit Delivery",
      description: "Paid project with unlocked original assets.",
      price: 2999,
      currency: "USD",
      paymentStatus: PaymentStatus.COMPLETED,
      freelancerId: freelancer.id,
      clientId: client.id,
      asset: {
        create: {
          previewUrl: "https://placehold.co/1200x700?text=Brand+Kit+Preview",
          originalFileUrl: "https://example.com/files/brand-kit.zip",
          isUnlocked: true,
        },
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
