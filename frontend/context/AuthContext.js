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
    await api.post('/api/auth/logout');
    setUser(null);
  };

  const isClient = user?.role === 'CLIENT' || user?.role === 'PREMIUM';
  const isPremium = user?.role === 'PREMIUM';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isClient, isPremium }}>
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
