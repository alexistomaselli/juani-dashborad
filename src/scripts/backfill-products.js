const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Get the main product
  const products = await prisma.product.findMany();
  const mainProduct = products.find(p => p.name.toLowerCase().includes('prepizzeta'));
  
  if (!mainProduct) {
    console.log('Main product (Prepizzetas) not found. Skipping backfill.');
    return;
  }

  console.log(`Found product: ${mainProduct.name} (${mainProduct.id})`);

  // 2. Update orders that have 'prepizzeta' in the product name but no productId
  const result = await prisma.order.updateMany({
    where: {
      productId: null,
      product: {
        contains: 'prepizzeta'
      }
    },
    data: {
      productId: mainProduct.id,
      unitPrice: mainProduct.price,
      unitCost: mainProduct.cost
    }
  });

  console.log(`Updated ${result.count} orders with product information.`);
  
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
