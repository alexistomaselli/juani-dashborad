'use client';

import { useState, useEffect } from 'react';
import { LucideIcon } from 'lucide-react';

interface EditableFieldProps {
  value: string;
  onSave: (val: string) => void;
  icon?: LucideIcon;
  placeholder?: string;
  fontWeight?: string;
  fontSize?: string;
  externalLink?: string;
  externalLinkIcon?: LucideIcon;
  externalLinkTitle?: string;
}

export default function EditableField({ 
  value: initialValue, 
  onSave, 
  icon: Icon, 
  placeholder,
  fontWeight = '400',
  fontSize = '1rem',
  externalLink,
  externalLinkIcon: ExternalIcon,
  externalLinkTitle = 'Abrir link'
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);

  // Sync local value when initialValue changes
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSave = () => {
    if (value !== initialValue) {
      onSave(value);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
        <input 
          autoFocus
          type="text" 
          value={value} 
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') {
              setValue(initialValue);
              setIsEditing(false);
            }
          }}
          onBlur={handleSave}
          style={{ 
            padding: '0.25rem 0.5rem', 
            fontSize, 
            fontWeight, 
            width: '100%',
            background: 'var(--background)',
            border: '1px solid var(--accent)',
            borderRadius: '4px',
            color: 'var(--foreground)',
            outline: 'none'
          }}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div 
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '1.5rem' }}
    >
      <div 
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1 }}
      >
        {Icon && <Icon size={14} color={initialValue ? 'var(--primary)' : 'var(--muted)'} />}
        <span style={{ 
          color: initialValue ? 'var(--foreground)' : 'var(--muted)', 
          fontStyle: initialValue ? 'normal' : 'italic',
          fontWeight,
          fontSize
        }}>
          {initialValue || placeholder || 'Editar'}
        </span>
      </div>
      
      {externalLink && initialValue && (
        <a 
          href={externalLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ 
            color: 'var(--primary)', 
            display: 'flex', 
            alignItems: 'center', 
            padding: '0.25rem',
            borderRadius: '4px',
            background: 'rgba(16, 185, 129, 0.1)',
            transition: 'all 0.2s'
          }}
          title={externalLinkTitle}
        >
          {ExternalIcon && <ExternalIcon size={14} />}
        </a>
      )}
    </div>
  );
}
