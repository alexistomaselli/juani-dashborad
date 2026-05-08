import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration...');

  // 1. Asegurar que existe el producto base de prepizzetas
  let prepizzeta = await prisma.product.findFirst({
    where: { name: { contains: 'Pizzeta' } }
  });

  if (!prepizzeta) {
    console.log('Creating default Prepizzetas product...');
    prepizzeta = await prisma.product.create({
      data: {
        name: 'Prepizzetas (x6)',
        unitsPerPackage: 6,
        price: 1500,
        cost: 800,
      }
    });
  }

  console.log(`Using product: ${prepizzeta.name} (ID: ${prepizzeta.id})`);

  // 2. Buscar pedidos sin productId que parezcan ser de este producto
  const ordersToUpdate = await prisma.order.findMany({
    where: {
      productId: null,
      product: { contains: 'pizzeta' }
    }
  });

  console.log(`Found ${ordersToUpdate.length} orders to migrate.`);

  for (const order of ordersToUpdate) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        productId: prepizzeta.id,
        unitPrice: prepizzeta.price,
        unitCost: prepizzeta.cost,
        // Recalcular totalAmount si era nulo
        totalAmount: order.totalAmount || (prepizzeta.price * order.quantity)
      }
    });
  }

  console.log('Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
