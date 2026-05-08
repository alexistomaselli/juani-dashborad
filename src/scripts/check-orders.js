const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany();
  console.log('Total orders:', orders.length);
  console.log('Orders with orderNumber:', orders.filter(o => o.orderNumber !== null).length);
  console.log('First 5 orders with numbers:', orders.slice(0, 5).map(o => ({ id: o.id, orderNumber: o.orderNumber })));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
