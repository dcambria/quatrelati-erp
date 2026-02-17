'use client';

// =====================================================
// Detalhe de Contato do Site
// v1.0.0 - Visualização, atualização de status e conversão em cliente
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  User,
  Building2,
  Phone,
  Mail,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  PlayCircle,
  UserPlus,
  ExternalLink,
} from 'lucide-react';
import api from '../../../lib/api';
import Header from '../../../components/layout/Header';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Loading from '../../../components/ui/Loading';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG = {
  novo: { label: 'Novo', variant: 'blue' },
  em_atendimento: { label: 'Em atendimento', variant: 'yellow' },
  convertido: { label: 'Convertido', variant: 'green' },
  descartado: { label: 'Descartado', variant: 'gray' },
};

export default function ContatoDetalhePage() {
  const { id } = useParams();
  const router = useRouter();
  const [contato, setContato] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [showConverterModal, setShowConverterModal] = useState(false);
  const [observacoes, setObservacoes] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchContato = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get(`/contatos/${id}`);
      setContato(data);
      setObservacoes(data.observacoes_internas || '');
    } catch {
      toast.error('Contato não encontrado');
      router.push('/contatos');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchContato();
  }, [fetchContato]);

  const atualizarStatus = async (novoStatus) => {
    try {
      setSalvando(true);
      await api.patch(`/contatos/${id}/status`, {
        status: novoStatus,
        observacoes_internas: observacoes || undefined,
      });
      toast.success('Status atualizado');
      fetchContato();
    } catch {
      toast.error('Erro ao atualizar status');
    } finally {
      setSalvando(false);
    }
  };

  const salvarObservacoes = async () => {
    try {
      setSalvando(true);
      await api.patch(`/contatos/${id}/status`, {
        status: contato.status,
        observacoes_internas: observacoes,
      });
      toast.success('Observações salvas');
    } catch {
      toast.error('Erro ao salvar observações');
    } finally {
      setSalvando(false);
    }
  };

  const onConverterSubmit = async (formData) => {
    try {
      setSalvando(true);
      const result = await api.post(`/contatos/${id}/converter`, formData);
      toast.success(`Cliente "${result.cliente_nome}" criado com sucesso!`);
      setShowConverterModal(false);
      fetchContato();
    } catch (error) {
      toast.error(error.message || 'Erro ao converter em cliente');
    } finally {
      setSalvando(false);
    }
  };

  const formatData = (data) => {
    try {
      return format(new Date(data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return data;
    }
  };

  const abrirConverterModal = () => {
    reset({
      nome: contato.nome || '',
      razao_social: contato.empresa || '',
      email: contato.email || '',
      telefone: contato.telefone || '',
      observacoes: contato.mensagem || '',
    });
    setShowConverterModal(true);
  };

  if (loading) return <Loading />;
  if (!contato) return null;

  const statusConf = STATUS_CONFIG[contato.status] || STATUS_CONFIG.novo;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.push('/contatos')} icon={<ArrowLeft className="w-4 h-4" />}>
          Voltar
        </Button>
      </div>

      <Header
        title={contato.nome}
        subtitle={contato.empresa || 'Sem empresa'}
        icon={<MessageSquare className="w-6 h-6" />}
        badge={<Badge variant={statusConf.variant}>{statusConf.label}</Badge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Dados do contato">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium">Nome:</span>
                <span>{contato.nome}</span>
              </div>
              {contato.empresa && (
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">Empresa:</span>
                  <span>{contato.empresa}</span>
                </div>
              )}
              {contato.email && (
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">Email:</span>
                  <a href={`mailto:${contato.email}`} className="text-blue-600 hover:underline">
                    {contato.email}
                  </a>
                </div>
              )}
              {contato.telefone && (
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">Telefone:</span>
                  <a
                    href={`https://wa.me/55${contato.telefone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:underline flex items-center gap-1"
                  >
                    {contato.telefone} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs">
                <Clock className="w-3.5 h-3.5" />
                Recebido em {formatData(contato.recebido_em)}
              </div>
            </div>
          </Card>

          <Card title="Mensagem">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {contato.mensagem}
            </p>
          </Card>

          <Card title="Observações internas">
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={4}
              placeholder="Adicionar notas sobre este contato..."
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="mt-2 flex justify-end">
              <Button size="sm" onClick={salvarObservacoes} loading={salvando}>
                Salvar observações
              </Button>
            </div>
          </Card>

          {contato.status === 'convertido' && contato.cliente_id && (
            <Card>
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">
                  Convertido em cliente: {contato.cliente_nome}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/clientes?id=${contato.cliente_id}`)}
                  icon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  Ver cliente
                </Button>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card title="Ações">
            <div className="space-y-3">
              {contato.status === 'novo' && (
                <Button
                  className="w-full"
                  variant="primary"
                  icon={<PlayCircle className="w-4 h-4" />}
                  onClick={() => atualizarStatus('em_atendimento')}
                  loading={salvando}
                >
                  Iniciar atendimento
                </Button>
              )}

              {contato.status === 'em_atendimento' && (
                <>
                  <Button
                    className="w-full"
                    variant="success"
                    icon={<UserPlus className="w-4 h-4" />}
                    onClick={abrirConverterModal}
                  >
                    Converter em cliente
                  </Button>
                  <Button
                    className="w-full"
                    variant="danger"
                    icon={<XCircle className="w-4 h-4" />}
                    onClick={() => atualizarStatus('descartado')}
                    loading={salvando}
                  >
                    Descartar
                  </Button>
                </>
              )}

              {(contato.status === 'convertido' || contato.status === 'descartado') && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Contato finalizado.
                </p>
              )}
            </div>
          </Card>

          {contato.atendido_por_nome && (
            <Card>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Atendido por: <span className="font-medium">{contato.atendido_por_nome}</span>
              </p>
            </Card>
          )}
        </div>
      </div>

      <Modal
        isOpen={showConverterModal}
        onClose={() => setShowConverterModal(false)}
        title="Converter em cliente"
      >
        <form onSubmit={handleSubmit(onConverterSubmit)} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Os dados abaixo serão usados para criar o novo cliente. Revise e complete as informações.
          </p>

          <Input
            label="Nome *"
            {...register('nome', { required: 'Nome é obrigatório' })}
            error={errors.nome?.message}
          />
          <Input
            label="Razão social / Empresa"
            {...register('razao_social')}
          />
          <Input
            label="CNPJ / CPF"
            {...register('cnpj_cpf')}
          />
          <Input
            label="Email"
            type="email"
            {...register('email')}
          />
          <Input
            label="Telefone"
            {...register('telefone')}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Observações
            </label>
            <textarea
              {...register('observacoes')}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => setShowConverterModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={salvando} icon={<UserPlus className="w-4 h-4" />}>
              Criar cliente
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
