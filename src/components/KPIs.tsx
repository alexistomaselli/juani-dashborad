import { ShoppingBag, Clock, CheckCircle } from 'lucide-react';

interface KPIProps {
  orders: any[];
}

export default function KPIs({ orders }: KPIProps) {
  const total = orders.length;
  const pending = orders.filter(o => o.status === 'PENDING').length;
  const delivered = orders.filter(o => o.status === 'DELIVERED').length;
  
  // New KPIs for Juani Cocina
  const totalPackages = orders
    .filter(o => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.quantity || 0), 0);
    
  const pendingPackages = orders
    .filter(o => o.status === 'PENDING')
    .reduce((sum, o) => sum + (o.quantity || 0), 0);

  return (
    <div className="kpi-grid">
      <div className="card kpi-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="kpi-label">Pedidos Totales</span>
          <ShoppingBag size={20} color="var(--accent)" />
        </div>
        <span className="kpi-value">{total}</span>
      </div>

      <div className="card kpi-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="kpi-label">Total Paquetes (6uni.)</span>
          <ShoppingBag size={20} color="var(--primary)" />
        </div>
        <span className="kpi-value">{totalPackages}</span>
      </div>

      <div className="card kpi-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="kpi-label">Producción Pendiente</span>
          <Clock size={20} color="var(--pending)" />
        </div>
        <span className="kpi-value" style={{ color: 'var(--pending)' }}>{pendingPackages}</span>
      </div>

      <div className="card kpi-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="kpi-label">Entregados</span>
          <CheckCircle size={20} color="var(--delivered)" />
        </div>
        <span className="kpi-value">{delivered}</span>
      </div>
    </div>
  );
}
