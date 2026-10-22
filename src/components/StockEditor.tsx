'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function StockEditor({ productId, stock, onSaved }: {
  productId: string;
  stock: number | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [baseline, setBaseline] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    const value = Number(draft);
    if (draft.trim() === '' || !Number.isSafeInteger(value) || value < 0 || value > 2147483647) {
      setError('Ingresá una cantidad entera de packs, desde cero.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      let query = supabase.from('Product').update({ stock: value, updatedAt: new Date().toISOString() }).eq('id', productId);
      // Avoid overwriting a sale made while this input was open.
      query = baseline === null ? query.is('stock', null) : query.eq('stock', baseline);
      const { data, error: saveError } = await query.select('id').maybeSingle();
      if (saveError) throw saveError;
      if (!data) {
        setError('El stock cambió mientras editabas. Cancelá y volvé a editar con el valor actualizado.');
        onSaved();
        return;
      }
      setEditing(false);
      onSaved();
    } catch {
      setError('No se pudo guardar el stock. Intentá nuevamente.');
    } finally { setSaving(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '130px' }}>
      <span style={{ color: stock === 0 ? 'var(--cancelled)' : 'var(--muted)' }}>
        {stock === null ? 'Sin cargar' : stock === 0 ? 'Sin stock (0 packs)' : `${stock} packs disponibles`}
      </span>
      {editing ? <>
        <input aria-label="Stock disponible en packs" type="number" min="0" step="1" value={draft}
          disabled={saving} onChange={e => setDraft(e.target.value)} />
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button disabled={saving} onClick={save}>{saving ? 'Guardando…' : 'Guardar stock'}</button>
          <button className="secondary" disabled={saving} onClick={() => { setEditing(false); setError(''); }}>Cancelar</button>
        </div>
      </> : <button className="secondary" onClick={() => {
        setDraft(stock?.toString() ?? ''); setBaseline(stock); setError(''); setEditing(true);
      }}>Ajustar stock</button>}
      {error && <span role="alert" style={{ color: 'var(--cancelled)', fontSize: '0.8rem' }}>{error}</span>}
    </div>
  );
}
