'use client';

import { useState, useEffect } from 'react';
import { Phone, MessageSquare } from 'lucide-react';

interface WhatsAppFieldProps {
  value: string;
  onSave: (val: string) => void;
}

export default function WhatsAppField({ value, onSave }: WhatsAppFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');

  useEffect(() => {
    setTempValue(value || '');
  }, [value]);

  const handleSave = () => {
    if (tempValue !== value) {
      onSave(tempValue);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <input
          autoFocus
          type="text"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') {
              setTempValue(value || '');
              setIsEditing(false);
            }
          }}
          placeholder="Número..."
          style={{ 
            padding: '0.25rem 0.5rem', 
            fontSize: '0.875rem', 
            width: '140px',
            background: 'var(--background)',
            border: '1px solid var(--accent)',
            borderRadius: '4px',
            color: 'var(--foreground)',
            outline: 'none'
          }}
        />
      </div>
    );
  }

  const formattedValue = (value || '').replace(/\D/g, '');
  const displayValue = formattedValue.startsWith('54') ? formattedValue.substring(2) : formattedValue;
  const linkValue = formattedValue.startsWith('54') ? formattedValue : `54${formattedValue}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minHeight: '1.5rem' }}>
      {/* Number text - Click to edit */}
      <div 
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        style={{ 
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: value ? 'var(--foreground)' : 'var(--muted)',
          fontSize: '0.875rem',
          fontWeight: value ? '600' : '400',
          fontStyle: value ? 'normal' : 'italic'
        }}
      >
        <Phone size={14} className={value ? 'text-primary' : ''} style={{ opacity: value ? 1 : 0.5 }} />
        {value ? displayValue : 'Sin WhatsApp'}
      </div>

      {/* WhatsApp Button - Icon to link */}
      {value && (
        <a
          href={`https://wa.me/${linkValue}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ 
            color: 'var(--delivered)', 
            display: 'flex', 
            alignItems: 'center', 
            padding: '0.3rem',
            borderRadius: '6px',
            background: 'rgba(34, 197, 94, 0.1)',
            transition: 'all 0.2s',
            border: '1px solid rgba(34, 197, 94, 0.2)'
          }}
          title="Abrir WhatsApp"
          className="hover-bright"
        >
          <MessageSquare size={14} />
        </a>
      )}
    </div>
  );
}
