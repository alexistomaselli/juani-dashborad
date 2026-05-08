const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        productRef: true
      }
    });
    console.log('Orders found:', orders.length);
    console.log('First order with productRef:', orders.find(o => o.productRef));
  } catch (error) {
    console.error('PRISMA ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
