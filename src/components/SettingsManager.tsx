'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface StoreSettings {
  id: string;
  isVacationMode: boolean;
  vacationMessage: string;
  deliveryDaysInfo: string;
}

export default function SettingsManager() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('StoreSettings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError('Error al cargar la configuración.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!settings) return;
    try {
      setSaving(true);
      setSuccess(false);
      setError(null);
      
      const { error } = await supabase
        .from('StoreSettings')
        .update({
          isVacationMode: settings.isVacationMode,
          vacationMessage: settings.vacationMessage,
          deliveryDaysInfo: settings.deliveryDaysInfo,
          updatedAt: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError('Error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: '1rem' }}>Cargando configuración...</div>;
  if (!settings) return <div style={{ padding: '1rem', color: 'red' }}>{error || 'No se encontró la configuración inicial.'}</div>;

  return (
    <div className="card" style={{ maxWidth: '800px' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Configuración del Agente</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Modo Vacaciones */}
        <div style={{ border: '1px solid var(--card-border)', padding: '1.5rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontWeight: '600', fontSize: '1.1rem' }}>Modo Vacaciones / Viaje</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Si está activo, el agente saludará usando este mensaje especial.</p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={settings.isVacationMode}
                onChange={(e: any) => setSettings({ ...settings, isVacationMode: e.target.checked })}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <span style={{ marginLeft: '0.5rem' }}>{settings.isVacationMode ? 'Activo' : 'Inactivo'}</span>
            </label>
          </div>
          
          <div style={{ opacity: settings.isVacationMode ? 1 : 0.5 }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Mensaje de Vacaciones</label>
            <textarea 
              className="input-field"
              value={settings.vacationMessage || ''}
              onChange={(e: any) => setSettings({ ...settings, vacationMessage: e.target.value })}
              placeholder="Ej: ¡Hola! Estamos de viaje. Por el momento no estamos tomando pedidos..."
              rows={3}
              disabled={!settings.isVacationMode}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Información de Reparto */}
        <div>
          <h3 style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.25rem' }}>Información de Reparto / Horarios</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Este texto le servirá al agente para saber responder cuando pregunten "¿Cuándo reparten?".</p>
          <textarea 
            className="input-field"
            value={settings.deliveryDaysInfo || ''}
            onChange={(e: any) => setSettings({ ...settings, deliveryDaysInfo: e.target.value })}
            placeholder="Ej: Repartimos los Viernes y Sábados por la tarde..."
            rows={4}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        {/* Guardar */}
        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem' }}>
          {error && <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</span>}
          {success && <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: '500' }}>¡Guardado con éxito!</span>}
          <button className="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
