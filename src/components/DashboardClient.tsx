'use client';

import { useState, useEffect } from 'react';
import KPIs from '@/components/KPIs';
import OrderTable from '@/components/OrderTable';
import { ChefHat, RefreshCcw } from 'lucide-react';

export default function DashboardClient() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

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
          <div style={{ background: 'var(--accent)', padding: '0.75rem', borderRadius: '0.75rem' }}>
            <ChefHat size={24} color="white" />
          </div>
          <div>
            <h1>Juani Cocina</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Gestión de Pedidos</p>
          </div>
        </div>
        <button className="secondary" onClick={fetchOrders} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCcw size={16} /> Actualizar
        </button>
      </header>

      <KPIs orders={orders} />

      <div className="main-content">
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
          <div className="desktop-only" style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            Mostrando {filteredOrders.length} pedidos
          </div>
        </div>
        
        <OrderTable orders={filteredOrders} onUpdate={handleUpdateOrder} />
        
        <div className="mobile-only" style={{ color: 'var(--muted)', fontSize: '0.875rem', textAlign: 'center', marginTop: '1rem' }}>
          Mostrando {filteredOrders.length} pedidos
        </div>
      </div>
    </div>
  );
}
