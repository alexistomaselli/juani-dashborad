'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { 
  MessageSquare, 
  Search, 
  User, 
  Clock, 
  ArrowLeft, 
  Sparkles, 
  AlertCircle, 
  RefreshCcw,
  Check,
  Smartphone
} from 'lucide-react';

interface Conversation {
  id: string;
  whatsapp: string;
  customerName: string | null;
  status: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  tokensUsed: number | null;
  processingTime: number | null;
  metadata: any;
  createdAt: string;
}

export default function ConversationsManager() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileActiveView, setMobileActiveView] = useState<'list' | 'chat'>('list');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial conversations
  const fetchConversations = async () => {
    try {
      setLoadingConv(true);
      const { data, error } = await supabase
        .from('Conversation')
        .select('*')
        .order('lastMessageAt', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoadingConv(false);
    }
  };

  // Fetch messages for a specific conversation
  const fetchMessages = async (convId: string) => {
    try {
      setLoadingMsgs(true);
      const { data, error } = await supabase
        .from('ChatMessage')
        .select('*')
        .eq('conversationId', convId)
        .order('createdAt', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoadingMsgs(false);
    }
  };

  useEffect(() => {
    fetchConversations();

    // Set up Realtime listener for Conversation table
    const convSubscription = supabase
      .channel('conversation-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Conversation' },
        (payload) => {
          // If insert, prepend it. If update, replace/move to top
          setConversations((prev) => {
            const updated = [...prev];
            const newConv = payload.new as Conversation;
            const index = updated.findIndex((c) => c.id === newConv.id);

            if (index !== -1) {
              updated[index] = { ...updated[index], ...newConv };
            } else if (payload.eventType === 'INSERT') {
              updated.unshift(newConv);
            }
            
            // Re-sort by lastMessageAt descending
            return updated.sort((a, b) => {
              const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
              const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
              return dateB - dateA;
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(convSubscription);
    };
  }, []);

  // When selected conversation changes, fetch its messages and set up Realtime message listener
  useEffect(() => {
    if (!selectedConv) {
      setMessages([]);
      return;
    }

    fetchMessages(selectedConv.id);

    // Set up Realtime listener specifically for chat messages of this conversation
    const msgSubscription = supabase
      .channel(`chat-messages-${selectedConv.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'ChatMessage', 
          filter: `conversationId=eq.${selectedConv.id}` 
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            // Avoid duplicate additions
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgSubscription);
    };
  }, [selectedConv]);

  // Scroll to bottom whenever messages list updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Helper: Format relative time
  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'ahora';
    if (diffMin < 60) return `hace ${diffMin} min`;
    if (diffHr < 24) return `hace ${diffHr} h`;
    if (diffDay === 1) return 'ayer';
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  };

  const formatMsgTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv => {
    const name = conv.customerName || '';
    const whatsapp = conv.whatsapp || '';
    const term = searchTerm.toLowerCase();
    return name.toLowerCase().includes(term) || whatsapp.includes(term);
  });

  const selectConversation = (conv: Conversation) => {
    setSelectedConv(conv);
    setMobileActiveView('chat');
  };

  return (
    <div className="conversations-wrapper" style={{ display: 'flex', height: 'calc(100vh - 220px)', gap: '1.5rem', marginTop: '-0.5rem' }}>
      
      {/* LEFT PANEL - CHAT LIST */}
      <div className={`chats-sidebar card ${mobileActiveView === 'chat' ? 'mobile-hidden' : ''}`} style={{ 
        flex: '0 0 380px', 
        display: 'flex', 
        flexDirection: 'column', 
        padding: '1.25rem',
        overflow: 'hidden',
        height: '100%'
      }}>
        {/* Sidebar Header */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={18} style={{ color: 'var(--primary)' }} /> Chats del Agente
            </h2>
            <button 
              className="secondary" 
              onClick={fetchConversations} 
              disabled={loadingConv}
              style={{ padding: '0.35rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <RefreshCcw size={14} className={loadingConv ? 'spin' : ''} />
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar por cliente o WhatsApp..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem', fontSize: '0.875rem', padding: '0.5rem 1rem 0.5rem 2.5rem' }}
            />
          </div>
        </div>

        {/* Sidebar List */}
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '2px' }}>
          {loadingConv ? (
            <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '2rem 0', color: 'var(--muted)' }}>
              <RefreshCcw size={24} className="spin text-primary" />
              <span style={{ fontSize: '0.875rem' }}>Cargando chats...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', textAlign: 'center', color: 'var(--muted)' }}>
              <AlertCircle size={32} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
              <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>No se encontraron chats</span>
              <span style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Los chats de clientes atendidos por Juani o el Operador aparecerán acá.</span>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedConv?.id === conv.id;
              const hasName = !!conv.customerName;
              return (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  style={{
                    padding: '0.875rem 1rem',
                    borderRadius: '0.75rem',
                    background: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.01)',
                    border: isSelected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  className="chat-list-item"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                    <span style={{ 
                      fontWeight: isSelected ? '700' : '600', 
                      fontSize: '0.875rem', 
                      color: hasName ? 'var(--foreground)' : 'var(--muted)',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      maxWidth: '180px'
                    }}>
                      {conv.customerName || 'Cliente sin nombre'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={10} />
                      {formatTimeAgo(conv.lastMessageAt)}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                    <Smartphone size={10} style={{ color: 'var(--primary)', opacity: 0.7 }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      +{conv.whatsapp}
                    </span>
                  </div>

                  <div style={{ 
                    fontSize: '0.78125rem', 
                    color: isSelected ? 'var(--foreground)' : 'var(--muted)', 
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    opacity: 0.85
                  }}>
                    {conv.lastMessage || 'Sin mensajes aún'}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL - ACTIVE CHAT THREAD */}
      <div className={`chat-details-panel card ${mobileActiveView === 'list' ? 'mobile-hidden' : ''}`} style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        padding: 0,
        overflow: 'hidden',
        height: '100%',
        position: 'relative'
      }}>
        {selectedConv ? (
          <>
            {/* Active Chat Header */}
            <div style={{ 
              padding: '1rem 1.5rem', 
              borderBottom: '1px solid var(--card-border)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              background: 'rgba(24, 24, 27, 0.4)',
              backdropFilter: 'blur(10px)',
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button 
                  className="secondary mobile-only" 
                  onClick={() => setMobileActiveView('list')}
                  style={{ padding: '0.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>
                    {selectedConv.customerName || 'Cliente sin nombre'}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.1rem' }}>
                    <Smartphone size={10} /> +{selectedConv.whatsapp}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ 
                  fontSize: '0.625rem', 
                  fontWeight: '700', 
                  color: 'var(--primary)',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.25rem',
                  textTransform: 'uppercase'
                }}>
                  Agente Activo
                </span>
              </div>
            </div>

            {/* Message List */}
            <div className="custom-scrollbar" style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              background: 'rgba(10, 10, 11, 0.4)'
            }}>
              {loadingMsgs ? (
                <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--muted)' }}>
                  <RefreshCcw size={24} className="spin text-primary" />
                  <span style={{ fontSize: '0.875rem' }}>Cargando mensajes...</span>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                  <MessageSquare size={32} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
                  <span style={{ fontSize: '0.875rem' }}>No hay mensajes en esta conversación</span>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isAgent = msg.role === 'assistant';
                  return (
                    <motion.div
                      key={msg.id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isAgent ? 'flex-end' : 'flex-start',
                        width: '100%'
                      }}
                    >
                      {/* Message Bubble Container */}
                      <div style={{
                        maxWidth: '75%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isAgent ? 'flex-end' : 'flex-start'
                      }}>
                        {/* Bubble */}
                        <div style={{
                          padding: '0.875rem 1.125rem',
                          borderRadius: isAgent ? '1.25rem 1.25rem 0.25rem 1.25rem' : '1.25rem 1.25rem 1.25rem 0.25rem',
                          background: isAgent ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                          border: isAgent ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                          boxShadow: isAgent ? '0 4px 12px rgba(16, 185, 129, 0.05)' : '0 4px 12px rgba(0, 0, 0, 0.05)',
                          color: 'var(--foreground)',
                          fontSize: '0.9125rem',
                          lineHeight: '1.45',
                          wordBreak: 'break-word',
                          position: 'relative'
                        }}>
                          {msg.content}
                          
                          {/* AI / Juani Badge inside assistant message */}
                          {isAgent && (
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.2rem',
                              fontSize: '0.625rem', 
                              fontWeight: '700', 
                              color: 'var(--primary)',
                              marginTop: '0.5rem',
                              opacity: 0.8
                            }}>
                              <Sparkles size={8} /> Juani AI Agente
                            </div>
                          )}
                        </div>

                        {/* Timestamp & details below bubble */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          fontSize: '0.6875rem', 
                          color: 'var(--muted)',
                          marginTop: '0.25rem',
                          padding: '0 0.25rem'
                        }}>
                          <span>{formatMsgTime(msg.createdAt)}</span>
                          {isAgent && msg.processingTime && (
                            <>
                              <span>•</span>
                              <span>{parseFloat(msg.processingTime.toString()).toFixed(1)}s</span>
                            </>
                          )}
                          {isAgent && <Check size={10} style={{ color: 'var(--primary)' }} />}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer monitoring message */}
            <div style={{ 
              padding: '0.75rem 1.5rem', 
              borderTop: '1px solid var(--card-border)', 
              background: 'rgba(24, 24, 27, 0.6)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              color: 'var(--muted)',
              fontSize: '0.75rem'
            }}>
              <Sparkles size={12} className="text-primary" />
              <span>Esta conversación está siendo administrada por el Agente Autónomo. Los cambios se sincronizan en tiempo real.</span>
            </div>
          </>
        ) : (
          /* Empty Chat Welcome Screen */
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            flex: 1, 
            padding: '3rem', 
            textAlign: 'center',
            background: 'rgba(10, 10, 11, 0.2)'
          }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '1.25rem',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem',
                boxShadow: '0 8px 32px rgba(16, 185, 129, 0.05)'
              }}
            >
              <MessageSquare size={32} style={{ color: 'var(--primary)' }} />
            </motion.div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem' }}>
              Auditoría de Conversaciones
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', maxWidth: '380px', lineHeight: '1.6' }}>
              Seleccioná un cliente de la lista de la izquierda para ver en tiempo real el historial completo del chat y lo que responde el Agente de Pedidos.
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .chat-list-item:hover {
          background: rgba(255, 255, 255, 0.03) !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
          transform: translateY(-1px);
        }
        
        @media (max-width: 768px) {
          .mobile-hidden {
            display: none !important;
          }
          .conversations-wrapper {
            height: calc(100vh - 160px) !important;
          }
        }
      `}</style>
    </div>
  );
}
