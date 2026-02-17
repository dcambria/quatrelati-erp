'use client';

// =====================================================
// Detalhe de Contato do Site
// v1.1.0 - WhatsApp button, timeline de histórico e modal de email
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
  Send,
  MessageCircle,
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

const ACAO_LABELS = {
  atualizar: 'Status atualizado',
  converter: 'Convertido em cliente',
  email_enviado: 'Email enviado',
  criar: 'Contato criado',
};

export default function ContatoDetalhePage() {
  const { id } = useParams();
  const router = useRouter();
  const [contato, setContato] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [showConverterModal, setShowConverterModal] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [historico, setHistorico] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({ assunto: '', corpo: '' });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchContato = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/contatos/${id}`);
      setContato(res.data);
      setObservacoes(res.data.observacoes_internas || '');
    } catch {
      toast.error('Contato não encontrado');
      router.push('/contatos');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const fetchHistorico = useCallback(async () => {
    try {
      setLoadingHistorico(true);
      const res = await api.get(`/contatos/${id}/historico`);
      setHistorico(res.data.historico || []);
    } catch {
      // histórico é secundário, falha silenciosa
    } finally {
      setLoadingHistorico(false);
    }
  }, [id]);

  const enviarEmail = async () => {
    if (!emailForm.assunto.trim() || !emailForm.corpo.trim()) {
      toast.error('Preencha assunto e mensagem');
      return;
    }
    try {
      setEnviandoEmail(true);
      await api.post(`/contatos/${id}/email`, emailForm);
      toast.success('Email enviado com sucesso!');
      setShowEmailModal(false);
      setEmailForm({ assunto: '', corpo: '' });
      fetchHistorico();
    } catch {
      toast.error('Erro ao enviar email');
    } finally {
      setEnviandoEmail(false);
    }
  };

  useEffect(() => {
    fetchContato();
    fetchHistorico();
  }, [fetchContato, fetchHistorico]);

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
      toast.success(`Cliente "${result.data.cliente_nome}" criado com sucesso!`);
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

          <Card title="Histórico">
            {loadingHistorico ? (
              <p className="text-sm text-gray-400">Carregando...</p>
            ) : historico.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Sem registros ainda.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
                <div className="space-y-4">
                  {historico.map((entry) => (
                    <div key={entry.id} className="flex gap-3 pl-8 relative">
                      <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-gray-800" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {ACAO_LABELS[entry.acao] || entry.acao}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {entry.usuario_nome} · {formatData(entry.created_at)}
                        </p>
                        {entry.detalhes?.assunto && (
                          <p className="text-xs text-gray-400 mt-0.5">Assunto: {entry.detalhes.assunto}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              {contato.telefone && (
                <a
                  href={`https://wa.me/55${contato.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${contato.nome}, tudo bem? Estou entrando em contato referente à sua mensagem enviada pelo nosso site.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
              )}
              {contato.email && (
                <Button
                  className="w-full"
                  variant="outline"
                  icon={<Send className="w-4 h-4" />}
                  onClick={() => {
                    setEmailForm({ assunto: `Re: Contato de ${contato.nome}`, corpo: '' });
                    setShowEmailModal(true);
                  }}
                >
                  Enviar email
                </Button>
              )}
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

      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Enviar email para o contato"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Enviando para: <strong>{contato.email}</strong>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Assunto *
            </label>
            <input
              type="text"
              value={emailForm.assunto}
              onChange={(e) => setEmailForm(f => ({ ...f, assunto: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Assunto do email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mensagem *
            </label>
            <textarea
              value={emailForm.corpo}
              onChange={(e) => setEmailForm(f => ({ ...f, corpo: e.target.value }))}
              rows={6}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Escreva sua mensagem..."
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => setShowEmailModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={enviarEmail}
              loading={enviandoEmail}
              icon={<Send className="w-4 h-4" />}
            >
              Enviar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
