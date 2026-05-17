'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import LoginPage from './LoginPage';
import { ChefHat } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader-container">
          <div className="logo-glow">
            <ChefHat size={48} className="spinner-slow" />
          </div>
          <h3>Cargando Juani Cocina...</h3>
          <p>Verificando credenciales de acceso seguro</p>
        </div>
        <style jsx>{`
          .loading-screen {
            min-height: 100vh;
            width: 100vw;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #050505;
            color: white;
            font-family: var(--font-geist-sans), sans-serif;
          }
          .loader-container {
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
          }
          .logo-glow {
            width: 80px;
            height: 80px;
            border-radius: 1.5rem;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 30px rgba(16, 185, 129, 0.2);
            margin-bottom: 0.5rem;
          }
          h3 {
            font-size: 1.25rem;
            font-weight: 700;
            margin: 0;
            background: linear-gradient(135deg, #fff 30%, #a3a3a3 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          p {
            font-size: 0.875rem;
            color: #737373;
            margin: 0;
          }
          .spinner-slow {
            animation: pulse-glow 2s infinite ease-in-out;
            color: #10b981;
          }
          @keyframes pulse-glow {
            0%, 100% {
              transform: scale(1);
              opacity: 0.7;
            }
            50% {
              transform: scale(1.1);
              opacity: 1;
              filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.5));
            }
          }
        `}</style>
      </div>
    );
  }

  if (!user || !role) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
