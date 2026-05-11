import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const deliveries = await prisma.delivery.findMany({
      include: {
        orders: {
          include: { productRef: true },
          orderBy: { deliverySequence: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(deliveries);
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const delivery = await prisma.delivery.create({
      data: {
        name: body.name,
        status: body.status || 'PENDING',
      },
    });

    return NextResponse.json(delivery);
  } catch (error) {
    console.error('Error creating delivery:', error);
    return NextResponse.json({ error: 'Failed to create delivery' }, { status: 500 });
  }
}
