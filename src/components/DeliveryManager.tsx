'use client';

import { useState, useEffect } from 'react';
import { Truck, Plus, Trash2, Calendar, Package, ChevronRight, ChevronDown, ChevronUp, CheckCircle2, Clock, Edit2, X, Check, MapPin, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Delivery, Order } from '@/types';
import ConfirmDialog from './ConfirmDialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function DeliveryManager() {
  const { role } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const fetchDeliveries = async () => {
    try {
      const { data, error } = await supabase
        .from('Delivery')
        .select(`
          *,
          orders:Order(
            *,
            customer:Customer(*)
          )
        `)
        .order('createdAt', { ascending: false });
      
      if (error) throw error;

      // Sort orders within each delivery by sequence
      const processedData = (data || []).map(d => ({
        ...d,
        orders: (d.orders || []).sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
      }));

      setDeliveries(processedData);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const { error } = await supabase
        .from('Delivery')
        .insert({ name: newName });
      
      if (error) throw error;

      setNewName('');
      setIsCreating(false);
      fetchDeliveries();
    } catch (error) {
      console.error('Error creating delivery:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // First, unassign orders from this delivery
      await supabase
        .from('Order')
        .update({ deliveryId: null })
        .eq('deliveryId', id);

      // Then delete the delivery
      const { error } = await supabase
        .from('Delivery')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      fetchDeliveries();
    } catch (error) {
      console.error('Error deleting delivery:', error);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('Delivery')
        .update({ status, updatedAt: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      fetchDeliveries();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleUpdateName = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      const { error } = await supabase
        .from('Delivery')
        .update({ name: editingName, updatedAt: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      setEditingId(null);
      fetchDeliveries();
    } catch (error) {
      console.error('Error updating name:', error);
    }
  };

  const handleRemoveOrder = async (deliveryId: string, orderId: string) => {
    try {
      const { error } = await supabase
        .from('Order')
        .update({ deliveryId: null, deliverySequence: 0 })
        .eq('id', orderId);
      
      if (error) throw error;
      fetchDeliveries();
    } catch (error) {
      console.error('Error removing order:', error);
    }
  };

  const handleMoveOrder = async (deliveryId: string, orderId: string, direction: 'up' | 'down') => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery || !delivery.orders) return;

    const orders = [...delivery.orders];
    const index = orders.findIndex(o => o.id === orderId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      [orders[index], orders[index - 1]] = [orders[index - 1], orders[index]];
    } else if (direction === 'down' && index < orders.length - 1) {
      [orders[index], orders[index + 1]] = [orders[index + 1], orders[index]];
    } else {
      return;
    }

    // Update local state optimistically
    const newDeliveries = deliveries.map(d => 
      d.id === deliveryId ? { ...d, orders } : d
    );
    setDeliveries(newDeliveries);

    // Persist to server - batch update sequence
    try {
      const updates = orders.map((o, idx) => ({
        id: o.id,
        deliverySequence: idx + 1
      }));

      // We can't do multiple updates with different values in one .update() easily without upsert or multiple calls
      // For simplicity and speed in this context, we'll do them in parallel
      await Promise.all(updates.map(u => 
        supabase.from('Order').update({ deliverySequence: u.deliverySequence }).eq('id', u.id)
      ));
    } catch (error) {
      console.error('Error reordering orders:', error);
      fetchDeliveries();
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PENDING' ? 'DELIVERED' : 'PENDING';
    try {
      const { error } = await supabase
        .from('Order')
        .update({ status: newStatus, updatedAt: new Date().toISOString() })
        .eq('id', orderId);
      
      if (error) throw error;
      fetchDeliveries();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  return (
    <div className="delivery-manager">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontWeight: '800', fontSize: '1.5rem', marginBottom: '0.25rem' }}>Gestión de Repartos V2</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Organiza tus pedidos en grupos de entrega</p>
        </div>
        <button className="primary" onClick={() => setIsCreating(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Nuevo Reparto
        </button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card"
            style={{ marginBottom: '2rem', border: '1px solid var(--primary)' }}
          >
            <form onSubmit={handleCreate} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Nombre del Reparto</label>
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Ej: Reparto Norte - Lunes" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <button type="submit" className="primary">Crear</button>
              <button type="button" className="secondary" onClick={() => setIsCreating(false)}>Cancelar</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="delivery-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>Cargando repartos...</div>
        ) : deliveries.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
            <Truck size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
            <p>No hay repartos creados aún.</p>
          </div>
        ) : (
          deliveries.map((delivery) => (
            <div key={delivery.id} className={`card delivery-card ${expandedId === delivery.id ? 'expanded' : ''}`}>
              <div 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setExpandedId(expandedId === delivery.id ? null : delivery.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className={`status-icon ${delivery.status === 'COMPLETED' ? 'completed' : 'pending'}`}>
                    {delivery.status === 'COMPLETED' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                  </div>
                  <div>
                    {editingId === delivery.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                        <input 
                          autoFocus
                          type="text" 
                          value={editingName} 
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleUpdateName(delivery.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '1rem', width: '200px' }}
                        />
                        <button className="primary" onClick={() => handleUpdateName(delivery.id)} style={{ padding: '0.4rem' }}>
                          <Check size={16} />
                        </button>
                        <button className="secondary" onClick={() => setEditingId(null)} style={{ padding: '0.4rem' }}>
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ fontWeight: '700', fontSize: '1.1rem' }}>{delivery.name}</h3>
                        <button 
                          className="hover-bright" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(delivery.id);
                            setEditingName(delivery.name);
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '0.25rem' }}
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={12} /> {new Date(delivery.createdAt).toLocaleDateString()}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Package size={12} /> {delivery.orders?.length || 0} pedidos
                      </span>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <select 
                    value={delivery.status}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleUpdateStatus(delivery.id, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={`status-select status-${delivery.status}`}
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                  >
                    <option value="PENDING">Pendiente</option>
                    <option value="IN_PROGRESS">En Camino</option>
                    <option value="COMPLETED">Completado</option>
                  </select>
                  
                   {role === 'SUPERADMIN' && (
                    <button 
                      className="secondary danger" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(delivery.id);
                      }}
                      style={{ padding: '0.4rem' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  
                  {expandedId === delivery.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
              </div>

              <AnimatePresence>
                {expandedId === delivery.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--muted)' }}>Pedidos en este reparto:</h4>
                      {delivery.orders && delivery.orders.length > 0 ? (
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                           {delivery.orders.map((order, index) => (
                            <motion.div 
                              layout
                              key={order.id} 
                              className="order-item-mini"
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '4px' }}>
                                    <button 
                                      onClick={() => handleMoveOrder(delivery.id, order.id, 'up')}
                                      disabled={index === 0}
                                      className="reorder-btn"
                                      title="Subir"
                                    >
                                      <ChevronUp size={12} />
                                    </button>
                                    <button 
                                      onClick={() => handleMoveOrder(delivery.id, order.id, 'down')}
                                      disabled={index === (delivery.orders?.length || 0) - 1}
                                      className="reorder-btn"
                                      title="Bajar"
                                    >
                                      <ChevronDown size={12} />
                                    </button>
                                  </div>
                                  <span style={{ fontWeight: '700', fontSize: '0.875rem', color: 'var(--primary)', width: '20px' }}>{index + 1}.</span>
                                  <span style={{ fontWeight: '700', fontSize: '0.875rem' }}>#{order.orderNumber}</span>
                                  <span style={{ fontWeight: '500' }}>{order.customerName}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{order.quantity}x {order.product}</span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateOrderStatus(order.id, order.status);
                                    }}
                                    className={`status-badge status-${order.status} hover-bright`} 
                                    title="Click para cambiar estado"
                                    style={{ 
                                      fontSize: '0.7rem', 
                                      cursor: 'pointer',
                                      border: 'none',
                                      padding: '0.3rem 0.6rem',
                                      transition: 'all 0.2s ease',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.25rem'
                                    }}
                                  >
                                    {order.status === 'PENDING' ? (
                                      <> <Clock size={10} /> Pendiente </>
                                    ) : (
                                      <> <Check size={10} /> Entregado </>
                                    )}
                                  </button>
                                  <button 
                                    className="hover-bright"
                                    onClick={() => handleRemoveOrder(delivery.id, order.id)}
                                    title="Quitar del reparto"
                                    style={{ 
                                      background: 'rgba(255,255,255,0.05)', 
                                      border: 'none', 
                                      borderRadius: '4px', 
                                      padding: '0.25rem',
                                      color: 'var(--muted)',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                {order.deliveryAddress ? (
                                  <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
                                      <MapPin size={12} color="var(--primary)" />
                                      {order.deliveryAddress}
                                    </div>
                                    <a 
                                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.deliveryAddress)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ 
                                        color: 'var(--primary)', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        padding: '0.2rem',
                                        borderRadius: '4px',
                                        background: 'rgba(16, 185, 129, 0.1)',
                                      }}
                                      title="Ver en Google Maps"
                                    >
                                      <ExternalLink size={12} />
                                    </a>
                                  </>
                                ) : (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                                    Sin dirección
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.875rem', color: 'var(--muted)', textAlign: 'center', padding: '1rem' }}>
                          No hay pedidos asignados a este reparto. Ve a la pestaña de Pedidos para asignarlos.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog 
        isOpen={!!confirmDeleteId}
        title="¿Eliminar reparto?"
        message="Se eliminará el grupo de reparto. Los pedidos asociados NO se borrarán, pero dejarán de estar agrupados."
        onConfirm={() => {
          if (confirmDeleteId) {
            handleDelete(confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
        onCancel={() => setConfirmDeleteId(null)}
        confirmText="Eliminar"
        isDanger={true}
      />

      <style jsx>{`
        .delivery-card {
          transition: all 0.2s;
        }
        .delivery-card:hover {
          border-color: var(--primary);
        }
        .delivery-card.expanded {
          border-color: var(--primary);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .status-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .status-icon.pending {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }
        .status-icon.completed {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .order-item-mini {
          padding: 0.75rem;
          background: rgba(255,255,255,0.03);
          border-radius: 0.5rem;
          border: 1px solid var(--card-border);
        }
        .reorder-btn {
          background: rgba(255,255,255,0.05);
          border: none;
          border-radius: 4px;
          padding: 1px;
          color: var(--muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .reorder-btn:hover:not(:disabled) {
          background: var(--primary);
          color: white;
        }
        .reorder-btn:disabled {
          opacity: 0.2;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
