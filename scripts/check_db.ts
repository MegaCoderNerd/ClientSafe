import { prisma } from '../lib/prisma';

async function main() {
  const userCount = await prisma.user.count();
  const users = await prisma.user.findMany({ take: 5, select: { id: true, email: true, name: true, externalId: true } });
  const projectCount = await prisma.deliveryProject.count();
  const projects = await prisma.deliveryProject.findMany({ take: 5, select: { id: true, title: true, paymentStatus: true } });

  console.log('userCount:', userCount);
  console.log('sample users:', users);
  console.log('projectCount:', projectCount);
  console.log('sample projects:', projects);
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1) });
