'use client';

// =====================================================
// Página de Contatos do Site
// v1.1.0 - Lista e gestão de mensagens do formulário
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  MessageSquare,
  Search,
  RefreshCw,
  ChevronRight,
  Building2,
  Phone,
  Mail,
  Clock,
} from 'lucide-react';
import api from '../../lib/api';
import Header from '../../components/layout/Header';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Loading from '../../components/ui/Loading';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG = {
  novo: {
    label: 'Novo',
    variant: 'blue',
    icon: '⭐',
    badgeClass: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm',
    borderColor: 'border-blue-500',
  },
  em_atendimento: {
    label: 'Em atendimento',
    variant: 'yellow',
    icon: '⏳',
    badgeClass: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm',
    borderColor: 'border-amber-400',
  },
  convertido: {
    label: 'Convertido',
    variant: 'green',
    icon: '✓',
    badgeClass: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-600 text-white shadow-sm',
    borderColor: 'border-green-500',
  },
  descartado: {
    label: 'Descartado',
    variant: 'gray',
    icon: '✕',
    badgeClass: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-400 text-white shadow-sm',
    borderColor: 'border-gray-400',
  },
};

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'novo', label: 'Novos' },
  { value: 'em_atendimento', label: 'Em atendimento' },
  { value: 'convertido', label: 'Convertidos' },
  { value: 'descartado', label: 'Descartados' },
];

export default function ContatosPage() {
  const router = useRouter();
  const [contatos, setContatos] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');

  const fetchContatos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFiltro) params.set('status', statusFiltro);
      params.set('limit', '100');

      const res = await api.get(`/contatos?${params.toString()}`);
      setContatos(res.data.contatos || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      toast.error('Erro ao carregar contatos');
    } finally {
      setLoading(false);
    }
  }, [search, statusFiltro]);

  useEffect(() => {
    const timer = setTimeout(fetchContatos, 300);
    return () => clearTimeout(timer);
  }, [fetchContatos]);

  const formatData = (data) => {
    try {
      return format(new Date(data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return data;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Header
        title="Contatos do Site"
        subtitle={`${total} contato${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
        icon={<MessageSquare className="w-6 h-6" />}
      />

      {/* Filtros */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nome, empresa ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <Button variant="outline" onClick={fetchContatos} icon={<RefreshCw className="w-4 h-4" />}>
            Atualizar
          </Button>
        </div>
      </Card>

      {/* Lista */}
      {loading ? (
        <Loading />
      ) : contatos.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum contato encontrado</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {contatos.map((contato) => {
            const statusConf = STATUS_CONFIG[contato.status] || STATUS_CONFIG.novo;
            return (
              <div key={contato.id} className={`border-l-4 ${statusConf.borderColor} rounded-3xl`}>
              <Card
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => router.push(`/contatos/${contato.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {contato.nome}
                      </span>
                      <span className={statusConf.badgeClass}>
                        {statusConf.icon} {statusConf.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                      {contato.empresa && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {contato.empresa}
                        </span>
                      )}
                      {contato.telefone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {contato.telefone}
                        </span>
                      )}
                      {contato.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {contato.email}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatData(contato.recebido_em)}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
