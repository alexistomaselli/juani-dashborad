'use client';

import { Phone, Package, Calendar } from 'lucide-react';

interface OrderTableProps {
  orders: any[];
  onStatusChange: (id: string, status: string) => void;
}

export default function OrderTable({ orders, onStatusChange }: OrderTableProps) {
  return (
    <div className="card" style={{ flex: 1 }}>
      <h3 style={{ marginBottom: '1.5rem', fontWeight: '700' }}>Gestión de Pedidos</h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>WhatsApp</th>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem' }}>
                  No hay pedidos registrados aún.
                </td>
              </tr>
            )}
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <div style={{ fontWeight: '600' }}>{order.customerName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={12} /> {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td>
                  <a 
                    href={`https://wa.me/${order.whatsapp}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <Phone size={14} /> {order.whatsapp}
                  </a>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Package size={14} color="var(--muted)" /> {order.product}
                  </div>
                </td>
                <td style={{ fontWeight: '700' }}>{order.quantity}</td>
                <td>
                  <span className={`status-badge status-${order.status}`}>
                    {order.status === 'PENDING' ? 'Pendiente' : 
                     order.status === 'DELIVERED' ? 'Entregado' : 'Cancelado'}
                  </span>
                </td>
                <td>
                  <select 
                    value={order.status} 
                    onChange={(e) => onStatusChange(order.id, e.target.value)}
                    style={{ padding: '0.4rem', fontSize: '0.8rem', width: 'auto' }}
                  >
                    <option value="PENDING">Pendiente</option>
                    <option value="DELIVERED">Entregado</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
