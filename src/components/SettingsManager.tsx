'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { StoreSettings } from '@/types';

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (val: boolean) => void; label?: string }) {
  return (
    <div 
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', userSelect: 'none' }} 
      onClick={() => onChange(!checked)}
    >
      <div
        role="switch"
        aria-checked={checked}
        style={{
          width: '46px',
          height: '26px',
          backgroundColor: checked ? '#10b981' : '#3f3f46',
          borderRadius: '9999px',
          position: 'relative',
          transition: 'background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          padding: '3px',
          boxShadow: checked ? '0 0 12px rgba(16, 185, 129, 0.3)' : 'none'
        }}
      >
        <span
          style={{
            display: 'block',
            width: '20px',
            height: '20px',
            backgroundColor: '#ffffff',
            borderRadius: '9999px',
            transform: checked ? 'translateX(20px)' : 'translateX(0px)',
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
          }}
        />
      </div>
      {label && (
        <span style={{ fontSize: '0.9rem', fontWeight: '600', color: checked ? '#10b981' : 'var(--text-secondary)' }}>
          {label}
        </span>
      )}
    </div>
  );
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
          isDeliveryActive: settings.isDeliveryActive ?? false,
          pickupDaysInfo: settings.pickupDaysInfo,
          pickupAddress: settings.pickupAddress,
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
        {/* Modalidad de Envíos */}
        <div style={{ border: '1px solid var(--card-border)', padding: '1.5rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ paddingRight: '1.5rem' }}>
              <h3 style={{ fontWeight: '600', fontSize: '1.1rem' }}>🚚 Envíos a Domicilio</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {settings.isDeliveryActive 
                  ? 'Habilitado: El bot pide dirección de entrega al cliente y coordina el reparto.'
                  : 'Desactivado (Solo Retiro): El bot NO pide dirección ni menciona envíos; aclara que los pedidos son para retirar.'}
              </p>
            </div>
            <Switch 
              checked={settings.isDeliveryActive ?? false}
              onChange={(val) => setSettings({ ...settings, isDeliveryActive: val })}
              label={settings.isDeliveryActive ? 'Habilitados' : 'Desactivados'}
            />
          </div>
        </div>

        {/* Modalidad Solo Retiro (Visible cuando los envíos están desactivados) */}
        {!settings.isDeliveryActive && (
          <div style={{ border: '1px solid #10b981', padding: '1.5rem', borderRadius: '0.75rem', background: 'rgba(16, 185, 129, 0.04)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h3 style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.25rem', color: '#10b981' }}>📍 Dirección / Punto de Retiro</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Dirección física y link opcional de Google Maps para que el cliente sepa exactamente dónde retirar.
              </p>
              <input 
                type="text"
                className="input-field"
                value={settings.pickupAddress || ''}
                onChange={(e: any) => setSettings({ ...settings, pickupAddress: e.target.value })}
                placeholder="Ej: San Martín 185 (https://maps.google.com/?q=San+Martin+185,+General+Villegas)"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <h3 style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '0.25rem', color: 'var(--foreground)' }}>🕒 Días y Horarios de Retiro</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Fechas y franjas horarias disponibles para pasar a buscar los pedidos.
              </p>
              <textarea 
                className="input-field"
                value={settings.pickupDaysInfo || ''}
                onChange={(e: any) => setSettings({ ...settings, pickupDaysInfo: e.target.value })}
                placeholder="Ej: Viernes 11 de 10:30 a 12hs y sábado de 18 a 20hs..."
                rows={2}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
          </div>
        )}

        {/* Modo Vacaciones */}
        <div style={{ border: '1px solid var(--card-border)', padding: '1.5rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ paddingRight: '1.5rem' }}>
              <h3 style={{ fontWeight: '600', fontSize: '1.1rem' }}>Modo Vacaciones / Viaje</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Si está activo, el agente saludará usando este mensaje especial.</p>
            </div>
            <Switch 
              checked={settings.isVacationMode}
              onChange={(val) => setSettings({ ...settings, isVacationMode: val })}
              label={settings.isVacationMode ? 'Activo' : 'Inactivo'}
            />
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

        {/* Información de Reparto (Solo visible cuando los envíos están habilitados) */}
        {settings.isDeliveryActive && (
          <div style={{ border: '1px solid var(--card-border)', padding: '1.5rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
            <h3 style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.25rem' }}>🚚 Información de Reparto / Horarios</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Este texto le servirá al agente para saber responder cuando pregunten cuándo se entrega o a qué hora reparten a domicilio.
            </p>
            <textarea 
              className="input-field"
              value={settings.deliveryDaysInfo || ''}
              onChange={(e: any) => setSettings({ ...settings, deliveryDaysInfo: e.target.value })}
              placeholder="Ej: Repartimos los Viernes y Sábados por la tarde..."
              rows={4}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        )}

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
