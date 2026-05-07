'use client';

import { useState } from 'react';
import { Phone, Package, Calendar, Check, X } from 'lucide-react';

interface OrderTableProps {
  orders: any[];
  onUpdate: (id: string, data: any) => void;
}

export default function OrderTable({ orders, onUpdate }: OrderTableProps) {
  return (
    <div className="card" style={{ flex: 1 }}>
      <h3 style={{ marginBottom: '1.5rem', fontWeight: '700' }}>Gestión de Pedidos</h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>WhatsApp (Clic para editar)</th>
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
                  <EditableWhatsApp 
                    id={order.id} 
                    initialValue={order.whatsapp} 
                    onSave={(val) => onUpdate(order.id, { whatsapp: val })} 
                  />
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
                    onChange={(e) => onUpdate(order.id, { status: e.target.value })}
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

function EditableWhatsApp({ id, initialValue, onSave }: { id: string, initialValue: string, onSave: (val: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);

  const handleSave = () => {
    onSave(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input 
          autoFocus
          type="text" 
          value={value} 
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          onBlur={handleSave}
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
        />
      </div>
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
    >
      <Phone size={14} color={initialValue ? 'var(--primary)' : 'var(--muted)'} />
      <span style={{ color: initialValue ? 'var(--foreground)' : 'var(--muted)', fontStyle: initialValue ? 'normal' : 'italic' }}>
        {initialValue || 'Sin WhatsApp'}
      </span>
    </div>
  );
}
