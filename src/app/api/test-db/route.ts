import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('Test DB: Fetching one order...');
    const order = await prisma.order.findFirst();
    return NextResponse.json({ 
      success: true, 
      order,
      databaseUrl: process.env.DATABASE_URL 
    });
  } catch (error: any) {
    console.error('Test DB Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message, 
      stack: error.stack,
      databaseUrl: process.env.DATABASE_URL
    }, { status: 500 });
  }
}
