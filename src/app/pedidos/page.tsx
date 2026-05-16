'use client';

import { useState } from 'react';
import OrderTable from '@/components/OrderTable';
import DashboardLayout from '@/components/DashboardLayout';
import { useDashboard } from '@/context/DashboardContext';
import { Plus, Search } from 'lucide-react';

export default function OrdersPage() {
  const { orders, loading, fetchOrders, handleUpdateOrder, handleDeleteOrder } = useDashboard();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [quantityFilter, setQuantityFilter] = useState('ALL');

  const filteredOrders = orders.filter(order => {
    const customerName = order.customer?.name || order.customerName || '';
    const whatsapp = order.customer?.whatsapp || order.whatsapp || '';

    const matchesSearch = 
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      whatsapp.includes(searchTerm) ||
      (order.orderNumber && order.orderNumber.toString().includes(searchTerm));
    
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    
    const matchesQuantity = quantityFilter === 'ALL' || order.quantity.toString() === quantityFilter;

    return matchesSearch && matchesStatus && matchesQuantity;
  });

  return (
    <DashboardLayout>
      <div className="filter-bar card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, WhatsApp o pedido #..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
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
        
        <div className="desktop-only" style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          Mostrando {filteredOrders.length} pedidos
        </div>
      </div>
      
      <OrderTable 
        orders={filteredOrders} 
        onUpdate={handleUpdateOrder} 
        onDelete={handleDeleteOrder}
        onRefresh={fetchOrders}
      />
      
      <div className="mobile-only" style={{ color: 'var(--muted)', fontSize: '0.875rem', textAlign: 'center', marginTop: '1rem' }}>
        Mostrando {filteredOrders.length} pedidos
      </div>
    </DashboardLayout>
  );
}
