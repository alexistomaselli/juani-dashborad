'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, User, Phone, Package, ShoppingCart, Loader2, Check, MapPin, Search, UserPlus, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useDashboard } from '@/context/DashboardContext';

interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  unitsPerPackage: number;
}

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orderToEdit?: any;
}

type CustomerMode = 'search' | 'new';

export default function NewOrderModal({ isOpen, onClose, onSuccess, orderToEdit }: NewOrderModalProps) {
  const { customers } = useDashboard();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Customer selection state
  const [customerMode, setCustomerMode] = useState<CustomerMode>('search');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    customerName: '',
    whatsapp: '',
    productId: '',
    quantity: '1',
    isPaid: false,
    deliveryAddress: ''
  });

  // Filter customers based on search
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.whatsapp && c.whatsapp.includes(customerSearch))
  ).slice(0, 6);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      setSelectedCustomerId(orderToEdit.customerId || null);
      setCustomerMode('new'); // editing: show fields directly
    } else {
      setForm({ customerName: '', whatsapp: '', productId: '', quantity: '1', isPaid: false, deliveryAddress: '' });
      setSelectedCustomerId(null);
      setCustomerSearch('');
      setCustomerMode('search');
    }
  }, [orderToEdit, isOpen]);

  useEffect(() => {
    if (isOpen) fetchProducts();
  }, [isOpen]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('Product').select('*').eq('active', true).order('name');
      if (error) throw error;
      if (Array.isArray(data)) setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (customer: typeof customers[0]) => {
    setSelectedCustomerId(customer.id);
    setCustomerSearch(customer.name);
    setForm(prev => ({
      ...prev,
      customerName: customer.name,
      whatsapp: customer.whatsapp || '',
      deliveryAddress: customer.address || ''
    }));
    setShowDropdown(false);
    setCustomerMode('new'); // show full fields so user can review/edit
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId(null);
    setCustomerSearch('');
    setForm(prev => ({ ...prev, customerName: '', whatsapp: '', deliveryAddress: '' }));
    setCustomerMode('search');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.productId || !form.quantity) return;

    setSubmitting(true);
    try {
      const selectedProduct = products.find(p => p.id === form.productId);
      let customerId = selectedCustomerId || orderToEdit?.customerId || null;

      if (!customerId) {
        // No customer selected: create or find by whatsapp
        if (form.whatsapp) {
          const { data: existing } = await supabase
            .from('Customer').select('id').eq('whatsapp', form.whatsapp).single();
          if (existing) {
            customerId = existing.id;
            await supabase.from('Customer').update({
              name: form.customerName,
              address: form.deliveryAddress,
              updatedAt: new Date().toISOString()
            }).eq('id', customerId);
          } else {
            const { data: newC } = await supabase.from('Customer')
              .insert({ name: form.customerName, whatsapp: form.whatsapp, address: form.deliveryAddress })
              .select('id').single();
            if (newC) customerId = newC.id;
          }
        } else {
          const { data: newC } = await supabase.from('Customer')
            .insert({ name: form.customerName, address: form.deliveryAddress })
            .select('id').single();
          if (newC) customerId = newC.id;
        }
      } else {
        // Update existing customer data if changed
        await supabase.from('Customer').update({
          name: form.customerName,
          whatsapp: form.whatsapp || null,
          address: form.deliveryAddress || null,
          updatedAt: new Date().toISOString()
        }).eq('id', customerId);
      }

      const quantity = parseInt(form.quantity);
      const unitPrice = selectedProduct?.price || orderToEdit?.unitPrice || 0;
      const unitCost = selectedProduct?.cost || orderToEdit?.unitCost || 0;

      const orderData = {
        customerName: form.customerName,
        whatsapp: form.whatsapp,
        productId: form.productId,
        product: selectedProduct?.name || orderToEdit?.product || '',
        quantity,
        unitPrice,
        unitCost,
        totalAmount: quantity * unitPrice,
        isPaid: form.isPaid,
        deliveryAddress: form.deliveryAddress,
        customerId,
        updatedAt: new Date().toISOString()
      };

      let result;
      if (orderToEdit) {
        result = await supabase.from('Order').update(orderData).eq('id', orderToEdit.id);
      } else {
        const { data: maxOrder } = await supabase
          .from('Order').select('orderNumber').order('orderNumber', { ascending: false }).limit(1);
        const nextNumber = (maxOrder?.[0]?.orderNumber || 0) + 1;
        result = await supabase.from('Order').insert({
          ...orderData,
          orderNumber: nextNumber,
          status: 'PENDING',
          deliverySequence: nextNumber
        });
      }

      if (result.error) throw result.error;

      setForm({ customerName: '', whatsapp: '', productId: '', quantity: '1', isPaid: false, deliveryAddress: '' });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Error al guardar el pedido. Revisa la consola.');
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
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: '1rem'
    }}>
      <div className="card" style={{
        maxWidth: '520px', width: '100%',
        border: '1px solid var(--border)',
        animation: 'fadeIn 0.3s ease-out',
        maxHeight: '90vh', overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShoppingCart size={24} color="var(--accent)" />
            <h3 style={{ margin: 0 }}>
              {orderToEdit ? `Editar Pedido #${orderToEdit.orderNumber}` : 'Cargar Nuevo Pedido'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="secondary" style={{ padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* ── CUSTOMER SECTION ── */}
          <div style={{
            background: 'rgba(139, 92, 246, 0.04)',
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <User size={13} /> Cliente
            </div>

            {/* Mode toggle */}
            {!orderToEdit && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setCustomerMode('search'); handleClearCustomer(); }}
                  style={{
                    flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.8rem',
                    background: customerMode === 'search' ? 'var(--accent)' : 'var(--secondary)',
                    color: customerMode === 'search' ? 'white' : 'var(--muted)',
                    border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                  }}
                >
                  <Search size={13} /> Buscar existente
                </button>
                <button
                  type="button"
                  onClick={() => { setCustomerMode('new'); setSelectedCustomerId(null); setCustomerSearch(''); }}
                  style={{
                    flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.8rem',
                    background: customerMode === 'new' && !selectedCustomerId ? 'var(--accent)' : 'var(--secondary)',
                    color: customerMode === 'new' && !selectedCustomerId ? 'white' : 'var(--muted)',
                    border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                  }}
                >
                  <UserPlus size={13} /> Nuevo cliente
                </button>
              </div>
            )}

            {/* Search dropdown */}
            {customerMode === 'search' && !selectedCustomerId && (
              <div ref={searchRef} style={{ position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input
                    type="text"
                    placeholder="Nombre o WhatsApp..."
                    value={customerSearch}
                    onChange={e => { setCustomerSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    style={{ width: '100%', paddingLeft: '2.25rem' }}
                  />
                  <ChevronDown size={15} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                </div>

                {showDropdown && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    background: 'var(--card-bg)', border: '1px solid var(--border)',
                    borderRadius: '0.75rem', zIndex: 100, overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                  }}>
                    {filteredCustomers.length === 0 ? (
                      <div style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.875rem', textAlign: 'center' }}>
                        No hay clientes que coincidan
                      </div>
                    ) : (
                      filteredCustomers.map(c => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectCustomer(c)}
                          style={{
                            padding: '0.75rem 1rem', cursor: 'pointer',
                            borderBottom: '1px solid var(--border)',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.08)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{c.name}</div>
                          {c.whatsapp && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
                              📱 {c.whatsapp}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Selected customer badge */}
            {selectedCustomerId && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.5rem 0.75rem',
                background: 'rgba(34,197,94,0.08)', border: '1px solid var(--delivered)',
                borderRadius: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={14} color="var(--delivered)" />
                  <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>{form.customerName}</span>
                  {form.whatsapp && <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>· {form.whatsapp}</span>}
                </div>
                {!orderToEdit && (
                  <button type="button" onClick={handleClearCustomer} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.1rem' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Fields: shown in 'new' mode OR when a customer is selected (to allow edits) */}
            {(customerMode === 'new' || selectedCustomerId) && (
              <>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.4rem', color: 'var(--muted)' }}>
                    <User size={13} /> Nombre
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={form.customerName}
                    onChange={e => setForm({ ...form, customerName: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.4rem', color: 'var(--muted)' }}>
                      <Phone size={13} /> WhatsApp
                    </label>
                    <input
                      type="tel"
                      placeholder="Ej: 1122334455"
                      value={form.whatsapp}
                      onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.4rem', color: 'var(--muted)' }}>
                      <MapPin size={13} /> Dirección
                    </label>
                    <input
                      type="text"
                      placeholder="Opcional"
                      value={form.deliveryAddress}
                      onChange={e => setForm({ ...form, deliveryAddress: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── PRODUCT SECTION ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted)' }}>
                <Package size={14} /> Producto
              </label>
              <select
                required
                value={form.productId}
                onChange={e => setForm({ ...form, productId: e.target.value })}
                style={{ width: '100%' }}
                disabled={loading}
              >
                <option value="">{loading ? 'Cargando...' : 'Seleccionar...'}</option>
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
                onChange={e => setForm({ ...form, quantity: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* ── PAYMENT TOGGLE ── */}
          <div
            onClick={() => setForm({ ...form, isPaid: !form.isPaid })}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem', borderRadius: '0.75rem',
              background: form.isPaid ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${form.isPaid ? 'var(--delivered)' : 'var(--cancelled)'}`,
              cursor: 'pointer', transition: 'all 0.2s ease'
            }}
          >
            <div style={{
              width: '20px', height: '20px', borderRadius: '4px',
              border: '2px solid currentColor',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: form.isPaid ? 'var(--delivered)' : 'var(--cancelled)'
            }}>
              {form.isPaid && <Check size={14} />}
            </div>
            <span style={{ fontWeight: '600', color: form.isPaid ? 'var(--delivered)' : 'var(--cancelled)' }}>
              {form.isPaid ? 'Pedido Pagado' : 'Pendiente de Pago'}
            </span>
          </div>

          {/* ── TOTALS ── */}
          {selectedProduct && (
            <div style={{
              background: 'rgba(139, 92, 246, 0.05)', padding: '1rem',
              borderRadius: '0.75rem', border: '1px dashed var(--accent)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
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

          {/* ── ACTIONS ── */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
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
