'use client';

import { useState, useEffect } from 'react';
import KPIs from '@/components/KPIs';
import OrderTable from '@/components/OrderTable';
import { ChefHat, RefreshCcw } from 'lucide-react';
import BackupManager from '@/components/BackupManager';
import ProductManager from '@/components/ProductManager';
import NewOrderModal from '@/components/NewOrderModal';
import { Plus } from 'lucide-react';

export default function DashboardClient() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [activeTab, setActiveTab] = useState<'orders' | 'backups' | 'products'>('orders');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<any>(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.whatsapp.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
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
          <button className="secondary" onClick={fetchOrders} title="Actualizar Datos">
            <RefreshCcw size={16} />
          </button>
        </div>
      </header>

      <KPIs orders={orders} />

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
            />
            
            <div className="mobile-only" style={{ color: 'var(--muted)', fontSize: '0.875rem', textAlign: 'center', marginTop: '1rem' }}>
              Mostrando {filteredOrders.length} pedidos
            </div>
          </>
        )}
        
        {activeTab === 'backups' && <BackupManager />}
        
        {activeTab === 'products' && <ProductManager />}
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
