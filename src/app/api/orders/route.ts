import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const orders = await (prisma as any).order.findMany({
      include: { productRef: true },
      orderBy: { orderNumber: 'asc' },
    });
    
    return NextResponse.json(orders);
  } catch (error: unknown) {
    console.error('Error fetching orders:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      error: 'Failed to fetch orders', 
      details: errorMessage
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validaciones básicas
    if (!body.customerName || !body.product) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        details: 'customerName and product are required' 
      }, { status: 400 });
    }

    // Ejecutamos todo en una transacción para asegurar el orderNumber atómico
    const order = await prisma.$transaction(async (tx: any) => {
      // Buscar datos del producto para el snapshot financiero
      let productId: string | null = body.productId || null;
      let unitPrice: number | null = body.unitPrice !== undefined ? parseFloat(body.unitPrice) : null;
      let unitCost: number | null = body.unitCost !== undefined ? parseFloat(body.unitCost) : null;
      let productName: string = body.product;

      // Intentamos buscar en el catálogo para completar datos faltantes
      const dbProduct = productId 
        ? await tx.product.findUnique({ where: { id: productId } })
        : await tx.product.findFirst({ where: { name: { contains: body.product } } });

      if (dbProduct) {
        productId = dbProduct.id;
        unitPrice = unitPrice ?? dbProduct.price;
        unitCost = unitCost ?? dbProduct.cost;
        if (productName === 'Producto' || !productName) {
          productName = dbProduct.name;
        }
      }

      const quantity = parseInt(body.quantity) || 1;
      
      // Calculamos el totalAmount
      let totalAmount: number;
      if (body.totalAmount !== undefined && body.totalAmount !== null) {
        totalAmount = parseFloat(body.totalAmount);
      } else {
        totalAmount = unitPrice ? unitPrice * quantity : 0;
      }

      // Obtener el próximo número de pedido
      const lastOrder = await tx.order.findFirst({
        orderBy: { orderNumber: 'desc' },
        select: { orderNumber: true }
      });
      const nextOrderNumber = (lastOrder?.orderNumber || 0) + 1;

      return tx.order.create({
        data: {
          orderNumber: nextOrderNumber,
          customerName: body.customerName,
          whatsapp: String(body.whatsapp || ''),
          quantity: quantity,
          product: productName,
          productId: productId,
          unitPrice: unitPrice,
          unitCost: unitCost,
          totalAmount: totalAmount,
          status: body.status || 'PENDING',
          isPaid: body.isPaid === true || body.isPaid === 'true',
        },
        include: { productRef: true }
      });
    });

    return NextResponse.json(order);
  } catch (error: unknown) {
    console.error('Error creating order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      error: 'Failed to create order',
      details: errorMessage
    }, { status: 500 });
  }
}
