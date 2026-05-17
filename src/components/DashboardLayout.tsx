'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import KPIs from '@/components/KPIs';
import { ChefHat, RefreshCcw, Menu, X, Package, Users, LayoutDashboard, ChevronDown, Plus, Truck, ShoppingBag, LogOut, MessageSquare } from 'lucide-react';
import NewOrderModal from '@/components/NewOrderModal';
import { useDashboard } from '@/context/DashboardContext';
import { useAuth } from '@/context/AuthContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { orders, fetchOrders, isModalOpen, setIsModalOpen, orderToEdit, setOrderToEdit } = useDashboard();
  const { user, role, logout } = useAuth();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isKpisCollapsed, setIsKpisCollapsed] = useState(true);

  const getActiveTab = () => {
    if (pathname === '/') return 'dashboard';
    if (pathname.includes('/clientes')) return 'customers';
    if (pathname.includes('/productos')) return 'products';
    if (pathname.includes('/repartos')) return 'deliveries';
    if (pathname.includes('/conversaciones')) return 'conversations';
    return 'orders';
  };

  const activeTab = getActiveTab();

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMenuOpen]);

  return (
    <div className="dashboard-container" style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <nav className="dashboard-nav card" style={{ 
        padding: '1rem 2rem', 
        marginBottom: '2rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderRadius: 0,
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        background: 'rgba(10, 10, 10, 0.8)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="logo-container" style={{ 
            padding: '0.25rem', 
            display: 'flex',
            alignItems: 'center'
          }}>
            <img 
              src="/logo-white.png" 
              alt="Juani Cocina" 
              style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
            />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>Juani Cocina</h1>
            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600', textTransform: 'uppercase' }}>
              Dashboard
            </div>
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
          <Link href="/">
            <button className={activeTab === 'dashboard' ? 'primary' : 'secondary'} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LayoutDashboard size={16} /> Resumen
            </button>
          </Link>
          <Link href="/pedidos">
            <button className={activeTab === 'orders' ? 'primary' : 'secondary'}>
              Pedidos
            </button>
          </Link>
          <Link href="/productos">
            <button className={activeTab === 'products' ? 'primary' : 'secondary'}>
              Productos
            </button>
          </Link>
          <Link href="/clientes">
            <button className={activeTab === 'customers' ? 'primary' : 'secondary'}>
              Clientes
            </button>
          </Link>
          <Link href="/conversaciones">
            <button className={activeTab === 'conversations' ? 'primary' : 'secondary'} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={16} /> Conversaciones
            </button>
          </Link>
          <Link href="/repartos">
            <button className={activeTab === 'deliveries' ? 'primary' : 'secondary'} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Truck size={16} /> Repartos
            </button>
          </Link>
          <button className="secondary" onClick={fetchOrders} title="Actualizar Datos">
            <RefreshCcw size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '0.5rem', borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--foreground)' }}>
                {user?.email?.split('@')[0]}
              </span>
              <span style={{ 
                fontSize: '0.625rem', 
                fontWeight: '700', 
                color: role === 'SUPERADMIN' ? '#10b981' : '#f59e0b',
                background: role === 'SUPERADMIN' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: role === 'SUPERADMIN' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
                padding: '0.1rem 0.35rem',
                borderRadius: '0.25rem',
                textTransform: 'uppercase',
                marginTop: '0.1rem'
              }}>
                {role}
              </span>
            </div>
            <button 
              className="secondary danger" 
              onClick={logout}
              title="Cerrar Sesión"
              style={{ padding: '0.5rem', borderRadius: '0.5rem' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mobile-menu"
            style={{
              position: 'fixed',
              top: '72px',
              left: 0,
              right: 0,
              bottom: 0,
              background: 'var(--background)',
              zIndex: 99,
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard, path: '/' },
                { id: 'orders', label: 'Pedidos', icon: ShoppingBag, path: '/pedidos' },
                { id: 'products', label: 'Productos', icon: Package, path: '/productos' },
                { id: 'deliveries', label: 'Repartos', icon: Truck, path: '/repartos' },
                { id: 'customers', label: 'Clientes', icon: Users, path: '/clientes' },
                { id: 'conversations', label: 'Conversaciones', icon: MessageSquare, path: '/conversaciones' }
              ].map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link href={item.path} onClick={() => setIsMenuOpen(false)} style={{ textDecoration: 'none' }}>
                    <button
                      className={activeTab === item.id ? 'primary' : 'secondary'}
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
                    </button>
                  </Link>
                </motion.div>
              ))}
            </nav>

            <div style={{ marginTop: 'auto', paddingTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.02)', 
                border: '1px solid rgba(255, 255, 255, 0.05)', 
                borderRadius: '0.75rem', 
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--foreground)' }}>
                    {user?.email}
                  </span>
                  <span style={{ 
                    fontSize: '0.625rem', 
                    fontWeight: '700', 
                    color: role === 'SUPERADMIN' ? '#10b981' : '#f59e0b',
                    background: role === 'SUPERADMIN' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    border: role === 'SUPERADMIN' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
                    padding: '0.1rem 0.35rem',
                    borderRadius: '0.25rem',
                    textTransform: 'uppercase',
                    marginTop: '0.25rem',
                    alignSelf: 'flex-start'
                  }}>
                    {role}
                  </span>
                </div>
                <button 
                  onClick={logout}
                  className="secondary danger"
                  style={{ padding: '0.5rem', borderRadius: '0.5rem' }}
                >
                  <LogOut size={18} />
                </button>
              </div>

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
                  padding: '1rem',
                  borderRadius: '0.75rem'
                }}
              >
                <RefreshCcw size={18} /> Actualizar Datos
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="dashboard-content" style={{ padding: '0 2rem 4rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }} className="mobile-only">
          <button 
            onClick={() => setIsKpisCollapsed(!isKpisCollapsed)}
            className="card"
            style={{ 
              width: '100%', 
              padding: '1rem', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              background: 'var(--card-bg)',
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
          {pathname !== '/' && <KPIs orders={orders} />}
        </div>

        <div className="mobile-only">
          {pathname !== '/' && (
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
          )}
        </div>

        <main className="main-content">
          {children}
        </main>
      </div>

      {/* Floating Plus Button for New Order */}
      <button 
        className="primary floating-btn"
        onClick={() => setIsModalOpen(true)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
          zIndex: 90
        }}
      >
        <Plus size={28} />
      </button>

      <NewOrderModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setOrderToEdit(null);
        }} 
        onSuccess={fetchOrders} 
        orderToEdit={orderToEdit}
      />

      <style jsx>{`
        .mobile-only {
          display: none;
        }
        @media (max-width: 768px) {
          .desktop-only {
            display: none;
          }
          .mobile-only {
            display: block;
          }
          .dashboard-content {
            padding: 0 1rem 4rem 1rem !important;
          }
          .dashboard-nav {
            padding: 1rem !important;
          }
        }
        .floating-btn:hover {
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}
