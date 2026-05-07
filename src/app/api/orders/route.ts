import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const order = await prisma.order.create({
      data: {
        customerName: body.customerName,
        whatsapp: body.whatsapp,
        quantity: parseInt(body.quantity),
        product: body.product,
        totalAmount: body.totalAmount ? parseFloat(body.totalAmount) : null,
        status: 'PENDING',
      },
    });
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
