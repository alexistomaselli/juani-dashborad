import DashboardLayout from '@/components/DashboardLayout';
import SettingsManager from '@/components/SettingsManager';
import AuthGuard from '@/components/AuthGuard';

export default function ConfiguracionPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-8">Configuración</h1>
          <SettingsManager />
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
