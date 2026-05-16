'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleCardProps {
  title: string;
  subtitle?: string;
  count?: number;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  action?: React.ReactNode;
}

export default function CollapsibleCard({ 
  title, 
  subtitle, 
  count, 
  icon, 
  children, 
  defaultOpen = false,
  action
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          padding: '1.25rem 1.5rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: 'pointer',
          background: isOpen ? 'rgba(255,255,255,0.02)' : 'transparent',
          transition: 'background 0.2s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {icon && (
            <div style={{ 
              background: 'rgba(139, 92, 246, 0.1)', 
              padding: '0.5rem', 
              borderRadius: '0.5rem',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {icon}
            </div>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontWeight: '700', margin: 0 }}>{title}</h3>
              {count !== undefined && (
                <span style={{ 
                  background: 'var(--secondary)', 
                  color: 'var(--foreground)', 
                  fontSize: '0.75rem', 
                  padding: '0.125rem 0.5rem', 
                  borderRadius: '1rem',
                  fontWeight: '600'
                }}>
                  {count}
                </span>
              )}
            </div>
            {subtitle && <p style={{ color: 'var(--muted)', fontSize: '0.75rem', margin: '0.125rem 0 0 0' }}>{subtitle}</p>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
          <div style={{ color: 'var(--muted)' }}>
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      {isOpen && (
        <div style={{ 
          padding: '0 1.5rem 1.5rem 1.5rem',
          animation: 'slideDown 0.2s ease-out'
        }}>
          <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem' }}>
            {children}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
