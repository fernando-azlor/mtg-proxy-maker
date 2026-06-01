'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data } = await api.get('/api/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    setUser(data.user);
    return data;
  };

  const register = async (email, password, role = 'CLIENT') => {
    const { data } = await api.post('/api/auth/register', { email, password, role });
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // El servidor puede devolver 401 si la cookie ya fue borrada antes
      // (ej: justo después de eliminar la cuenta). Lo ignoramos —
      // lo importante es limpiar el estado local.
    } finally {
      setUser(null);
    }
  };

  // Solo usable por admins: cambia el rol de cualquier usuario
  const updateRole = async (userId, role) => {
    const { data } = await api.put('/api/users/role', { userId, role });
    return data;
  };

  const isClient  = user?.role === 'CLIENT' || user?.role === 'PREMIUM' || user?.role === 'ADMIN';
  const isPremium = user?.role === 'PREMIUM' || user?.role === 'ADMIN';
  const isAdmin   = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateRole, isClient, isPremium, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
