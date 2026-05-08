'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDanger = false
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
      padding: '1rem'
    }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="card" 
        style={{ 
          maxWidth: '400px', 
          width: '100%', 
          border: '1px solid var(--card-border)',
          textAlign: 'center',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{ 
          width: '56px', 
          height: '56px', 
          borderRadius: '50%', 
          background: isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          color: isDanger ? 'var(--cancelled)' : 'var(--primary)'
        }}>
          <AlertTriangle size={28} />
        </div>

        <h3 style={{ marginBottom: '0.75rem', fontSize: '1.25rem' }}>{title}</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.9375rem', marginBottom: '2rem', lineHeight: '1.5' }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            type="button"
            onClick={onCancel}
            className="secondary" 
            style={{ flex: 1, padding: '0.875rem' }}
          >
            {cancelText}
          </button>
          <button 
            type="button"
            onClick={onConfirm}
            style={{ 
              flex: 1, 
              padding: '0.875rem',
              background: isDanger ? 'var(--cancelled)' : 'var(--primary)',
              color: 'white',
              fontWeight: '700'
            }}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
