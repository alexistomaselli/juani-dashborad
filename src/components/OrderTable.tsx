'use client';

import { useState, useEffect } from 'react';
import { Phone, Package, Calendar, Edit2, Trash2, MoreVertical, Check, X, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Order, Product, OrderWithProduct } from '@/types';
import ConfirmDialog from './ConfirmDialog';

interface OrderTableProps {
  orders: OrderWithProduct[];
  onUpdate: (id: string, data: any) => void;
  onDelete: (id: string) => void;
  onEdit: (order: OrderWithProduct) => void;
}

export default function OrderTable({ orders, onUpdate, onDelete, onEdit }: OrderTableProps) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Close dropdown when clicking anywhere
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div style={{ flex: 1 }}>
      <h3 style={{ marginBottom: '1.5rem', fontWeight: '700' }}>Gestión de Pedidos</h3>
      
      {/* Desktop Table View */}
      <div className="card desktop-only">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th>Cliente</th>
                <th>WhatsApp</th>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Estado</th>
                <th>Pago</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem' }}>
                    No hay pedidos registrados aún.
                  </td>
                </tr>
              )}
              {orders.map((order) => (
                <tr key={order.id}>
                  <td style={{ color: 'var(--muted)', fontWeight: '600' }}>
                    {order.orderNumber ? `#${order.orderNumber}` : '-'}
                  </td>
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
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Package size={14} color="var(--muted)" /> {order.product}
                      </div>
                      {order.productRef && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginLeft: '1.25rem' }}>
                          Estructura: x{order.productRef.unitsPerPackage} un.
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontWeight: '700' }}>
                    {order.quantity}
                    {order.productRef && (
                      <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 'normal' }}>
                        ({order.quantity * order.productRef.unitsPerPackage} un.)
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '120px' }}>
                      <select 
                        value={order.status} 
                        onChange={(e) => onUpdate(order.id, { status: e.target.value })}
                        className={`status-select status-${order.status}`}
                        style={{ padding: '0.4rem', fontSize: '0.8rem', width: '100%', borderRadius: '0.5rem' }}
                      >
                        <option value="PENDING">Pendiente</option>
                        <option value="DELIVERED">Entregado</option>
                        <option value="CANCELLED">Cancelado</option>
                      </select>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--foreground)' }}>
                        ${order.totalAmount || (order.quantity * (order.productRef?.price || 0))}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate(order.id, { isPaid: !order.isPaid });
                        }}
                        className={`status-badge ${order.isPaid ? 'status-DELIVERED' : 'status-CANCELLED'}`}
                        style={{ cursor: 'pointer', border: 'none', padding: '0.4rem 0.8rem', width: '100%', textAlign: 'center', fontSize: '0.75rem' }}
                      >
                        {order.isPaid ? 'Pagado' : 'Impago'}
                      </button>
                    </div>
                  </td>
                  <td style={{ position: 'relative' }}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(openDropdownId === order.id ? null : order.id);
                      }}
                      className="secondary"
                      style={{ padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <MoreVertical size={16} />
                    </button>

                    <AnimatePresence>
                      {openDropdownId === order.id && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 5, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="dropdown-menu"
                          style={{
                            position: 'absolute',
                            right: '0',
                            top: '100%',
                          }}
                        >
                          <button 
                            className="dropdown-item"
                            onClick={() => { onUpdate(order.id, { isPaid: !order.isPaid }); setOpenDropdownId(null); }}
                          >
                            <Wallet size={16} /> Marcar como {order.isPaid ? 'Impago' : 'Pagado'}
                          </button>
                          
                          <button 
                            className="dropdown-item"
                            onClick={() => { onEdit(order); setOpenDropdownId(null); }}
                          >
                            <Edit2 size={16} /> Editar Pedido
                          </button>
                          
                          <button 
                            className="dropdown-item danger"
                            onClick={() => { 
                              setConfirmDeleteId(order.id);
                              setOpenDropdownId(null); 
                            }}
                          >
                            <Trash2 size={16} /> Eliminar Pedido
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--muted)', fontWeight: '600' }}>
                    #{order.orderNumber}
                  </span>
                  <EditableField 
                    value={order.customerName} 
                    onSave={(val) => onUpdate(order.id, { customerName: val })} 
                    fontWeight="700"
                    fontSize="1.1rem"
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                  <Calendar size={12} /> {new Date(order.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                <span className={`status-badge status-${order.status}`}>
                  {order.status === 'PENDING' ? 'Pendiente' : 
                   order.status === 'DELIVERED' ? 'Entregado' : 'Cancelado'}
                </span>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--foreground)', marginTop: '0.25rem' }}>
                  ${order.totalAmount || (order.quantity * (order.productRef?.price || 0))}
                </div>
                <button 
                  onClick={() => onUpdate(order.id, { isPaid: !order.isPaid })}
                  className={`status-badge ${order.isPaid ? 'status-DELIVERED' : 'status-CANCELLED'}`}
                  style={{ border: 'none', fontSize: '0.7rem' }}
                >
                  {order.isPaid ? 'Pagado' : 'Impago'}
                </button>
              </div>
            </div>

            <div className="mobile-card-row">
              <span className="mobile-card-label">WhatsApp</span>
              <EditableField 
                value={order.whatsapp} 
                onSave={(val) => onUpdate(order.id, { whatsapp: val })} 
                placeholder="Sin WhatsApp"
                fontSize="0.875rem"
              />
            </div>

            <div className="mobile-card-row">
              <span className="mobile-card-label">Pedido</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{ fontWeight: '600' }}>{order.quantity}x {order.product}</div>
                {order.productRef && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                    ({order.quantity * order.productRef.unitsPerPackage} un. totales)
                  </div>
                )}
              </div>
            </div>

            <div className="mobile-card-actions" style={{ flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <select 
                  value={order.status} 
                  onChange={(e) => onUpdate(order.id, { status: e.target.value })}
                  className={`status-select status-${order.status}`}
                  style={{ flex: 1 }}
                >
                  <option value="PENDING">Pendiente</option>
                  <option value="DELIVERED">Entregado</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => onEdit(order)} className="secondary" style={{ padding: '0.5rem' }} title="Editar"><Edit2 size={18} /></button>
                  <button onClick={() => setConfirmDeleteId(order.id)} className="secondary" style={{ padding: '0.5rem', color: 'var(--cancelled)' }} title="Eliminar"><Trash2 size={18} /></button>
                </div>
              </div>
              
              {order.whatsapp ? (
                <a 
                  href={`https://wa.me/${order.whatsapp.replace(/\D/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="wa-link"
                  style={{ justifyContent: 'center', width: '100%' }}
                >
                  <Phone size={16} /> WhatsApp
                </a>
              ) : (
                <div style={{ color: 'var(--muted)', fontSize: '0.75rem', textAlign: 'center' }}>
                  Sin WhatsApp
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog 
        isOpen={!!confirmDeleteId}
        title="¿Eliminar pedido?"
        message="Esta acción no se puede deshacer. El pedido será borrado permanentemente del sistema."
        onConfirm={() => {
          if (confirmDeleteId) {
            onDelete(confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
        onCancel={() => setConfirmDeleteId(null)}
        confirmText="Sí, Eliminar"
        cancelText="No, Mantener"
        isDanger={true}
      />
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
