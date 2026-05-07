'use client';

import { useState, useEffect } from 'react';
import KPIs from '@/components/KPIs';
import OrderTable from '@/components/OrderTable';
import { LayoutDashboard, RefreshCcw } from 'lucide-react';

export default function DashboardClient() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchOrders();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Poll every 10 seconds to keep the dashboard updated
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--accent)', padding: '0.75rem', borderRadius: '0.75rem' }}>
            <LayoutDashboard size={24} color="white" />
          </div>
          <div>
            <h1>AI Order Agent</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Dashboard de Gestión en Tiempo Real</p>
          </div>
        </div>
        <button className="secondary" onClick={fetchOrders} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCcw size={16} /> Actualizar
        </button>
      </header>

      <KPIs orders={orders} />

      <div className="main-content">
        <OrderTable orders={orders} onStatusChange={handleStatusChange} />
      </div>
    </div>
  );
}
