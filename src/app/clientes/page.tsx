'use client';

import CustomerManager from '@/components/CustomerManager';
import DashboardLayout from '@/components/DashboardLayout';

export default function CustomersPage() {
  return (
    <DashboardLayout>
      <CustomerManager />
    </DashboardLayout>
  );
}
