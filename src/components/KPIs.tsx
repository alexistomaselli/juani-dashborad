import { Clock, CheckCircle, TrendingUp, Wallet, Users } from 'lucide-react';

import { OrderWithProduct } from '@/types';
import { formatOrderAmount, summarizeOrderAmounts } from '@/lib/orderPricing';

interface KPIProps {
  orders: OrderWithProduct[];
  totalCustomers?: number;
}

export default function KPIs({ orders, totalCustomers }: KPIProps) {
  const activeOrders = orders.filter(o => o.status !== 'CANCELLED');
  const deliveredOrders = activeOrders.filter(o => o.status === 'DELIVERED');
  const pendingOrders = orders.filter(o => o.status === 'PENDING');
  
  const deliveredOrdersCount = deliveredOrders.length;
  const pendingOrdersCount = pendingOrders.length;

  // Cantidad de paquetes entregados
  const deliveredPackages = deliveredOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
    
  const pendingPackages = pendingOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);

  const amounts = summarizeOrderAmounts(orders);
  const { revenue: totalRevenue, profit: totalProfit, paid: totalPaid, pending: pendingToCollect, average: avgTicket } = amounts;
  const noTotals = activeOrders.length > 0 && amounts.missingTotals === activeOrders.length;
  const noProfits = activeOrders.length > 0 && amounts.missingProfits === activeOrders.length;

  return (
    <div className="kpi-grid">
      {(amounts.missingTotals > 0 || amounts.missingProfits > 0) && (
        <p role="status" style={{ gridColumn: '1 / -1', color: 'var(--pending)', margin: 0 }}>
          Totales parciales: {amounts.missingTotals} pedidos sin importe y {amounts.missingProfits} sin datos suficientes para calcular ganancia.
          {' '}Se incluyen sólo los valores registrados; no se usa el catálogo actual.
        </p>
      )}
      <div className="card kpi-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="kpi-label">Pedidos Pendientes</span>
          <Clock size={20} color="var(--pending)" />
        </div>
        <span className="kpi-value" style={{ color: 'var(--pending)' }}>{pendingOrdersCount}</span>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
          Total a entregar: <span style={{ color: 'var(--foreground)', fontWeight: '600' }}>{pendingPackages} packs</span>
        </div>
      </div>

      <div className="card kpi-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="kpi-label">Volumen Entregado</span>
          <CheckCircle size={20} color="var(--delivered)" />
        </div>
        <span className="kpi-value" style={{ color: 'var(--delivered)' }}>{deliveredPackages}</span>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
          De <span style={{ fontWeight: '600' }}>{deliveredOrdersCount}</span> pedidos completados
        </div>
      </div>

      <div className="card kpi-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="kpi-label">Ventas Totales</span>
          <TrendingUp size={20} color="var(--delivered)" />
        </div>
        <span className="kpi-value">
          {formatOrderAmount(noTotals ? null : totalRevenue)}
        </span>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
          Ganancia est.: <span style={{ color: 'var(--delivered)', fontWeight: '600' }}>{noProfits ? 'Sin datos de ganancia' : formatOrderAmount(totalProfit)}</span>
        </div>
      </div>

      <div className="card kpi-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="kpi-label">Estado de Cobranza</span>
          <Wallet size={20} color="var(--accent)" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span className="kpi-value" style={{ color: 'var(--delivered)', fontSize: '1.5rem' }}>
            {formatOrderAmount(noTotals ? null : totalPaid)} <span style={{ fontSize: '0.875rem', fontWeight: 'normal' }}>Pagado</span>
          </span>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Pendiente:</span>
            <span style={{ color: 'var(--cancelled)', fontWeight: '600' }}>
              {formatOrderAmount(noTotals ? null : pendingToCollect)}
            </span>
          </div>
        </div>
      </div>

      <div className="card kpi-card" style={{ borderLeft: '4px solid var(--accent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="kpi-label">Ticket Promedio</span>
          <TrendingUp size={20} color="var(--accent)" />
        </div>
        <span className="kpi-value" style={{ fontSize: '2rem' }}>
          {formatOrderAmount(activeOrders.length === 0 ? 0 : avgTicket)}
        </span>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
          Valor medio por pedido con importe registrado
        </div>
      </div>

      {totalCustomers !== undefined && (
        <div className="card kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="kpi-label">Total Clientes</span>
            <Users size={20} color="var(--accent)" />
          </div>
          <span className="kpi-value">{totalCustomers}</span>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
            Clientes registrados en la base
          </div>
        </div>
      )}
    </div>
  );
}
