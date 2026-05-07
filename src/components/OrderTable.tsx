'use client';

import { useState } from 'react';
import { Phone, Package, Calendar, Check, X } from 'lucide-react';

interface OrderTableProps {
  orders: any[];
  onUpdate: (id: string, data: any) => void;
}

export default function OrderTable({ orders, onUpdate }: OrderTableProps) {
  return (
    <div style={{ flex: 1 }}>
      <h3 style={{ marginBottom: '1.5rem', fontWeight: '700' }}>Gestión de Pedidos</h3>
      
      {/* Desktop Table View */}
      <div className="card desktop-only">
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
                    <EditableField 
                      value={order.customerName} 
                      onSave={(val) => onUpdate(order.id, { customerName: val })} 
                      fontWeight="600"
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                      <Calendar size={12} /> {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <EditableField 
                        value={order.whatsapp} 
                        onSave={(val) => onUpdate(order.id, { whatsapp: val })} 
                        icon={Phone}
                        placeholder="Sin WhatsApp"
                        fontSize="0.875rem"
                      />
                      {order.whatsapp && (
                        <a 
                          href={`https://wa.me/${order.whatsapp.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="wa-link"
                          style={{ padding: '0.25rem', background: 'none', border: 'none' }}
                        >
                          <Phone size={14} color="var(--primary)" />
                        </a>
                      )}
                    </div>
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

      {/* Mobile Card View */}
      <div className="mobile-only order-cards-container">
        {orders.length === 0 && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem' }}>
            No hay pedidos registrados aún.
          </div>
        )}
        {orders.map((order) => (
          <div key={order.id} className="card order-mobile-card">
            <div className="mobile-card-row">
              <div>
                <EditableField 
                  value={order.customerName} 
                  onSave={(val) => onUpdate(order.id, { customerName: val })} 
                  fontWeight="700"
                  fontSize="1.1rem"
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                  <Calendar size={12} /> {new Date(order.createdAt).toLocaleDateString()}
                </div>
              </div>
              <span className={`status-badge status-${order.status}`}>
                {order.status === 'PENDING' ? 'Pendiente' : 
                 order.status === 'DELIVERED' ? 'Entregado' : 'Cancelado'}
              </span>
            </div>

            <div className="mobile-card-row">
              <span className="mobile-card-label">WhatsApp</span>
              <EditableField 
                value={order.whatsapp} 
                onSave={(val) => onUpdate(order.id, { whatsapp: val })} 
                icon={Phone}
                placeholder="Sin WhatsApp"
                fontSize="0.875rem"
              />
            </div>

            <div className="mobile-card-row">
              <span className="mobile-card-label">Pedido</span>
              <div style={{ fontWeight: '600' }}>{order.quantity}x {order.product}</div>
            </div>

            <div className="mobile-card-actions">
              <select 
                value={order.status} 
                onChange={(e) => onUpdate(order.id, { status: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="PENDING">Pendiente</option>
                <option value="DELIVERED">Entregado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
              
              {order.whatsapp ? (
                <a 
                  href={`https://wa.me/${order.whatsapp.replace(/\D/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="wa-link"
                  style={{ justifyContent: 'center' }}
                >
                  <Phone size={16} /> WhatsApp
                </a>
              ) : (
                <div style={{ color: 'var(--muted)', fontSize: '0.75rem', textAlign: 'center', alignSelf: 'center' }}>
                  Sin WhatsApp
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditableField({ 
  value: initialValue, 
  onSave, 
  icon: Icon, 
  placeholder,
  fontWeight = '400',
  fontSize = '1rem'
}: { 
  value: string, 
  onSave: (val: string) => void, 
  icon?: any,
  placeholder?: string,
  fontWeight?: string,
  fontSize?: string
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);

  const handleSave = () => {
    if (value !== initialValue) {
      onSave(value);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
        <input 
          autoFocus
          type="text" 
          value={value} 
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          onBlur={handleSave}
          style={{ padding: '0.25rem 0.5rem', fontSize, fontWeight, width: '100%' }}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', minHeight: '1.5rem' }}
    >
      {Icon && <Icon size={14} color={initialValue ? 'var(--primary)' : 'var(--muted)'} />}
      <span style={{ 
        color: initialValue ? 'var(--foreground)' : 'var(--muted)', 
        fontStyle: initialValue ? 'normal' : 'italic',
        fontWeight,
        fontSize
      }}>
        {initialValue || placeholder || 'Editar'}
      </span>
    </div>
  );
}
