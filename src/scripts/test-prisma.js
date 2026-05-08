const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    take: 1,
    orderBy: { createdAt: 'desc' }
  });
  console.log('Direct Prisma Query:');
  console.log('Order keys:', Object.keys(orders[0] || {}));
  console.log('Order number:', orders[0]?.orderNumber);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
