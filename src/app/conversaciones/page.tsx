'use client';

import ConversationsManager from '@/components/ConversationsManager';
import DashboardLayout from '@/components/DashboardLayout';

export default function ConversationsPage() {
  return (
    <DashboardLayout>
      <ConversationsManager />
    </DashboardLayout>
  );
}
