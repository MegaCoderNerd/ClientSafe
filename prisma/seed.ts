import { PrismaClient, PaymentStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const freelancer = await prisma.user.upsert({
    where: { email: "freelancer@clientsafe.dev" },
    update: {},
    create: {
      email: "freelancer@clientsafe.dev",
      name: "Freelancer Demo",
      password: "demo123",
    },
  });

  const client = await prisma.user.upsert({
    where: { email: "client@clientsafe.dev" },
    update: {},
    create: {
      email: "client@clientsafe.dev",
      name: "Client Demo",
      password: "demo123",
    },
  });

  await prisma.deliveryProject.upsert({
    where: { id: "demo-locked-project" },
    update: {
      paymentStatus: PaymentStatus.PENDING,
      freelancerId: freelancer.id,
      clientId: client.id,
      asset: {
        update: {
          previewUrl: "/stock/landing-page/preview.webp",
          demoIndexUrl: "/stock/landing-page/demo/index.html",
          originalFileUrl: "/stock/landing-page/original.zip",
          isUnlocked: false,
        },
      },
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
          previewUrl: "/stock/landing-page/preview.webp",
          demoIndexUrl: "/stock/landing-page/demo/index.html",
          originalFileUrl: "/stock/landing-page/original.zip",
          isUnlocked: false,
        },
      },
    },
  });

  await prisma.deliveryProject.upsert({
    where: { id: "demo-unlocked-project" },
    update: {
      paymentStatus: PaymentStatus.COMPLETED,
      freelancerId: freelancer.id,
      clientId: client.id,
      asset: {
        update: {
          previewUrl: "/stock/brand-kit/preview.webp",
          originalFileUrl: "/stock/brand-kit/original.zip",
          isUnlocked: true,
        },
      },
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
          previewUrl: "/stock/brand-kit/preview.webp",
          originalFileUrl: "/stock/brand-kit/original.zip",
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
