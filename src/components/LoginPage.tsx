'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, ArrowRight, ShieldAlert, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!email || !password) {
      setError('Por favor, completa todos los campos.');
      setLoading(false);
      return;
    }

    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.error || 'Credenciales inválidas.');
      } else {
        setSuccess('¡Sesión iniciada correctamente! Cargando panel...');
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="radial-glow glow-1" />
      <div className="radial-glow glow-2" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="login-card card"
      >
        {/* Logo and Header */}
        <div className="login-header">
          <div className="logo-image-container">
            <img 
              src="/logo-white.png" 
              alt="Juani Cocina Logo" 
              className="login-logo-img"
            />
          </div>
          <h2>Juani Cocina</h2>
          <p>Panel de Administración y Control de Pedidos</p>
        </div>

        {/* Error / Success Alerts */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="alert error-alert"
            >
              <ShieldAlert size={18} />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="alert success-alert"
            >
              <Sparkles size={18} />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="email">Correo Electrónico</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <Mail size={18} />
              </span>
              <input 
                id="email"
                type="email" 
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <Lock size={18} />
              </span>
              <input 
                id="password"
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="primary-btn submit-btn" 
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="spinner" size={20} />
            ) : (
              <>
                Ingresar al Dashboard
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>
            🔒 Acceso restringido únicamente para personal autorizado de Juani Cocina.
          </p>
        </div>
      </motion.div>

      <style jsx>{`
        .login-wrapper {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #050505;
          position: relative;
          overflow: hidden;
          padding: 1rem;
          color: #fff;
          font-family: var(--font-geist-sans), sans-serif;
        }

        .radial-glow {
          position: absolute;
          width: 50vw;
          height: 50vw;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0) 70%);
          pointer-events: none;
          z-index: 1;
        }

        .glow-1 {
          top: -20vw;
          left: -10vw;
        }

        .glow-2 {
          bottom: -20vw;
          right: -10vw;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0) 70%);
        }

        .login-card {
          width: 100%;
          max-width: 440px;
          padding: 2.5rem;
          background: rgba(15, 15, 15, 0.7);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 1.5rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          position: relative;
          z-index: 2;
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .logo-image-container {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.25rem auto;
        }

        .login-logo-img {
          height: 80px;
          width: auto;
          object-fit: contain;
          filter: drop-shadow(0 4px 12px rgba(255, 255, 255, 0.15));
        }

        .login-header h2 {
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin: 0 0 0.5rem 0;
          background: linear-gradient(135deg, #fff 30%, #a3a3a3 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .login-header p {
          font-size: 0.875rem;
          color: #a3a3a3;
          margin: 0;
        }

        .alert {
          padding: 0.875rem 1rem;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          line-height: 1.4;
        }

        .error-alert {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .success-alert {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #34d399;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-group label {
          font-size: 0.825rem;
          font-weight: 600;
          color: #a3a3a3;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          color: #737373;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          transition: color 0.3s ease;
        }

        .input-wrapper:focus-within .input-icon {
          color: var(--primary, #10b981);
        }

        .input-wrapper input {
          width: 100% !important;
          padding: 0.75rem 1rem 0.75rem 2.75rem !important;
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 0.75rem !important;
          color: #fff !important;
          font-size: 0.95rem !important;
          transition: all 0.3s ease !important;
        }

        .input-wrapper input:focus {
          outline: none !important;
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: var(--primary, #10b981) !important;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15) !important;
        }

        /* Override Chrome Autofill Styles */
        .input-wrapper input:-webkit-autofill,
        .input-wrapper input:-webkit-autofill:hover, 
        .input-wrapper input:-webkit-autofill:focus, 
        .input-wrapper input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #161616 inset !important;
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #ffffff !important;
          transition: background-color 5000s ease-in-out 0s !important;
        }

        .primary-btn {
          width: 100%;
          padding: 0.875rem;
          background: var(--primary, #10b981);
          border: none;
          border-radius: 0.75rem;
          color: #fff;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }

        .primary-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
          background: #059669;
        }

        .primary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        .login-footer {
          margin-top: 2rem;
          text-align: center;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 1.5rem;
        }

        .login-footer p {
          font-size: 0.775rem;
          color: #737373;
          margin: 0;
          line-height: 1.4;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
