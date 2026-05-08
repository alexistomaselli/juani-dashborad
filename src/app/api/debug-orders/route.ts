import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        productRef: true
      },
      orderBy: { createdAt: 'desc' },
      take: 1
    });
    return NextResponse.json({ success: true, data: orders });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message, 
      stack: error.stack,
      env: process.env.DATABASE_URL
    }, { status: 500 });
  }
}
