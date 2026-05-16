'use client';

import ProductManager from '@/components/ProductManager';
import DashboardLayout from '@/components/DashboardLayout';

export default function ProductsPage() {
  return (
    <DashboardLayout>
      <ProductManager />
    </DashboardLayout>
  );
}
