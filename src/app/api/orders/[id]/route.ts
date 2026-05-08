import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Obtenemos la orden actual para tener contexto
    const currentOrder = await (prisma as any).order.findUnique({
      where: { id },
      include: { productRef: true }
    });

    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Unimos los datos actuales con los nuevos
    const updatedData = { ...body };
    
    // Variables para el snapshot
    let productId = updatedData.productId !== undefined ? updatedData.productId : currentOrder.productId;
    let quantity = updatedData.quantity !== undefined ? parseInt(updatedData.quantity) : currentOrder.quantity;
    let unitPrice = updatedData.unitPrice !== undefined ? parseFloat(updatedData.unitPrice) : currentOrder.unitPrice;
    let unitCost = updatedData.unitCost !== undefined ? parseFloat(updatedData.unitCost) : currentOrder.unitCost;

    // Si cambió el productId o si los precios son null/0, buscamos en el catálogo
    if (productId && (productId !== currentOrder.productId || !unitPrice)) {
      const dbProduct = await (prisma as any).product.findUnique({ where: { id: productId } });
      if (dbProduct) {
        productId = dbProduct.id;
        unitPrice = unitPrice ?? dbProduct.price;
        unitCost = unitCost ?? dbProduct.cost;
        // Si no se pasó un nombre de producto, usamos el del catálogo para consistencia
        if (!updatedData.product || updatedData.product === currentOrder.product) {
          updatedData.product = dbProduct.name;
        }
      }
    }

    // Recalculamos el totalAmount si no se envió uno específico o si es 0
    let totalAmount = updatedData.totalAmount;
    if (totalAmount === undefined || totalAmount === null || totalAmount === 0) {
      if (unitPrice) {
        totalAmount = unitPrice * quantity;
      } else {
        totalAmount = currentOrder.totalAmount;
      }
    }

    // Construimos el objeto de actualización de forma segura
    const dataToUpdate: Record<string, any> = {
      customerName: updatedData.customerName,
      whatsapp: updatedData.whatsapp,
      quantity: quantity,
      product: updatedData.product,
      productId: productId,
      unitPrice: unitPrice,
      unitCost: unitCost,
      status: updatedData.status,
      isPaid: updatedData.isPaid !== undefined ? (updatedData.isPaid === true || updatedData.isPaid === 'true') : undefined,
      totalAmount: totalAmount,
    };

    // Remove undefined fields
    Object.keys(dataToUpdate).forEach(key => 
      dataToUpdate[key] === undefined && delete dataToUpdate[key]
    );

    const order = await (prisma as any).order.update({
      where: { id: id },
      data: dataToUpdate,
      include: { productRef: true }
    });

    return NextResponse.json(order);
  } catch (error: unknown) {
    console.error('Error updating order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update order', details: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.order.delete({
      where: { id: id },
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to delete order', details: errorMessage }, { status: 500 });
  }
}
