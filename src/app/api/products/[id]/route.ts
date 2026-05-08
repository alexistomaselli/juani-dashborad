import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        unitsPerPackage: body.unitsPerPackage ? parseInt(body.unitsPerPackage) : undefined,
        price: body.price ? parseFloat(body.price) : undefined,
        cost: body.cost ? parseFloat(body.cost) : undefined,
        active: body.active !== undefined ? body.active : undefined,
      },
    });
    
    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Soft delete
    const product = await prisma.product.update({
      where: { id },
      data: { active: false },
    });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
