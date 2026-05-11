import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { orderIds } = await request.json();

    if (!Array.isArray(orderIds)) {
      return NextResponse.json({ error: 'orderIds must be an array' }, { status: 400 });
    }

    // Update sequences for all orders in the provided list
    // We use a transaction to ensure all or nothing
    await prisma.$transaction(
      orderIds.map((orderId, index) => 
        prisma.order.update({
          where: { id: orderId, deliveryId: id },
          data: { deliverySequence: index + 1 }
        })
      )
    );

    return NextResponse.json({ message: 'Orders reordered successfully' });
  } catch (error) {
    console.error('Error reordering orders:', error);
    return NextResponse.json({ error: 'Failed to reorder orders' }, { status: 500 });
  }
}
