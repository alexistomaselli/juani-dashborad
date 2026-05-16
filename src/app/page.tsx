import DashboardSummary from '@/components/DashboardSummary';
import DashboardLayout from '@/components/DashboardLayout';

export default function Home() {
  return (
    <DashboardLayout>
      <div style={{ paddingBottom: '2rem' }}>
        <DashboardSummary />
      </div>
    </DashboardLayout>
  );
}
