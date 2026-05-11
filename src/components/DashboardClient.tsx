'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import KPIs from '@/components/KPIs';
import OrderTable from '@/components/OrderTable';
import { ChefHat, RefreshCcw, Menu, X, Package, History, LayoutDashboard, ChevronDown, ChevronUp } from 'lucide-react';
import BackupManager from '@/components/BackupManager';
import ProductManager from '@/components/ProductManager';
import DeliveryManager from '@/components/DeliveryManager';
import NewOrderModal from '@/components/NewOrderModal';
import { Plus, Truck } from 'lucide-react';

export default function DashboardClient() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [quantityFilter, setQuantityFilter] = useState('ALL');

  const [activeTab, setActiveTab] = useState<'orders' | 'backups' | 'products' | 'deliveries'>('orders');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isKpisCollapsed, setIsKpisCollapsed] = useState(true); // Default collapsed on mobile

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrder = async (id: string, data: any) => {
    try {
      await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      await fetch(`/api/orders/${id}`, {
        method: 'DELETE',
      });
      fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const handleEditOrder = (order: any) => {
    setOrderToEdit(order);
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchOrders();
    // Poll every 10 seconds to keep the dashboard updated
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMenuOpen]);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.whatsapp.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    
    const matchesQuantity = quantityFilter === 'ALL' || order.quantity === parseInt(quantityFilter);
    
    return matchesSearch && matchesStatus && matchesQuantity;
  });

  return (
    <div className="container">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'transparent', padding: '0', borderRadius: '0.75rem' }}>
            <img src="/logo.png" alt="Juani Cocina Logo" style={{ height: '50px', width: 'auto' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', fontWeight: '500' }}>Gestión de Pedidos</p>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="mobile-only secondary" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{ padding: '0.5rem', borderRadius: '0.5rem' }}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Desktop Navigation */}
        <div className="desktop-only" style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={activeTab === 'orders' ? 'primary' : 'secondary'} 
            onClick={() => setActiveTab('orders')}
          >
            Pedidos
          </button>
          <button 
            className={activeTab === 'products' ? 'primary' : 'secondary'} 
            onClick={() => setActiveTab('products')}
          >
            Productos
          </button>
          <button 
            className={activeTab === 'backups' ? 'primary' : 'secondary'} 
            onClick={() => setActiveTab('backups')}
          >
            Backups
          </button>
          <button 
            className={activeTab === 'deliveries' ? 'primary' : 'secondary'} 
            onClick={() => setActiveTab('deliveries')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Truck size={16} /> Repartos
          </button>
          <button className="secondary" onClick={fetchOrders} title="Actualizar Datos">
            <RefreshCcw size={16} />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(4px)',
                zIndex: 1000,
              }}
            />
            
            {/* Sidebar */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: '280px',
                background: 'var(--card-bg)',
                borderLeft: '1px solid var(--card-border)',
                zIndex: 1001,
                display: 'flex',
                flexDirection: 'column',
                padding: '1.5rem',
                boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>Menú</span>
                <button 
                  onClick={() => setIsMenuOpen(false)} 
                  className="secondary"
                  style={{ background: 'transparent', padding: '0.5rem', borderRadius: '50%' }}
                >
                  <X size={24} />
                </button>
              </div>

              <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { id: 'orders', label: 'Pedidos', icon: LayoutDashboard },
                  { id: 'products', label: 'Productos', icon: Package },
                  { id: 'deliveries', label: 'Repartos', icon: Truck },
                  { id: 'backups', label: 'Backups', icon: History }
                ].map((item, index) => (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={activeTab === item.id ? 'primary' : 'secondary'}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsMenuOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '1rem',
                      fontSize: '1rem',
                      width: '100%',
                      textAlign: 'left',
                      justifyContent: 'flex-start',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '0.75rem'
                    }}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </motion.button>
                ))}
              </nav>

              <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                <button 
                  className="secondary" 
                  onClick={() => {
                    fetchOrders();
                    setIsMenuOpen(false);
                  }}
                  style={{ 
                    width: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.5rem', 
                    padding: '0.875rem',
                    fontSize: '0.9rem',
                    borderRadius: '0.75rem'
                  }}
                >
                  <RefreshCcw size={18} /> Actualizar Datos
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile KPI Toggle */}
      <div className="mobile-only" style={{ marginBottom: '1.5rem' }}>
        <button 
          className="secondary" 
          onClick={() => setIsKpisCollapsed(!isKpisCollapsed)}
          style={{ 
            width: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '1rem',
            fontSize: '0.9rem',
            background: 'var(--card)',
            border: '1px solid var(--card-border)',
            borderRadius: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <LayoutDashboard size={20} className="text-primary" />
            <span style={{ fontWeight: '600' }}>Estadísticas del Negocio</span>
          </div>
          <motion.div
            animate={{ rotate: isKpisCollapsed ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown size={20} />
          </motion.div>
        </button>
      </div>

      <div className="desktop-only">
        <KPIs orders={orders} />
      </div>

      <div className="mobile-only">
        <AnimatePresence>
          {!isKpisCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, marginBottom: '2rem' }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              transition={{ duration: 0.3, ease: 'circOut' }}
              style={{ overflow: 'hidden' }}
            >
              <KPIs orders={orders} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="main-content">
        {activeTab === 'orders' && (
          <>
            <div className="filter-bar card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <input 
                  type="text" 
                  placeholder="Buscar por nombre o WhatsApp..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div style={{ minWidth: '150px' }}>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="ALL">Todos los estados</option>
                  <option value="PENDING">Pendientes</option>
                  <option value="DELIVERED">Entregados</option>
                  <option value="CANCELLED">Cancelados</option>
                </select>
              </div>

              <div style={{ minWidth: '130px' }}>
                <select value={quantityFilter} onChange={(e) => setQuantityFilter(e.target.value)}>
                  <option value="ALL">Todas las cants.</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <option key={n} value={n.toString()}>{n} {n === 1 ? 'paquete' : 'paquetes'}</option>
                  ))}
                </select>
              </div>
              
              <button 
                className="primary" 
                onClick={() => setIsModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={18} /> Nuevo Pedido
              </button>

              <div className="desktop-only" style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                Mostrando {filteredOrders.length} pedidos
              </div>
            </div>
            
            <OrderTable 
              orders={filteredOrders} 
              onUpdate={handleUpdateOrder} 
              onDelete={handleDeleteOrder}
              onEdit={handleEditOrder}
              onRefresh={fetchOrders}
            />
            
            <div className="mobile-only" style={{ color: 'var(--muted)', fontSize: '0.875rem', textAlign: 'center', marginTop: '1rem' }}>
              Mostrando {filteredOrders.length} pedidos
            </div>
          </>
        )}
        
        {activeTab === 'backups' && <BackupManager />}
        
        {activeTab === 'products' && <ProductManager />}
        
        {activeTab === 'deliveries' && <DeliveryManager />}
      </div>

      <NewOrderModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setOrderToEdit(null);
        }} 
        onSuccess={fetchOrders} 
        orderToEdit={orderToEdit}
      />
    </div>
  );
}
