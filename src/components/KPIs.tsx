import { ShoppingBag, Clock, CheckCircle, TrendingUp, Wallet } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  unitsPerPackage: number;
}

interface Order {
  id: string;
  orderNumber: number | null;
  customerName: string;
  whatsapp: string;
  quantity: number;
  product: string;
  productId: string | null;
  productRef: Product | null;
  unitPrice: number | null;
  unitCost: number | null;
  status: string;
  isPaid: boolean;
  totalAmount: number | null;
  createdAt: string;
  updatedAt: string;
}

interface KPIProps {
  orders: Order[];
}

export default function KPIs({ orders }: KPIProps) {
  const activeOrders = orders.filter(o => o.status !== 'CANCELLED');
  const deliveredOrders = activeOrders.filter(o => o.status === 'DELIVERED');
  const pendingOrders = orders.filter(o => o.status === 'PENDING');
  
  const totalOrdersCount = activeOrders.length;
  const deliveredOrdersCount = deliveredOrders.length;
  const pendingOrdersCount = pendingOrders.length;

  // Cantidad de paquetes totales
  const totalPackages = activeOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
  
  // Cantidad de paquetes entregados
  const deliveredPackages = deliveredOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
    
  // Cantidad de unidades individuales (paquetes * unidades por paquete)
  const totalUnits = activeOrders.reduce((sum, o) => {
    const unitsPerPack = o.productRef?.unitsPerPackage || 1;
    return sum + ((o.quantity || 0) * unitsPerPack);
  }, 0);

  const pendingPackages = pendingOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);

  // Ventas Totales (Precio * Cantidad)
  const totalRevenue = activeOrders.reduce((sum, o) => {
    const price = o.productRef?.price ?? o.unitPrice ?? 0;
    return sum + (price * (o.quantity || 0));
  }, 0);

  // Margen de ganancia (Precio - Costo) * Cantidad
  const totalProfit = activeOrders.reduce((sum, o) => {
    const price = o.productRef?.price ?? o.unitPrice ?? 0;
    const cost = o.productRef?.cost ?? o.unitCost ?? 0;
    return sum + ((price - cost) * (o.quantity || 0));
  }, 0);

  // Cobranza (Total Pagado vs Total Pendiente)
  // Usamos totalAmount si existe, sino caemos en el cálculo de revenue
  const totalPaid = activeOrders.filter(o => o.isPaid).reduce((sum, o) => {
    return sum + (o.totalAmount || (o.unitPrice || 0) * o.quantity || 0);
  }, 0);

  // El pendiente es el total de ventas menos lo que ya se cobró
  const pendingToCollect = totalRevenue - totalPaid;

  return (
    <div className="kpi-grid">
      <div className="card kpi-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="kpi-label">Pedidos Pendientes</span>
          <Clock size={20} color="var(--pending)" />
        </div>
        <span className="kpi-value" style={{ color: 'var(--pending)' }}>{pendingOrdersCount}</span>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
          Total a entregar: <span style={{ color: 'var(--foreground)', fontWeight: '600' }}>{pendingPackages} packs</span>
        </div>
      </div>

      <div className="card kpi-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="kpi-label">Volumen Entregado</span>
          <CheckCircle size={20} color="var(--delivered)" />
        </div>
        <span className="kpi-value" style={{ color: 'var(--delivered)' }}>{deliveredPackages}</span>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
          De <span style={{ fontWeight: '600' }}>{deliveredOrdersCount}</span> pedidos completados
        </div>
      </div>

      <div className="card kpi-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="kpi-label">Ventas Totales</span>
          <TrendingUp size={20} color="var(--delivered)" />
        </div>
        <span className="kpi-value">
          ${Math.round(totalRevenue).toLocaleString()}
        </span>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
          Ganancia est.: <span style={{ color: 'var(--delivered)', fontWeight: '600' }}>${Math.round(totalProfit).toLocaleString()}</span>
        </div>
      </div>

      <div className="card kpi-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="kpi-label">Estado de Cobranza</span>
          <Wallet size={20} color="var(--accent)" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span className="kpi-value" style={{ color: 'var(--delivered)', fontSize: '1.5rem' }}>
            ${Math.round(totalPaid).toLocaleString()} <span style={{ fontSize: '0.875rem', fontWeight: 'normal' }}>Pagado</span>
          </span>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Pendiente de cobro:</span>
            <span style={{ color: 'var(--cancelled)', fontWeight: '600' }}>
              ${Math.round(pendingToCollect).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
