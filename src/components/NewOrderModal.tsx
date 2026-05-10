'use client';

import { useState, useEffect } from 'react';
import { X, Plus, User, Phone, Package, ShoppingCart, Loader2, Check, MapPin } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  unitsPerPackage: number;
}

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orderToEdit?: any; // Pedido a editar (opcional)
}

export default function NewOrderModal({ isOpen, onClose, onSuccess, orderToEdit }: NewOrderModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    customerName: '',
    whatsapp: '',
    productId: '',
    quantity: '1',
    isPaid: false,
    deliveryAddress: ''
  });

  useEffect(() => {
    if (orderToEdit) {
      setForm({
        customerName: orderToEdit.customerName || '',
        whatsapp: orderToEdit.whatsapp || '',
        productId: orderToEdit.productId || '',
        quantity: orderToEdit.quantity?.toString() || '1',
        isPaid: orderToEdit.isPaid || false,
        deliveryAddress: orderToEdit.deliveryAddress || ''
      });
    } else {
      setForm({
        customerName: '',
        whatsapp: '',
        productId: '',
        quantity: '1',
        isPaid: false,
        deliveryAddress: ''
      });
    }
  }, [orderToEdit, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data.filter(p => p.active));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.productId || !form.quantity) return;

    setSubmitting(true);
    try {
      const selectedProduct = products.find(p => p.id === form.productId);
      const url = orderToEdit ? `/api/orders/${orderToEdit.id}` : '/api/orders';
      const method = orderToEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          product: selectedProduct?.name || orderToEdit?.product || '',
          quantity: parseInt(form.quantity)
        }),
      });

      if (res.ok) {
        setForm({ customerName: '', whatsapp: '', productId: '', quantity: '1', isPaid: false, deliveryAddress: '' });
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error saving order:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedProduct = products.find(p => p.id === form.productId);
  const totalAmount = selectedProduct ? selectedProduct.price * parseInt(form.quantity || '0') : 0;
  const totalUnits = selectedProduct ? selectedProduct.unitsPerPackage * parseInt(form.quantity || '0') : 0;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '1rem'
    }}>
      <div className="card" style={{ 
        maxWidth: '500px', 
        width: '100%', 
        border: '1px solid var(--border)',
        animation: 'fadeIn 0.3s ease-out'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShoppingCart size={24} color="var(--accent)" />
            <h3 style={{ margin: 0 }}>
              {orderToEdit ? `Editar Pedido #${orderToEdit.orderNumber}` : 'Cargar Nuevo Pedido'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="secondary" style={{ padding: '0.25rem' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted)' }}>
              <User size={14} /> Nombre del Cliente
            </label>
            <input 
              required
              type="text" 
              placeholder="Ej: Juan Pérez"
              value={form.customerName}
              onChange={e => setForm({...form, customerName: e.target.value})}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted)' }}>
              <Phone size={14} /> WhatsApp (opcional)
            </label>
            <input 
              type="tel" 
              placeholder="Ej: 1122334455"
              value={form.whatsapp}
              onChange={e => setForm({...form, whatsapp: e.target.value})}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted)' }}>
              <MapPin size={14} /> Dirección de Entrega (opcional)
            </label>
            <input 
              type="text" 
              placeholder="Ej: Av. Siempreviva 742"
              value={form.deliveryAddress}
              onChange={e => setForm({...form, deliveryAddress: e.target.value})}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted)' }}>
                <Package size={14} /> Producto
              </label>
              <select 
                required
                value={form.productId}
                onChange={e => setForm({...form, productId: e.target.value})}
                style={{ width: '100%' }}
              >
                <option value="">Seleccionar...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted)' }}>
                Cant. (Pack)
              </label>
              <input 
                required
                type="number" 
                min="1"
                value={form.quantity}
                onChange={e => setForm({...form, quantity: e.target.value})}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div 
            onClick={() => setForm({...form, isPaid: !form.isPaid})}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              padding: '0.75rem', 
              borderRadius: '0.75rem', 
              background: form.isPaid ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${form.isPaid ? 'var(--delivered)' : 'var(--cancelled)'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ 
              width: '20px', 
              height: '20px', 
              borderRadius: '4px', 
              border: '2px solid currentColor',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: form.isPaid ? 'var(--delivered)' : 'var(--cancelled)'
            }}>
              {form.isPaid && <Check size={14} />}
            </div>
            <span style={{ fontWeight: '600', color: form.isPaid ? 'var(--delivered)' : 'var(--cancelled)' }}>
              {form.isPaid ? 'Pedido Pagado' : 'Pendiente de Pago'}
            </span>
          </div>

          {selectedProduct && (
            <div style={{ 
              background: 'rgba(139, 92, 246, 0.05)', 
              padding: '1rem', 
              borderRadius: '0.75rem',
              border: '1px dashed var(--accent)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Total Unidades</div>
                <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{totalUnits} unidades</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Total a Cobrar</div>
                <div style={{ fontWeight: '800', fontSize: '1.25rem', color: 'var(--delivered)' }}>${totalAmount.toLocaleString()}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              type="submit" 
              disabled={submitting || !form.customerName || !form.productId}
              style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : (orderToEdit ? <Check size={18} /> : <Plus size={18} />)}
              {orderToEdit ? 'Guardar Cambios' : 'Confirmar Pedido'}
            </button>
            <button type="button" onClick={onClose} className="secondary" style={{ flex: 1 }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
