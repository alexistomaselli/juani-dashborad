import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';


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

    // Fetch current max sequence for this delivery
    const maxOrder = await prisma.order.findFirst({
      where: { deliveryId: id },
      orderBy: { deliverySequence: 'desc' },
      select: { deliverySequence: true }
    });
    let nextSequence = (maxOrder?.deliverySequence ?? 0) + 1;

    // Update each order individually to assign deliveryId and incrementing sequence
    for (const orderId of orderIds) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          deliveryId: id,
          deliverySequence: nextSequence++
        }
      });
    }

    const updatedDelivery = await prisma.delivery.findUnique({
      where: { id: id },
      include: { orders: true }
    });

    return NextResponse.json(updatedDelivery);
  } catch (error) {
    console.error('Error assigning orders to delivery:', error);
    return NextResponse.json({ error: 'Failed to assign orders' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { orderIds } = await request.json();
    if (!Array.isArray(orderIds)) {
      return NextResponse.json({ error: 'orderIds must be an array' }, { status: 400 });
    }

    // Remove multiple orders from this delivery
    await prisma.order.updateMany({
      where: {
        id: { in: orderIds },
        deliveryId: id
      },
      data: {
        deliveryId: null
      }
    });

    return NextResponse.json({ message: 'Orders removed from delivery' });
  } catch (error) {
    console.error('Error removing orders from delivery:', error);
    return NextResponse.json({ error: 'Failed to remove orders' }, { status: 500 });
  }
}
