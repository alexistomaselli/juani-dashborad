'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Search, MapPin, Trash2, RefreshCcw } from 'lucide-react';
import { Customer } from '@/types';
import EditableField from './ui/EditableField';
import WhatsAppField from './ui/WhatsAppField';

import { useDashboard } from '@/context/DashboardContext';
import { useAuth } from '@/context/AuthContext';

export default function CustomerManager() {
  const { customers, loading, fetchCustomers } = useDashboard();
  const { role } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleUpdateField = async (id: string, fieldData: any) => {
    try {
      const { error } = await supabase
        .from('Customer')
        .update({
          ...fieldData,
          updatedAt: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      fetchCustomers();
    } catch (error) {
      console.error('Error updating customer field:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este cliente? Se perderá el vínculo con sus pedidos anteriores.')) return;
    
    try {
      const { error } = await supabase
        .from('Customer')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Error al eliminar cliente');
    }
  };

  const filteredCustomers = customers
    .filter(c => 
      (c.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.whatsapp?.includes(searchTerm)) ||
      (c.address?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      const nameA = a.name?.toLowerCase() || '';
      const nameB = b.name?.toLowerCase() || '';
      if (sortOrder === 'asc') return nameA.localeCompare(nameB);
      return nameB.localeCompare(nameA);
    });

  return (
    <div className="customer-manager" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
            <Users size={24} className="text-primary" /> Gestión de Clientes
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {customers.length} clientes registrados en total
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', flex: '1', maxWidth: '500px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, tel o dirección..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '0.75rem',
                color: 'var(--foreground)',
                fontSize: '0.875rem'
              }}
            />
          </div>
          <div style={{ display: 'flex', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <button 
              onClick={() => setSortOrder('asc')}
              className={`sort-btn ${sortOrder === 'asc' ? 'active' : ''}`}
              title="A-Z"
            >
              A-Z
            </button>
            <button 
              onClick={() => setSortOrder('desc')}
              className={`sort-btn ${sortOrder === 'desc' ? 'active' : ''}`}
              title="Z-A"
            >
              Z-A
            </button>
          </div>
          <button 
            onClick={fetchCustomers}
            className="btn-icon"
            title="Recargar"
          >
            <RefreshCcw size={18} />
          </button>
        </div>
      </div>

      <div className="table-container card" style={{ overflowX: 'auto', padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
            Cargando clientes...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)', background: 'var(--card-bg)', borderRadius: '1rem' }}>
            No se encontraron clientes
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>WhatsApp</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }} className="desktop-only">Dirección</th>
                <th style={{ textAlign: 'right', padding: '1rem 1.5rem', color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(customer => (
                <tr 
                  key={customer.id} 
                  className="customer-row"
                  style={{ borderBottom: '1px solid var(--card-border)', transition: 'background 0.2s' }}
                >
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <EditableField 
                      value={customer.name || ''} 
                      onSave={(val: string) => handleUpdateField(customer.id, { name: val })}
                      placeholder="Sin nombre"
                      fontWeight="600"
                    />
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <WhatsAppField 
                      value={customer.whatsapp || ''} 
                      onSave={(val: string) => handleUpdateField(customer.id, { whatsapp: val })}
                    />
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }} className="desktop-only">
                    <EditableField 
                      value={customer.address || ''} 
                      onSave={(val: string) => handleUpdateField(customer.id, { address: val })}
                      icon={MapPin}
                      placeholder="Sin dirección"
                      fontSize="0.875rem"
                    />
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                      {role === 'SUPERADMIN' && (
                        <button onClick={() => handleDelete(customer.id)} style={{ color: 'rgba(239, 68, 68, 0.7)', background: 'none', border: 'none', cursor: 'pointer' }} className="hover-red">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
}
      </div>

      <style jsx>{`
        .customer-row:hover {
          background: rgba(255,255,255,0.03);
        }
        .btn-icon {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          color: var(--muted);
          width: 42px;
          height: 42px;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-icon:hover {
          background: var(--accent);
          color: var(--foreground);
          border-color: var(--accent);
        }
        .hover-primary:hover { color: var(--primary) !important; }
        .hover-red:hover { color: #ef4444 !important; }
        
        @media (max-width: 768px) {
          .desktop-only {
            display: none !important;
          }
        }
        .sort-btn {
          padding: 0.5rem 1rem;
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          font-weight: 600;
          font-size: 0.8rem;
          transition: all 0.2s;
        }
        .sort-btn.active {
          background: var(--primary);
          color: white;
        }
        .sort-btn:not(.active):hover {
          background: rgba(255,255,255,0.05);
          color: var(--foreground);
        }
      `}</style>
    </div>
  );
}
