'use client';

import { useState, useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import KPIs from './KPIs';
import { 
  format, 
  isToday, 
  isWithinInterval, 
  subDays, 
  startOfMonth, 
  endOfMonth,
  parseISO 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, 
  ChevronRight, 
  ExternalLink,
  Package,
  Circle,
  ShoppingBag
} from 'lucide-react';
import Link from 'next/link';
import { OrderWithProduct } from '@/types';
import CollapsibleCard from './ui/CollapsibleCard';
import { Users, CreditCard, MessageSquare } from 'lucide-react';

type FilterType = 'today' | 'last7' | 'month' | 'all';

export default function DashboardSummary() {
  const { orders, loading, customers } = useDashboard();
  const [filter, setFilter] = useState<FilterType>('today');

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    const now = new Date();
    
    return orders.filter(order => {
      const orderDate = parseISO(order.createdAt);
      
      switch (filter) {
        case 'today':
          return isToday(orderDate);
        case 'last7':
          return isWithinInterval(orderDate, {
            start: subDays(now, 7),
            end: now
          });
        case 'month':
          return isWithinInterval(orderDate, {
            start: startOfMonth(now),
            end: endOfMonth(now)
          });
        default:
          return true;
      }
    });
  }, [orders, filter]);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    const now = new Date();
    return customers.filter(c => {
      const date = parseISO(c.createdAt);
      switch (filter) {
        case 'today': return isToday(date);
        case 'last7': return isWithinInterval(date, { start: subDays(now, 7), end: now });
        case 'month': return isWithinInterval(date, { start: startOfMonth(now), end: endOfMonth(now) });
        default: return true;
      }
    });
  }, [customers, filter]);

  const paidOrders = useMemo(() => {
    return filteredOrders.filter(o => o.isPaid);
  }, [filteredOrders]);

  const totalPaidInPeriod = useMemo(() => {
    return paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [paidOrders]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="animate-spin">
          <Circle size={32} color="var(--accent)" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '800', marginBottom: '0.25rem' }}>Resumen General</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Vista rápida del estado de tu negocio</p>
        </div>
        
        <div style={{ 
          display: 'flex', 
          background: 'var(--card-bg)', 
          padding: '0.25rem', 
          borderRadius: '0.75rem',
          border: '1px solid var(--border)',
          gap: '0.25rem'
        }}>
          {[
            { id: 'today', label: 'Hoy' },
            { id: 'last7', label: '7 días' },
            { id: 'month', label: 'Mes' },
            { id: 'all', label: 'Todo' }
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => setFilter(option.id as FilterType)}
              className={filter === option.id ? 'primary' : 'secondary'}
              style={{ 
                padding: '0.5rem 1rem', 
                fontSize: '0.875rem',
                border: 'none',
                background: filter === option.id ? 'var(--accent)' : 'transparent',
                color: filter === option.id ? 'white' : 'var(--foreground)'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs for Filtered Range */}
      <KPIs orders={filteredOrders} totalCustomers={customers.length} />

          {/* Activities Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Pedidos Recientes */}
        <CollapsibleCard 
          title="Pedidos Recientes"
          subtitle="Últimos pedidos realizados en el periodo"
          count={filteredOrders.length}
          icon={<ShoppingBag size={20} />}
          defaultOpen={true}
          action={
            <Link href="/pedidos" style={{ 
              fontSize: '0.875rem', 
              color: 'var(--accent)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.25rem',
              fontWeight: '600'
            }}>
              Ver todos <ChevronRight size={16} />
            </Link>
          }
        >
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Pago</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.slice(0, 10).map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: '600', color: 'var(--muted)' }}>#{order.orderNumber}</td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{order.customerName}</div>
                    </td>
                    <td>{order.product}</td>
                    <td>{order.quantity}</td>
                    <td style={{ fontWeight: '700' }}>${Math.round(order.totalAmount || 0).toLocaleString()}</td>
                    <td>
                      <span className={`status-badge status-${order.status.toLowerCase()}`}>
                        {order.status === 'PENDING' ? 'Pendiente' : 
                         order.status === 'DELIVERED' ? 'Entregado' : 'Cancelado'}
                      </span>
                    </td>
                    <td>
                      <span style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        color: order.isPaid ? 'var(--delivered)' : 'var(--pending)',
                        fontSize: '0.75rem',
                        fontWeight: '700'
                      }}>
                        <div style={{ 
                          width: '6px', 
                          height: '6px', 
                          borderRadius: '50%', 
                          background: order.isPaid ? 'var(--delivered)' : 'var(--pending)' 
                        }} />
                        {order.isPaid ? 'COBRADO' : 'PENDIENTE'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                      No hay pedidos para este periodo
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CollapsibleCard>

        {/* Últimos Clientes */}
        <CollapsibleCard 
          title="Nuevos Clientes"
          subtitle="Clientes que se sumaron en el periodo"
          count={filteredCustomers.length}
          icon={<Users size={20} />}
        >
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>WhatsApp</th>
                  <th>Fecha</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.slice(0, 5).map((customer) => (
                  <tr key={customer.id}>
                    <td style={{ fontWeight: '600' }}>{customer.name}</td>
                    <td>{customer.whatsapp || '-'}</td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                      {format(parseISO(customer.createdAt), 'dd MMM HH:mm', { locale: es })}
                    </td>
                    <td>
                      <Link href={`/clientes`} style={{ color: 'var(--accent)' }}>
                        <ExternalLink size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                      No hay clientes nuevos en este periodo
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CollapsibleCard>

        {/* Últimos Pagos */}
        <CollapsibleCard 
          title="Pagos Recibidos"
          subtitle={`Total cobrado: $${Math.round(totalPaidInPeriod).toLocaleString()}`}
          count={paidOrders.length}
          icon={<CreditCard size={20} />}
        >
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th># Pedido</th>
                  <th>Cliente</th>
                  <th>Monto</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {paidOrders.slice(0, 5).map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: '600', color: 'var(--muted)' }}>#{order.orderNumber}</td>
                    <td style={{ fontWeight: '600' }}>{order.customerName}</td>
                    <td style={{ color: 'var(--delivered)', fontWeight: '700' }}>
                      ${Math.round(order.totalAmount || 0).toLocaleString()}
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                      {format(parseISO(order.updatedAt), 'dd MMM HH:mm', { locale: es })}
                    </td>
                  </tr>
                ))}
                {paidOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                      No se registraron cobros en este periodo
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CollapsibleCard>

      </div>
    </div>
  );
}
