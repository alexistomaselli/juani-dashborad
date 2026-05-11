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

    // Assign multiple orders to this delivery
    await prisma.order.updateMany({
      where: {
        id: { in: orderIds }
      },
      data: {
        deliveryId: id
      }
    });

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
