'use client';
// =====================================================
// Contexto de Filtro Global de Vendedor
// v1.1.0 - Inclui todos os usuários no filtro VER COMO
// =====================================================

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../lib/api';

const VendedorFilterContext = createContext({});

export function VendedorFilterProvider({ children }) {
  const { canViewAll, isAdmin } = useAuth();
  const [vendedores, setVendedores] = useState([]);
  const [vendedorSelecionado, setVendedorSelecionado] = useState(null);
  const [loading, setLoading] = useState(false);

  // Carregar lista de vendedores (apenas para admins)
  const carregarVendedores = useCallback(async () => {
    if (!canViewAll) return;

    setLoading(true);
    try {
      // Buscar todos os usuários ativos e filtrar
      const response = await api.get('/usuarios?ativo=true');
      const usuarios = response.data.usuarios || [];

      // Incluir todos os usuários ativos (vendedor, admin, superadmin)
      const vendedoresMap = new Map();
      usuarios.forEach(u => vendedoresMap.set(u.id, u));

      const todosVendedores = Array.from(vendedoresMap.values())
        .sort((a, b) => a.nome.localeCompare(b.nome));

      setVendedores(todosVendedores);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    } finally {
      setLoading(false);
    }
  }, [canViewAll]);

  useEffect(() => {
    if (canViewAll) {
      carregarVendedores();
    }
  }, [canViewAll, carregarVendedores]);

  // Persistir seleção no localStorage
  useEffect(() => {
    const savedVendedor = localStorage.getItem('vendedorFiltroGlobal');
    if (savedVendedor && savedVendedor !== 'null') {
      setVendedorSelecionado(JSON.parse(savedVendedor));
    }
  }, []);

  const selecionarVendedor = (vendedor) => {
    setVendedorSelecionado(vendedor);
    if (vendedor) {
      localStorage.setItem('vendedorFiltroGlobal', JSON.stringify(vendedor));
    } else {
      localStorage.removeItem('vendedorFiltroGlobal');
    }
  };

  const limparFiltro = () => {
    setVendedorSelecionado(null);
    localStorage.removeItem('vendedorFiltroGlobal');
  };

  // Encontrar vendedor selecionado pelo ID
  const vendedorAtual = vendedorSelecionado
    ? vendedores.find(v => v.id === vendedorSelecionado.id) || vendedorSelecionado
    : null;

  return (
    <VendedorFilterContext.Provider
      value={{
        vendedores,
        vendedorSelecionado: vendedorAtual,
        vendedorId: vendedorAtual?.id || null,
        selecionarVendedor,
        limparFiltro,
        loading,
        canFilter: canViewAll,
        isFiltering: !!vendedorAtual,
      }}
    >
      {children}
    </VendedorFilterContext.Provider>
  );
}

export function useVendedorFilter() {
  const context = useContext(VendedorFilterContext);
  if (!context) {
    // Retorna valores default se usado fora do provider
    return {
      vendedores: [],
      vendedorSelecionado: null,
      vendedorId: null,
      selecionarVendedor: () => {},
      limparFiltro: () => {},
      loading: false,
      canFilter: false,
      isFiltering: false,
    };
  }
  return context;
}
