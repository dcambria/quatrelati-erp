'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  User,
  Phone,
  Mail,
  MapPin,
  ShoppingCart,
  Upload,
  X,
  Image,
  Building2,
  UserCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useVendedorFilter } from '../../contexts/VendedorFilterContext';
import api from '../../lib/api';
import Header from '../../components/layout/Header';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Loading, { TableSkeleton } from '../../components/ui/Loading';

const ESTADOS = [
  { value: 'AC', label: 'AC' }, { value: 'AL', label: 'AL' }, { value: 'AP', label: 'AP' },
  { value: 'AM', label: 'AM' }, { value: 'BA', label: 'BA' }, { value: 'CE', label: 'CE' },
  { value: 'DF', label: 'DF' }, { value: 'ES', label: 'ES' }, { value: 'GO', label: 'GO' },
  { value: 'MA', label: 'MA' }, { value: 'MT', label: 'MT' }, { value: 'MS', label: 'MS' },
  { value: 'MG', label: 'MG' }, { value: 'PA', label: 'PA' }, { value: 'PB', label: 'PB' },
  { value: 'PR', label: 'PR' }, { value: 'PE', label: 'PE' }, { value: 'PI', label: 'PI' },
  { value: 'RJ', label: 'RJ' }, { value: 'RN', label: 'RN' }, { value: 'RS', label: 'RS' },
  { value: 'RO', label: 'RO' }, { value: 'RR', label: 'RR' }, { value: 'SC', label: 'SC' },
  { value: 'SP', label: 'SP' }, { value: 'SE', label: 'SE' }, { value: 'TO', label: 'TO' },
];

const clienteSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  razao_social: z.string().optional(),
  cnpj_cpf: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  endereco: z.string().optional(),
  endereco_entrega: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  contato_nome: z.string().optional(),
  observacoes: z.string().optional(),
  vendedor_id: z.string().optional(),
});

export default function ClientesPage() {
  const { canEdit, isAdmin, user } = useAuth();
  const { vendedorId } = useVendedorFilter();
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [search, setSearch] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('true');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [detailsModal, setDetailsModal] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(clienteSchema),
  });

  useEffect(() => {
    carregarUsuarios();
  }, []);

  useEffect(() => {
    carregarClientes();
  }, [filtroAtivo, vendedorId]);

  const carregarUsuarios = async () => {
    try {
      const res = await api.get('/usuarios?ativo=true');
      setUsuarios(res.data.usuarios || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const carregarClientes = async () => {
    setLoading(true);
    try {
      let url = `/clientes?ativo=${filtroAtivo}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (vendedorId) url += `&vendedor_id=${vendedorId}`;

      const res = await api.get(url);
      setClientes(res.data.clientes);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const buscar = (e) => {
    e.preventDefault();
    carregarClientes();
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 1MB');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast.error('Formato não suportado. Use JPG, PNG, GIF ou WebP');
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const res = await api.upload('/upload/logo', formData);
      setLogoUrl(res.data.url);
      toast.success('Logo enviada com sucesso');
    } catch (error) {
      console.error('Erro ao enviar logo:', error);
      toast.error('Erro ao enviar logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const abrirModal = (cliente = null) => {
    if (cliente) {
      setEditingCliente(cliente);
      setLogoUrl(cliente.logo_url || '');
      reset({
        nome: cliente.nome || '',
        razao_social: cliente.razao_social || '',
        cnpj_cpf: cliente.cnpj_cpf || '',
        telefone: cliente.telefone || '',
        email: cliente.email || '',
        endereco: cliente.endereco || '',
        endereco_entrega: cliente.endereco_entrega || '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        cep: cliente.cep || '',
        contato_nome: cliente.contato_nome || '',
        observacoes: cliente.observacoes || '',
        vendedor_id: cliente.vendedor_id?.toString() || '',
      });
    } else {
      setEditingCliente(null);
      setLogoUrl('');
      reset({
        nome: '',
        razao_social: '',
        cnpj_cpf: '',
        telefone: '',
        email: '',
        endereco: '',
        endereco_entrega: '',
        cidade: '',
        estado: '',
        cep: '',
        contato_nome: '',
        observacoes: '',
        vendedor_id: user?.id?.toString() || '',
      });
    }
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setEditingCliente(null);
    reset();
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        logo_url: logoUrl || null,
        vendedor_id: data.vendedor_id ? parseInt(data.vendedor_id) : null,
      };

      if (editingCliente) {
        await api.put(`/clientes/${editingCliente.id}`, payload);
        toast.success('Cliente atualizado com sucesso');
      } else {
        await api.post('/clientes', payload);
        toast.success('Cliente criado com sucesso');
      }

      fecharModal();
      carregarClientes();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      toast.error(error.message || 'Erro ao salvar cliente');
    } finally {
      setSaving(false);
    }
  };

  const excluirCliente = async (id) => {
    try {
      await api.delete(`/clientes/${id}`);
      toast.success('Cliente excluído/desativado com sucesso');
      setDeleteConfirm(null);
      carregarClientes();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast.error(error.message || 'Erro ao excluir cliente');
    }
  };

  const verDetalhes = async (cliente) => {
    try {
      const res = await api.get(`/clientes/${cliente.id}`);
      setDetailsModal(res.data.cliente);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      toast.error('Erro ao carregar detalhes');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Verificar se pode editar o cliente específico
  const podeEditarCliente = (cliente) => {
    if (isAdmin) return true;
    return cliente.vendedor_id === user?.id;
  };

  return (
    <div className="p-6 space-y-6">
      <Header
        title="Clientes"
        subtitle={`${clientes.length} clientes cadastrados`}
        actions={
          <Button onClick={() => abrirModal()}>
            <Plus className="w-4 h-4" />
            Novo Cliente
          </Button>
        }
      />

      {/* Filtros e Busca */}
      <Card className="p-4">
        <form onSubmit={buscar} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[250px]">
            <Input
              placeholder="Buscar por nome ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFiltroAtivo('true')}
              className={`px-4 py-2 rounded-xl transition-colors ${
                filtroAtivo === 'true'
                  ? 'bg-quatrelati-gold-500/20 text-quatrelati-gold-600'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Ativos
            </button>
            <button
              type="button"
              onClick={() => setFiltroAtivo('false')}
              className={`px-4 py-2 rounded-xl transition-colors ${
                filtroAtivo === 'false'
                  ? 'bg-red-500/20 text-red-600'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Inativos
            </button>
          </div>
          <Button variant="secondary" type="submit">
            <Search className="w-4 h-4" />
            Buscar
          </Button>
        </form>
      </Card>

      {/* Grid de Clientes */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="skeleton-quatrelati h-6 w-3/4 mb-4" />
              <div className="skeleton-quatrelati h-4 w-full mb-2" />
              <div className="skeleton-quatrelati h-4 w-2/3" />
            </Card>
          ))}
        </div>
      ) : clientes.length === 0 ? (
        <Card className="p-12 text-center">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nenhum cliente encontrado</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientes.map((cliente) => (
            <Card
              key={cliente.id}
              className="p-6 cursor-pointer"
              onClick={() => verDetalhes(cliente)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {cliente.logo_url ? (
                    <img
                      src={cliente.logo_url}
                      alt={cliente.nome}
                      className="w-12 h-12 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-quatrelati-gold-500/20 flex items-center justify-center">
                      <User className="w-6 h-6 text-quatrelati-gold-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {cliente.nome}
                    </h3>
                    {cliente.cidade && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {cliente.cidade}{cliente.estado && ` - ${cliente.estado}`}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant={cliente.ativo ? 'success' : 'error'}>
                  {cliente.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {cliente.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{cliente.telefone}</span>
                  </div>
                )}
                {cliente.vendedor_nome && (
                  <div className="flex items-center gap-2">
                    <UserCircle className="w-4 h-4" />
                    <span className="truncate">{cliente.vendedor_nome}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <ShoppingCart className="w-4 h-4" />
                  <span>{cliente.total_pedidos || 0} pedidos</span>
                </div>
                <p className="font-semibold text-quatrelati-gold-600">
                  {formatCurrency(cliente.valor_total_pedidos || 0)}
                </p>
              </div>

              <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                {podeEditarCliente(cliente) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => abrirModal(cliente)}
                  >
                    <Edit2 className="w-4 h-4" />
                    Editar
                  </Button>
                )}
                {podeEditarCliente(cliente) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-500/10"
                    onClick={() => setDeleteConfirm(cliente)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Cliente */}
      <Modal
        isOpen={modalOpen}
        onClose={fecharModal}
        title={editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Dados Básicos */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Dados Básicos
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome (apelido)"
                placeholder="Nome curto / fantasia"
                error={errors.nome?.message}
                {...register('nome')}
              />
              <Input
                label="CNPJ/CPF"
                {...register('cnpj_cpf')}
              />
            </div>
            <Input
              label="Razão Social"
              placeholder="Razão social completa"
              {...register('razao_social')}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Telefone"
                placeholder="(11) 99999-9999"
                {...register('telefone')}
              />
              <Input
                label="Email"
                type="email"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Contato (Nome)"
                placeholder="Nome do responsável"
                {...register('contato_nome')}
              />
              {isAdmin && (
                <Select
                  label="Vendedor Responsável"
                  options={usuarios.filter(u => u.nivel === 'vendedor' || u.nivel === 'admin').map(u => ({
                    value: u.id,
                    label: u.nome
                  }))}
                  placeholder="Selecione..."
                  {...register('vendedor_id')}
                />
              )}
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Endereço
            </h4>
            <Input
              label="Endereço Principal"
              placeholder="Rua, número, bairro..."
              {...register('endereco')}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-2">
                <Input
                  label="Cidade"
                  {...register('cidade')}
                />
              </div>
              <Select
                label="UF"
                options={ESTADOS}
                {...register('estado')}
              />
              <Input
                label="CEP"
                placeholder="00000-000"
                {...register('cep')}
              />
            </div>
            <Input
              label="Endereço de Entrega (se diferente)"
              placeholder="Endereço completo para entregas..."
              {...register('endereco_entrega')}
            />
          </div>

          {/* Observações e Logo */}
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Observações
                </label>
                <textarea
                  className="input-glass resize-none w-full"
                  rows={4}
                  {...register('observacoes')}
                />
              </div>
              {/* Upload de Logo */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Logo
                </label>
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <div className="relative">
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="w-20 h-20 object-cover rounded-xl border border-gray-200 dark:border-gray-700"
                      />
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                      <Image className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="cursor-pointer">
                      <div className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors inline-flex items-center gap-2">
                        {uploadingLogo ? (
                          <>
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Enviar
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-1">Max 1MB</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={fecharModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editingCliente ? 'Salvar' : 'Criar Cliente'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Detalhes */}
      <Modal
        isOpen={!!detailsModal}
        onClose={() => setDetailsModal(null)}
        title="Detalhes do Cliente"
        size="lg"
      >
        {detailsModal && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {detailsModal.logo_url ? (
                <img
                  src={detailsModal.logo_url}
                  alt={detailsModal.nome}
                  className="w-16 h-16 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-quatrelati-gold-500/20 flex items-center justify-center">
                  <User className="w-8 h-8 text-quatrelati-gold-600" />
                </div>
              )}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {detailsModal.nome}
                </h3>
                {detailsModal.cnpj_cpf && (
                  <p className="text-gray-500">{detailsModal.cnpj_cpf}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {detailsModal.contato_nome && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <UserCircle className="w-4 h-4" />
                  <span>{detailsModal.contato_nome}</span>
                </div>
              )}
              {detailsModal.telefone && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Phone className="w-4 h-4" />
                  <span>{detailsModal.telefone}</span>
                </div>
              )}
              {detailsModal.email && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Mail className="w-4 h-4" />
                  <span>{detailsModal.email}</span>
                </div>
              )}
              {(detailsModal.cidade || detailsModal.estado) && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Building2 className="w-4 h-4" />
                  <span>{detailsModal.cidade}{detailsModal.estado && ` - ${detailsModal.estado}`}</span>
                </div>
              )}
            </div>

            {detailsModal.endereco && (
              <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4 mt-1" />
                <span>{detailsModal.endereco}</span>
              </div>
            )}

            {detailsModal.endereco_entrega && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Endereço de Entrega</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">{detailsModal.endereco_entrega}</p>
              </div>
            )}

            {detailsModal.vendedor_nome && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">Vendedor Responsável</p>
                <p className="text-sm text-green-600 dark:text-green-400">{detailsModal.vendedor_nome}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
              <div className="text-center">
                <p className="text-2xl font-bold text-quatrelati-gold-600">
                  {detailsModal.total_pedidos || 0}
                </p>
                <p className="text-sm text-gray-500">Pedidos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-quatrelati-blue-600">
                  {formatCurrency(detailsModal.valor_total_pedidos || 0)}
                </p>
                <p className="text-sm text-gray-500">Valor Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Intl.NumberFormat('pt-BR').format(detailsModal.peso_total_pedidos || 0)} kg
                </p>
                <p className="text-sm text-gray-500">Peso Total</p>
              </div>
            </div>

            {detailsModal.observacoes && (
              <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Observações
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {detailsModal.observacoes}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Tem certeza que deseja excluir o cliente <strong>{deleteConfirm?.nome}</strong>?
          {deleteConfirm?.total_pedidos > 0 && (
            <span className="block mt-2 text-amber-600">
              Este cliente possui {deleteConfirm.total_pedidos} pedido(s) e será desativado em vez de excluído.
            </span>
          )}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => excluirCliente(deleteConfirm?.id)}>
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  );
}
