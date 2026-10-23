'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  role: 'SUPERADMIN' | 'ADMIN' | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'SUPERADMIN' | 'ADMIN' | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar sesión inicial y escuchar cambios de estado de forma unificada y robusta
  useEffect(() => {
    let mounted = true;
    let sessionSequence = 0;
    const pendingSessions = new Set<ReturnType<typeof setTimeout>>();

    async function handleSession(session: Session | null, seq = ++sessionSequence) {
      if (!mounted || seq !== sessionSequence) return;
      const currentUser = session?.user ?? null;
      
      if (!currentUser) {
        if (mounted && seq === sessionSequence) {
          setUser(null);
          setRole(null);
          setLoading(false);
        }
        return;
      }

      try {
        if (mounted && seq === sessionSequence) {
          setUser(currentUser);
        }
        
        // Buscar el rol en la base de datos
        const { data, error } = await supabase
          .from('UserRole')
          .select('role')
          .eq('email', currentUser.email?.trim().toLowerCase())
          .maybeSingle();

        if (mounted && seq === sessionSequence) {
          if (data && !error) {
            setRole(data.role as 'SUPERADMIN' | 'ADMIN');
          } else {
            console.warn('Usuario autenticado sin rol en UserRole:', currentUser.email);
            await supabase.auth.signOut();
            setUser(null);
            setRole(null);
          }
        }
      } catch (err) {
        console.error('Error al obtener rol del usuario:', err);
        if (mounted && seq === sessionSequence) {
          setUser(null);
          setRole(null);
        }
      } finally {
        if (mounted && seq === sessionSequence) {
          setLoading(false);
        }
      }
    }

    let subscription: { unsubscribe: () => void } | null = null;

    async function initializeAuth() {
      try {
        // 1. Obtener la sesión actual de forma proactiva con manejo de tokens inválidos/expirados
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Sesión anterior expirada o refresh token inválido:', error.message);
          await supabase.auth.signOut().catch(() => {});
          if (mounted) {
            setUser(null);
            setRole(null);
            setLoading(false);
          }
          return;
        }
        await handleSession(data?.session);
      } catch (err: unknown) {
        console.warn('Error al inicializar sesión:', err);
        await supabase.auth.signOut().catch(() => {});
        if (mounted) {
          setUser(null);
          setRole(null);
          setLoading(false);
        }
      }

      // 2. Escuchar futuros cambios
      if (!mounted) return;
      const { data } = supabase.auth.onAuthStateChange((event, sessionEvent) => {
        if (!mounted) return;
        const seq = ++sessionSequence;
        console.log('Evento de autenticación de Supabase recibido:', event);
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setRole(null);
          setLoading(false);
        } else if (event !== 'INITIAL_SESSION') {
          // Supabase waits for auth callbacks while holding its session lock.
          // Starting another Supabase request inside it can deadlock all queries.
          const timer = setTimeout(() => {
            pendingSessions.delete(timer);
            if (mounted) void handleSession(sessionEvent, seq);
          }, 0);
          pendingSessions.add(timer);
        }
      });
      subscription = data.subscription;
    }

    initializeAuth();

    return () => {
      mounted = false;
      pendingSessions.forEach(clearTimeout);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      
      // 1. Primero verificar de antemano si el mail está en la lista de roles
      const { data: roleCheck, error: roleCheckErr } = await supabase
        .from('UserRole')
        .select('role')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (roleCheckErr || !roleCheck) {
        return { 
          success: false, 
          error: 'Acceso denegado. Este correo electrónico no está autorizado en Juani Cocina.' 
        };
      }

      // 2. Iniciar sesión con Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      setUser(data.user);
      setRole(roleCheck.role as 'SUPERADMIN' | 'ADMIN');
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Ocurrió un error inesperado al iniciar sesión.' };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Verificar si el email está pre-autorizado en la tabla UserRole
      const { data: roleCheck, error: roleCheckErr } = await supabase
        .from('UserRole')
        .select('role')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (roleCheckErr || !roleCheck) {
        return { 
          success: false, 
          error: 'Este correo electrónico no está autorizado para registrarse en el sistema.' 
        };
      }

      // 2. Registrar en Supabase Auth
      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error al intentar registrarse.' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, signUp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
