'use client';
// =====================================================
// Contexto de Filtro Global de Vendedor
// v1.2.0 - Filtra apenas usuários com is_vendedor=true
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
      // Buscar todos os usuários ativos
      const response = await api.get('/usuarios?ativo=true');
      const usuarios = response.data.usuarios || [];

      // Filtrar apenas usuários marcados como vendedor (is_vendedor = true)
      const vendedoresAtivos = usuarios
        .filter(u => u.is_vendedor === true)
        .sort((a, b) => a.nome.localeCompare(b.nome));

      setVendedores(vendedoresAtivos);
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
        carregarVendedores,
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
      carregarVendedores: () => {},
      loading: false,
      canFilter: false,
      isFiltering: false,
    };
  }
  return context;
}
