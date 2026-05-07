'use client';

import { useChat } from 'ai/react';
import { Send, User, Bot, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatAgent() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();

  return (
    <div className="card chat-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem' }}>
        <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '0.5rem', borderRadius: '0.5rem' }}>
          <Sparkles size={20} color="var(--primary)" />
        </div>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Agente de Ventas IA</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>En línea y listo para tomar pedidos</p>
        </div>
      </div>

      <div className="messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: '2rem' }}>
            <p>¡Hola! Soy tu asistente virtual.</p>
            <p style={{ fontSize: '0.8rem' }}>Dime qué necesitas y yo me encargo de registrarlo.</p>
          </div>
        )}
        <AnimatePresence>
          {messages.map((m: any) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`message ${m.role === 'user' ? 'message-user' : 'message-assistant'}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: '700', textTransform: 'uppercase' }}>
                  {m.role === 'user' ? 'Tú' : 'Agente'}
                </span>
              </div>
              {m.content}
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="message message-assistant" style={{ opacity: 0.7 }}>
            Escribiendo...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          value={input}
          placeholder="Escribe un mensaje..."
          onChange={handleInputChange}
          autoComplete="off"
        />
        <button type="submit" disabled={isLoading} style={{ padding: '0.75rem' }}>
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
