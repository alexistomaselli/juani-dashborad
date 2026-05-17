'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Edit2, Check, X, Loader2, DollarSign, Tag, Calculator, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface Ingredient {
  id: string;
  name: string;
  price: string;
  yield: string;
}

export default function ProductManager() {
  const { role } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', unitsPerPackage: '', price: '', cost: '' });
  const [isAdding, setIsAdding] = useState(false);
  
  // Calculator state
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcIngredients, setCalcIngredients] = useState<Ingredient[]>([]);
  const [calcUnitsPerPack, setCalcUnitsPerPack] = useState('6');

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('Product')
        .select('*')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      if (Array.isArray(data)) setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      unitsPerPackage: product.unitsPerPackage.toString(),
      price: product.price.toString(),
      cost: product.cost.toString()
    });
    setCalcUnitsPerPack(product.unitsPerPackage.toString());
  };

  const handleSave = async (id: string) => {
    try {
      const { error } = await supabase
        .from('Product')
        .update({
          name: editForm.name,
          unitsPerPackage: parseInt(editForm.unitsPerPackage),
          price: parseFloat(editForm.price),
          cost: parseFloat(editForm.cost),
          updatedAt: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      setEditingId(null);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleAdd = async () => {
    try {
      const { error } = await supabase
        .from('Product')
        .insert({
          name: editForm.name,
          unitsPerPackage: parseInt(editForm.unitsPerPackage),
          price: parseFloat(editForm.price),
          cost: parseFloat(editForm.cost)
        });

      if (error) throw error;

      setIsAdding(false);
      setEditForm({ name: '', unitsPerPackage: '1', price: '', cost: '' });
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de desactivar este producto?')) return;
    try {
      const { error } = await supabase
        .from('Product')
        .update({ active: false })
        .eq('id', id);
      if (error) throw error;
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  // Calculator Logic
  const addIngredient = () => {
    setCalcIngredients([...calcIngredients, { id: Date.now().toString(), name: '', price: '', yield: '' }]);
  };

  const removeIngredient = (id: string) => {
    setCalcIngredients(calcIngredients.filter(i => i.id !== id));
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: string) => {
    setCalcIngredients(calcIngredients.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const calculateTotalCost = () => {
    const total = calcIngredients.reduce((sum, ing) => {
      const price = parseFloat(ing.price) || 0;
      const yield_ = parseFloat(ing.yield) || 1;
      const unitsPerPack = parseFloat(calcUnitsPerPack) || 1;
      return sum + (price / yield_) * unitsPerPack;
    }, 0);
    return total;
  };

  const applyCalcCost = () => {
    setEditForm({ ...editForm, cost: calculateTotalCost().toFixed(2), unitsPerPackage: calcUnitsPerPack });
    setShowCalculator(false);
  };

  if (loading) return <div className="card" style={{ textAlign: 'center', padding: '3rem' }}><Loader2 className="animate-spin" /></div>;

  return (
    <div className="card" style={{ marginTop: '2rem', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Package size={24} color="var(--accent)" />
          <h3 style={{ fontWeight: '700' }}>Catálogo de Productos</h3>
        </div>
        {!isAdding && (
          <button onClick={() => { setIsAdding(true); setEditForm({ name: '', unitsPerPackage: '6', price: '', cost: '' }); setCalcUnitsPerPack('6'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Nuevo Producto
          </button>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="table-container desktop-only">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Estructura</th>
              <th>Precio Venta</th>
              <th>Costo Prod.</th>
              <th>Ganancia</th>
              <th>Margen</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(isAdding || editingId) && showCalculator && (
              <div className="modal-overlay" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem'
              }}>
                <div className="card" style={{ maxWidth: '500px', width: '100%', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calculator size={20} color="var(--accent)" />
                      <h4 style={{ margin: 0 }}>Calculadora de Costos</h4>
                    </div>
                    <button onClick={() => setShowCalculator(false)} className="secondary" style={{ padding: '0.25rem' }}><X size={18} /></button>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--muted)', display: 'block', marginBottom: '0.5rem' }}>Unidades por Pack</label>
                    <input 
                      type="number" 
                      value={calcUnitsPerPack} 
                      onChange={e => setCalcUnitsPerPack(e.target.value)} 
                      placeholder="Ej: 6"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Ingredientes</span>
                      <button onClick={addIngredient} className="secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                        <Plus size={14} /> Agregar
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {calcIngredients.map(ing => (
                        <div key={ing.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 40px', gap: '0.5rem', alignItems: 'center' }}>
                          <input type="text" value={ing.name} onChange={e => updateIngredient(ing.id, 'name', e.target.value)} placeholder="Ej: Harina" style={{ padding: '0.4rem', fontSize: '0.875rem' }} />
                          <input type="number" value={ing.price} onChange={e => updateIngredient(ing.id, 'price', e.target.value)} placeholder="$ Total" style={{ padding: '0.4rem', fontSize: '0.875rem' }} />
                          <input type="number" value={ing.yield} onChange={e => updateIngredient(ing.id, 'yield', e.target.value)} placeholder="Rinde" style={{ padding: '0.4rem', fontSize: '0.875rem' }} />
                          <button onClick={() => removeIngredient(ing.id)} className="secondary" style={{ padding: '0.3rem', color: 'var(--cancelled)' }}><Trash2 size={14} /></button>
                        </div>
                      ))}
                      {calcIngredients.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--muted)', border: '1px dashed var(--border)', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                          No hay ingredientes. Agrega uno para calcular el costo.
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ 
                    padding: '1rem', 
                    background: 'var(--background)', 
                    borderRadius: '0.5rem', 
                    border: '1px solid var(--border)',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: '600' }}>Costo Final x Pack:</span>
                        <div title="Lógica: (Precio / Rinde) * Unidades por pack" style={{ cursor: 'help', color: 'var(--muted)' }}><Info size={14} /></div>
                      </div>
                      <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent)' }}>${calculateTotalCost().toFixed(2)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={applyCalcCost} style={{ flex: 1 }}>Aplicar al Producto</button>
                    <button onClick={() => setShowCalculator(false)} className="secondary" style={{ flex: 1 }}>Cancelar</button>
                  </div>
                </div>
              </div>
            )}
            
            {isAdding && (
              <tr style={{ background: 'rgba(139, 92, 246, 0.05)' }}>
                <td><input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Ej: Pizzetas" /></td>
                <td><input type="number" value={editForm.unitsPerPackage} onChange={e => { setEditForm({...editForm, unitsPerPackage: e.target.value}); setCalcUnitsPerPack(e.target.value); }} placeholder="Unidades x pack" /></td>
                <td><input type="number" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} placeholder="Precio" /></td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="number" value={editForm.cost} onChange={e => setEditForm({...editForm, cost: e.target.value})} placeholder="Costo" />
                    <button onClick={() => setShowCalculator(true)} className="secondary" style={{ padding: '0.4rem' }} title="Calcular Costo"><Calculator size={16} /></button>
                  </div>
                </td>
                <td>-</td>
                <td>-</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button onClick={handleAdd} className="primary" style={{ padding: '0.4rem' }}><Check size={16} /></button>
                    <button onClick={() => setIsAdding(false)} className="secondary" style={{ padding: '0.4rem' }}><X size={16} /></button>
                  </div>
                </td>
              </tr>
            )}
            {products.map(product => (
              <tr key={product.id}>
                <td>
                  {editingId === product.id ? 
                    <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /> : 
                    <span style={{ fontWeight: '600' }}>{product.name}</span>
                  }
                </td>
                <td>
                  {editingId === product.id ? 
                    <input type="number" value={editForm.unitsPerPackage} onChange={e => { setEditForm({...editForm, unitsPerPackage: e.target.value}); setCalcUnitsPerPack(e.target.value); }} /> : 
                    <span style={{ color: 'var(--muted)' }}>{product.unitsPerPackage} un. / pack</span>
                  }
                </td>
                <td>
                  {editingId === product.id ? 
                    <input type="number" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} /> : 
                    <span style={{ color: 'var(--delivered)', fontWeight: '600' }}>${product.price}</span>
                  }
                </td>
                <td>
                  {editingId === product.id ? 
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input type="number" value={editForm.cost} onChange={e => setEditForm({...editForm, cost: e.target.value})} />
                      <button onClick={() => setShowCalculator(true)} className="secondary" style={{ padding: '0.4rem' }} title="Calcular Costo"><Calculator size={16} /></button>
                    </div> : 
                    <span style={{ color: 'var(--cancelled)' }}>${product.cost}</span>
                  }
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'var(--delivered)', fontWeight: '700' }}>
                      ${(product.price - product.cost).toFixed(0)}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                      ${((product.price - product.cost) / product.unitsPerPackage).toFixed(2)} / un
                    </span>
                  </div>
                </td>
                <td>
                  <span style={{ 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '0.4rem', 
                    fontSize: '0.75rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: 'var(--delivered)',
                    fontWeight: '700'
                  }}>
                    {(((product.price - product.cost) / product.price) * 100).toFixed(1)}%
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    {editingId === product.id ? (
                      <>
                        <button onClick={() => handleSave(product.id)} className="primary" style={{ padding: '0.4rem' }}><Check size={16} /></button>
                        <button onClick={() => setEditingId(null)} className="secondary" style={{ padding: '0.4rem' }}><X size={16} /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(product)} className="secondary" style={{ padding: '0.4rem' }}><Edit2 size={16} /></button>
                        {role === 'SUPERADMIN' && (
                          <button onClick={() => handleDelete(product.id)} className="secondary" style={{ padding: '0.4rem', color: 'var(--cancelled)' }}><Trash2 size={16} /></button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {products.map(product => (
          <div key={product.id} className="card" style={{ padding: '1rem', border: editingId === product.id ? '1px solid var(--accent)' : '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                {editingId === product.id ? 
                  <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} style={{ marginBottom: '0.5rem' }} /> : 
                  <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{product.name}</div>
                }
                <div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                  {editingId === product.id ? 
                    <input type="number" value={editForm.unitsPerPackage} onChange={e => setEditForm({...editForm, unitsPerPackage: e.target.value})} /> : 
                    `Estructura: ${product.unitsPerPackage} un. / pack`
                  }
                </div>
              </div>
              {!editingId && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleEdit(product)} className="secondary" style={{ padding: '0.4rem' }}><Edit2 size={16} /></button>
                  {role === 'SUPERADMIN' && (
                    <button onClick={() => handleDelete(product.id)} className="secondary" style={{ padding: '0.4rem', color: 'var(--cancelled)' }}><Trash2 size={16} /></button>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Precio Venta</label>
                {editingId === product.id ? 
                  <input type="number" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} /> : 
                  <div style={{ fontWeight: '600', color: 'var(--delivered)' }}>${product.price}</div>
                }
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Costo Prod.</label>
                {editingId === product.id ? 
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="number" value={editForm.cost} onChange={e => setEditForm({...editForm, cost: e.target.value})} />
                    <button onClick={() => setShowCalculator(true)} className="secondary" style={{ padding: '0.4rem' }}><Calculator size={16} /></button>
                  </div> : 
                  <div style={{ fontWeight: '600', color: 'var(--cancelled)' }}>${product.cost}</div>
                }
              </div>
            </div>

            {!editingId && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '0.75rem', 
                background: 'rgba(139, 92, 246, 0.05)', 
                borderRadius: '0.5rem' 
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Ganancia</div>
                  <div style={{ fontWeight: '700', color: 'var(--delivered)' }}>${(product.price - product.cost).toFixed(0)} <span style={{ fontSize: '0.8rem', fontWeight: '400', color: 'var(--muted)' }}>(${((product.price - product.cost) / product.unitsPerPackage).toFixed(2)}/un)</span></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Margen</div>
                  <div style={{ fontWeight: '700', color: 'var(--delivered)' }}>{(((product.price - product.cost) / product.price) * 100).toFixed(1)}%</div>
                </div>
              </div>
            )}

            {editingId === product.id && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button onClick={() => handleSave(product.id)} style={{ flex: 1 }}><Check size={18} /> Guardar</button>
                <button onClick={() => setEditingId(null)} className="secondary" style={{ flex: 1 }}><X size={18} /> Cancelar</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
        * Los costos y precios se guardan en cada pedido al momento de crearse para mantener reportes históricos precisos.
      </p>
    </div>
  );
}
