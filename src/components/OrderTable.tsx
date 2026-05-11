'use client';

import { useState, useEffect } from 'react';
import { Phone, Package, Calendar, Edit2, Trash2, MoreVertical, Check, X, Wallet, MapPin, ExternalLink, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Order, Product, OrderWithProduct } from '@/types';
import ConfirmDialog from './ConfirmDialog';

interface OrderTableProps {
  orders: OrderWithProduct[];
  onUpdate: (id: string, data: any) => void;
  onDelete: (id: string) => void;
  onEdit: (order: OrderWithProduct) => void;
  onRefresh: () => void;
}

export default function OrderTable({ orders, onUpdate, onDelete, onEdit, onRefresh }: OrderTableProps) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newDeliveryName, setNewDeliveryName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Close dropdown when clicking anywhere
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchDeliveries = async () => {
    try {
      const res = await fetch('/api/deliveries', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) setDeliveries(data);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    }
  };

  useEffect(() => {
    if (showAssignModal) {
      fetchDeliveries();
    }
  }, [showAssignModal]);

  const toggleSelectAll = () => {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map(o => o.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleAssignToDelivery = async (deliveryId: string) => {
    setIsAssigning(true);
    try {
      const res = await fetch(`/api/deliveries/${deliveryId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selectedIds }),
      });
      if (res.ok) {
        setSelectedIds([]);
        setShowAssignModal(false);
        onRefresh();
      }
    } catch (error) {
      console.error('Error assigning orders:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCreateAndAssign = async () => {
    if (!newDeliveryName.trim() || selectedIds.length === 0) return;
    
    setIsCreatingNew(true);
    try {
      // 1. Create the delivery
      const createRes = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDeliveryName }),
      });
      
      if (!createRes.ok) throw new Error('Failed to create delivery');
      const newDelivery = await createRes.json();
      
      // 2. Assign orders to it
      const assignRes = await fetch(`/api/deliveries/${newDelivery.id}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selectedIds }),
      });
      
      if (assignRes.ok) {
        setNewDeliveryName('');
        setSelectedIds([]);
        setShowAssignModal(false);
        onRefresh();
      }
    } catch (error) {
      console.error('Error in create and assign flow:', error);
    } finally {
      setIsCreatingNew(false);
    }
  };

  return (
    <div style={{ flex: 1 }}>
      <h3 style={{ marginBottom: '1.5rem', fontWeight: '700' }}>Gestión de Pedidos</h3>
      
      {/* Desktop Table View */}
      <div className="card desktop-only">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length === orders.length && orders.length > 0} 
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={{ width: '50px' }}>#</th>
                <th>Cliente</th>
                <th>WhatsApp</th>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Estado</th>
                <th>Dirección</th>
                <th>Pago</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem' }}>
                    No hay pedidos registrados aún.
                  </td>
                </tr>
              )}
              {orders.map((order) => (
                <tr key={order.id} className={selectedIds.includes(order.id) ? 'selected-row' : ''}>
                  <td>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(order.id)} 
                      onChange={() => toggleSelect(order.id)}
                    />
                  </td>
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
                    <WhatsAppField 
                      value={order.whatsapp} 
                      onSave={(val) => onUpdate(order.id, { whatsapp: val })} 
                    />
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
                    <EditableField 
                      value={order.deliveryAddress || ''} 
                      onSave={(val) => onUpdate(order.id, { deliveryAddress: val })} 
                      icon={MapPin}
                      placeholder="Sin dirección"
                      fontSize="0.85rem"
                      externalLink={order.deliveryAddress ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.deliveryAddress)}` : undefined}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--foreground)' }}>
                        ${(order.productRef?.price || order.unitPrice || 0) * order.quantity}
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
                  ${(order.productRef?.price || order.unitPrice || 0) * order.quantity}
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
              <WhatsAppField 
                value={order.whatsapp} 
                onSave={(val) => onUpdate(order.id, { whatsapp: val })} 
              />
            </div>

            <div className="mobile-card-row">
              <span className="mobile-card-label">Dirección</span>
              <EditableField 
                value={order.deliveryAddress || ''} 
                onSave={(val) => onUpdate(order.id, { deliveryAddress: val })} 
                icon={MapPin}
                placeholder="Sin dirección"
                fontSize="0.9rem"
                externalLink={order.deliveryAddress ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.deliveryAddress)}` : undefined}
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
              
              <button 
                onClick={() => {
                  setSelectedIds([order.id]);
                  setShowAssignModal(true);
                }}
                className="primary"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.5rem',
                  width: '100%',
                  padding: '0.75rem'
                }}
              >
                <Truck size={18} /> Asignar a Reparto
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="bulk-actions-bar"
          >
            <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="selected-count">
                  {selectedIds.length} seleccionados
                </div>
                <button className="secondary" onClick={() => setSelectedIds([])} style={{ fontSize: '0.8rem' }}>
                  Desmarcar todos
                </button>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button 
                  className="primary" 
                  onClick={() => setShowAssignModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Truck size={18} /> Asignar a Reparto
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign to Delivery Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '400px', width: '90%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontWeight: '800' }}>Asignar a Reparto</h3>
                <button className="secondary" onClick={() => setShowAssignModal(false)} style={{ padding: '0.25rem' }}>
                  <X size={20} />
                </button>
              </div>
              
              <p style={{ marginBottom: '1.5rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
                Selecciona un reparto para asignar los {selectedIds.length} pedidos seleccionados.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                {deliveries.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '1rem', color: 'var(--muted)' }}>No hay repartos disponibles.</p>
                ) : (
                  deliveries.map(d => (
                    <button 
                      key={d.id} 
                      className="delivery-option"
                      onClick={() => handleAssignToDelivery(d.id)}
                      disabled={isAssigning || isCreatingNew}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Truck size={16} />
                        <span style={{ fontWeight: '600' }}>{d.name}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{d.orders?.length || 0} pedidos</span>
                    </button>
                  ))
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '700', marginBottom: '1rem' }}>Crear nuevo reparto y asignar</h4>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    placeholder="Nombre del nuevo reparto..." 
                    value={newDeliveryName}
                    onChange={(e) => setNewDeliveryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateAndAssign();
                    }}
                    style={{ flex: 1 }}
                  />
                  <button 
                    className="primary" 
                    onClick={handleCreateAndAssign}
                    disabled={!newDeliveryName.trim() || isAssigning || isCreatingNew}
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    {isCreatingNew ? 'Creando...' : 'Crear'}
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button className="secondary" style={{ flex: 1 }} onClick={() => setShowAssignModal(false)}>Cerrar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      <style jsx>{`
        .bulk-actions-bar {
          position: fixed;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          background: var(--card-bg);
          border: 1px solid var(--primary);
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          padding: 1rem 2rem;
          border-radius: 1rem;
          z-index: 100;
          width: calc(100% - 4rem);
          max-width: 800px;
          backdrop-filter: blur(10px);
        }
        .selected-count {
          font-weight: 700;
          color: var(--primary);
          font-size: 1rem;
        }
        .selected-row {
          background: rgba(16, 185, 129, 0.05) !important;
        }
        .delivery-option {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--card-border);
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          width: 100%;
          color: var(--foreground);
        }
        .delivery-option:hover {
          background: rgba(16, 185, 129, 0.1);
          border-color: var(--primary);
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }
        .modal-content {
          padding: 2rem;
          border: 1px solid var(--card-border);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
      `}</style>
    </div>
  );
}

function WhatsAppField({ value, onSave }: { value: string; onSave: (val: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  // Sync temp value when prop changes
  useEffect(() => {
    setTempValue(value);
  }, [value]);

  if (isEditing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <input
          autoFocus
          type="text"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={() => {
            if (tempValue !== value) onSave(tempValue);
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (tempValue !== value) onSave(tempValue);
              setIsEditing(false);
            }
            if (e.key === 'Escape') {
              setTempValue(value);
              setIsEditing(false);
            }
          }}
          style={{ 
            padding: '0.25rem 0.5rem', 
            fontSize: '0.875rem', 
            width: '140px',
            background: 'var(--background)',
            border: '1px solid var(--accent)',
            borderRadius: '4px',
            color: 'var(--foreground)'
          }}
        />
      </div>
    );
  }

  const formattedValue = value.replace(/\D/g, '');
  const displayValue = formattedValue.startsWith('54') ? formattedValue.substring(2) : formattedValue;
  const linkValue = formattedValue.startsWith('54') ? formattedValue : `54${formattedValue}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '1.5rem' }}>
      {value ? (
        <a
          href={`https://wa.me/${linkValue}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ 
            color: 'var(--primary)', 
            textDecoration: 'none', 
            fontSize: '0.875rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.2rem 0.4rem',
            borderRadius: '4px',
            background: 'rgba(16, 185, 129, 0.05)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Phone size={12} />
          +54 {displayValue}
        </a>
      ) : (
        <span style={{ color: 'var(--muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>Sin WhatsApp</span>
      )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          style={{ 
            background: 'rgba(255, 255, 255, 0.05)', 
            border: '1px solid var(--card-border)', 
            padding: '0.4rem', 
            cursor: 'pointer', 
            color: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '0.5rem',
            transition: 'all 0.2s'
          }}
          className="hover-bright"
          title="Editar WhatsApp"
        >
          <Edit2 size={14} />
        </button>
    </div>
  );
}

function EditableField({ 
  value: initialValue, 
  onSave, 
  icon: Icon, 
  placeholder,
  fontWeight = '400',
  fontSize = '1rem',
  externalLink
}: { 
  value: string, 
  onSave: (val: string) => void, 
  icon?: any,
  placeholder?: string,
  fontWeight?: string,
  fontSize?: string,
  externalLink?: string
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);

  // Sync local value when initialValue changes
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

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
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') {
              setValue(initialValue);
              setIsEditing(false);
            }
          }}
          onBlur={handleSave}
          style={{ 
            padding: '0.25rem 0.5rem', 
            fontSize, 
            fontWeight, 
            width: '100%',
            background: 'var(--background)',
            border: '1px solid var(--accent)',
            borderRadius: '4px',
            color: 'var(--foreground)'
          }}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div 
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '1.5rem' }}
    >
      <div 
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1 }}
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
      
      {externalLink && initialValue && (
        <a 
          href={externalLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ 
            color: 'var(--primary)', 
            display: 'flex', 
            alignItems: 'center', 
            padding: '0.25rem',
            borderRadius: '4px',
            background: 'rgba(16, 185, 129, 0.1)',
            transition: 'all 0.2s'
          }}
          title="Ver en Google Maps"
        >
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}
