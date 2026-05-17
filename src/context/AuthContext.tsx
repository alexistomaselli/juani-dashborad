'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

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

  // Cargar sesión inicial y escuchar cambios de estado de forma robusta
  useEffect(() => {
    let mounted = true;

    async function handleSession(session: any) {
      const currentUser = session?.user ?? null;
      
      if (!currentUser) {
        if (mounted) {
          setUser(null);
          setRole(null);
          setLoading(false);
        }
        return;
      }

      try {
        if (mounted) {
          setUser(currentUser);
        }
        
        // Buscar el rol en la base de datos
        const { data, error } = await supabase
          .from('UserRole')
          .select('role')
          .eq('email', currentUser.email?.trim().toLowerCase())
          .maybeSingle();

        if (mounted) {
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
        if (mounted) {
          setUser(null);
          setRole(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    async function initializeAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          await handleSession(session);
        }
      } catch (err) {
        console.error('Error al verificar sesión inicial:', err);
        if (mounted) {
          setUser(null);
          setRole(null);
          setLoading(false);
        }
      }
    }

    // Inicializar sesión de forma síncrona/asíncrona inmediata
    initializeAuth();

    // Registrar oyente para futuros cambios de estado
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setRole(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await handleSession(session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
    } catch (err: any) {
      return { success: false, error: err.message || 'Ocurrió un error inesperado al iniciar sesión.' };
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
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al intentar registrarse.' };
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
