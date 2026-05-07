'use client';

import { useState, useEffect } from 'react';
import { Database, Download, RotateCcw, Plus, Trash2, Loader2, FileJson } from 'lucide-react';

export default function BackupManager() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/backups');
      const data = await res.json();
      if (Array.isArray(data)) {
        setBackups(data);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/backups', { method: 'POST' });
      if (res.ok) {
        fetchBackups();
      }
    } catch (error) {
      console.error('Error creating backup:', error);
    } finally {
      setCreating(false);
    }
  };

  const restoreBackup = async (filename: string) => {
    if (!confirm(`¿Estás seguro de que deseas restaurar el backup "${filename}"? Esto reemplazará la base de datos actual.`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      
      if (res.ok) {
        alert('Base de datos restaurada correctamente. La página se recargará.');
        window.location.reload();
      } else {
        const error = await res.json();
        alert(`Error al restaurar: ${error.error}`);
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert('Error al intentar restaurar el backup.');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = (filename: string) => {
    window.open(`/api/backups/download?filename=${filename}`, '_blank');
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Database size={24} color="var(--accent)" />
          <h3 style={{ fontWeight: '700' }}>Copias de Seguridad (Backups)</h3>
        </div>
        <button 
          onClick={createBackup} 
          disabled={creating}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          Crear Backup
        </button>
      </div>

      <div className="table-container">
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Nombre del Archivo</th>
              <th className="desktop-only">Tamaño</th>
              <th className="desktop-only">Fecha</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && backups.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto' }} />
                </td>
              </tr>
            ) : backups.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
                  No hay backups guardados.
                </td>
              </tr>
            ) : (
              backups.map((backup) => (
                <tr key={backup.filename}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileJson size={16} color="var(--muted)" />
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{backup.filename}</span>
                    </div>
                  </td>
                  <td className="desktop-only" style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                    {(backup.size / 1024).toFixed(2)} KB
                  </td>
                  <td className="desktop-only" style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                    {new Date(backup.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button 
                        className="secondary" 
                        onClick={() => downloadBackup(backup.filename)}
                        title="Descargar"
                        style={{ padding: '0.4rem', borderRadius: '0.4rem' }}
                      >
                        <Download size={16} />
                      </button>
                      <button 
                        onClick={() => restoreBackup(backup.filename)}
                        title="Restaurar"
                        style={{ padding: '0.4rem', borderRadius: '0.4rem', background: 'var(--pending)' }}
                      >
                        <RotateCcw size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '1rem' }}>
        Nota: Restaurar un backup reemplazará todos los datos actuales. Se recomienda crear un backup antes de restaurar.
      </p>
    </div>
  );
}
