// =====================================================
// Hook para buscar cidades do IBGE
// v1.0.0 - Lista de cidades por estado
// =====================================================

import { useState, useEffect, useCallback } from 'react';

// Cache de cidades no localStorage
const CACHE_KEY = 'quatrelati_cidades_ibge';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 dias

function getCache() {
  if (typeof window === 'undefined') return {};
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (data.timestamp && Date.now() - data.timestamp < CACHE_EXPIRY) {
        return data.estados || {};
      }
    }
  } catch {
    // Ignore
  }
  return {};
}

function setCache(estados) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      estados
    }));
  } catch {
    // Ignore - localStorage cheio
  }
}

export function useCidadesIBGE(estadoSigla) {
  const [cidades, setCidades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCidades = useCallback(async (uf) => {
    if (!uf) {
      setCidades([]);
      return;
    }

    const ufUpper = uf.toUpperCase();

    // Verificar cache
    const cache = getCache();
    if (cache[ufUpper]) {
      setCidades(cache[ufUpper]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufUpper}/municipios?orderBy=nome`
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar cidades');
      }

      const data = await response.json();
      const cidadesFormatadas = data.map(cidade => ({
        value: cidade.nome,
        label: cidade.nome
      }));

      // Salvar no cache
      cache[ufUpper] = cidadesFormatadas;
      setCache(cache);

      setCidades(cidadesFormatadas);
    } catch (err) {
      console.error('Erro ao buscar cidades:', err);
      setError(err.message);
      setCidades([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCidades(estadoSigla);
  }, [estadoSigla, fetchCidades]);

  return { cidades, loading, error, refetch: () => fetchCidades(estadoSigla) };
}

// Hook para buscar todas as cidades de uma vez (para autocomplete global)
export function useTodasCidades() {
  const [todasCidades, setTodasCidades] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTodas = async () => {
      const cache = getCache();

      // Se já temos todas as cidades em cache
      if (Object.keys(cache).length >= 27) {
        const todas = [];
        Object.entries(cache).forEach(([uf, cidades]) => {
          cidades.forEach(c => {
            todas.push({ ...c, estado: uf });
          });
        });
        setTodasCidades(todas);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome'
        );

        if (response.ok) {
          const data = await response.json();
          const cidadesFormatadas = data.map(cidade => ({
            value: cidade.nome,
            label: `${cidade.nome} - ${cidade.microrregiao.mesorregiao.UF.sigla}`,
            estado: cidade.microrregiao.mesorregiao.UF.sigla
          }));
          setTodasCidades(cidadesFormatadas);
        }
      } catch (err) {
        console.error('Erro ao buscar todas as cidades:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTodas();
  }, []);

  return { todasCidades, loading };
}
