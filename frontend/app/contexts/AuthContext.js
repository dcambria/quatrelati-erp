'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '../lib/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { user: userData, accessToken, refreshToken } = response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    setUser(userData);
    router.push('/');

    return userData;
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      router.push('/login');
    }
  };

  const refreshAccessToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const response = await api.post('/auth/refresh', { refreshToken });
      const { accessToken } = response.data;

      localStorage.setItem('accessToken', accessToken);
      return accessToken;
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      await logout();
      throw error;
    }
  };

  const isAdmin = user?.nivel === 'admin' || user?.nivel === 'superadmin';
  const isSuperAdmin = user?.nivel === 'superadmin';
  const isVendedor = user?.nivel === 'vendedor';
  // Vendedor com flag pode_visualizar_todos pode ver dados de outros vendedores (somente leitura)
  const podeVisualizarTodos = user?.pode_visualizar_todos || false;
  // Admin pode editar, vendedor com visualização pode ver mas não editar
  const canEdit = isAdmin;
  // Pode ver todos os dados se for admin ou tiver a flag
  const canViewAll = isAdmin || podeVisualizarTodos;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshAccessToken,
        isAuthenticated: !!user,
        isAdmin,
        isSuperAdmin,
        isVendedor,
        podeVisualizarTodos,
        canEdit,
        canViewAll,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
