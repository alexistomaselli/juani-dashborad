import { ShoppingBag, Clock, CheckCircle } from 'lucide-react';

interface KPIProps {
  orders: any[];
}

export default function KPIs({ orders }: KPIProps) {
  const total = orders.length;
  const pending = orders.filter(o => o.status === 'PENDING').length;
  const delivered = orders.filter(o => o.status === 'DELIVERED').length;

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
          <span className="kpi-label">Pendientes</span>
          <Clock size={20} color="var(--pending)" />
        </div>
        <span className="kpi-value">{pending}</span>
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
