import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const delivery = await prisma.delivery.update({
      where: { id: id },
      data: {
        name: body.name,
        status: body.status,
      },
    });
    return NextResponse.json(delivery);
  } catch (error) {
    console.error('Error updating delivery:', error);
    return NextResponse.json({ error: 'Failed to update delivery' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Unset deliveryId for all orders in this delivery first
    await prisma.order.updateMany({
      where: { deliveryId: id },
      data: { deliveryId: null },
    });

    await prisma.delivery.delete({
      where: { id: id },
    });
    return NextResponse.json({ message: 'Delivery deleted' });
  } catch (error) {
    console.error('Error deleting delivery:', error);
    return NextResponse.json({ error: 'Failed to delete delivery' }, { status: 500 });
  }
}
