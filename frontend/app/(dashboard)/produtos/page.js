'use client';

// =====================================================
// Página de Produtos
// v1.4.0 - Footer sticky no modal de formulário
// =====================================================

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Weight,
  DollarSign,
  ShoppingCart,
  Upload,
  X,
  ImageIcon,
} from 'lucide-react';
import api from '../../lib/api';
import { mascaraPeso, mascaraMoeda } from '../../lib/validations';
import Header from '../../components/layout/Header';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Loading from '../../components/ui/Loading';

const produtoSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  descricao: z.string().optional(),
  peso_caixa_kg: z.string().min(1, 'Peso é obrigatório'),
  preco_padrao: z.string().optional(),
});

export default function ProdutosPage() {
  const [loading, setLoading] = useState(true);
  const [produtos, setProdutos] = useState([]);
  const [search, setSearch] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('true');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [imagemUrl, setImagemUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(produtoSchema),
  });

  useEffect(() => {
    carregarProdutos();
  }, [filtroAtivo]);

  const carregarProdutos = async () => {
    setLoading(true);
    try {
      let url = `/produtos?ativo=${filtroAtivo}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await api.get(url);
      setProdutos(res.data.produtos);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const buscar = (e) => {
    e.preventDefault();
    carregarProdutos();
  };

  const abrirModal = (produto = null) => {
    // Formata número para formato brasileiro
    const formatBR = (valor, decimais = 2) => {
      if (!valor && valor !== 0) return '';
      return Number(valor).toLocaleString('pt-BR', {
        minimumFractionDigits: decimais,
        maximumFractionDigits: decimais,
      });
    };

    if (produto) {
      setEditingProduto(produto);
      setImagemUrl(produto.imagem_url || '');
      reset({
        nome: produto.nome || '',
        descricao: produto.descricao || '',
        peso_caixa_kg: formatBR(produto.peso_caixa_kg, 3),
        preco_padrao: formatBR(produto.preco_padrao, 2),
      });
    } else {
      setEditingProduto(null);
      setImagemUrl('');
      reset({
        nome: '',
        descricao: '',
        peso_caixa_kg: '',
        preco_padrao: '',
      });
    }
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setEditingProduto(null);
    setImagemUrl('');
    reset();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }

    // Validar tamanho (max 1MB)
    if (file.size > 1 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 1MB');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.upload('/upload/image', formData);
      setImagemUrl(response.data.url);
      toast.success('Imagem enviada com sucesso');
    } catch (error) {
      console.error('Erro ao enviar imagem:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploadingImage(false);
    }
  };

  const removerImagem = () => {
    setImagemUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      // Converte formato brasileiro (1.234,56) para número
      const parseBR = (valor) => {
        if (!valor) return null;
        return parseFloat(valor.replace(/\./g, '').replace(',', '.'));
      };

      const payload = {
        nome: data.nome,
        descricao: data.descricao || null,
        peso_caixa_kg: parseBR(data.peso_caixa_kg),
        preco_padrao: parseBR(data.preco_padrao),
        imagem_url: imagemUrl || null,
      };

      if (editingProduto) {
        await api.put(`/produtos/${editingProduto.id}`, payload);
        toast.success('Produto atualizado com sucesso');
      } else {
        await api.post('/produtos', payload);
        toast.success('Produto criado com sucesso');
      }

      fecharModal();
      carregarProdutos();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast.error(error.message || 'Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  };

  const excluirProduto = async (id) => {
    try {
      await api.delete(`/produtos/${id}`);
      toast.success('Produto excluído/desativado com sucesso');
      setDeleteConfirm(null);
      carregarProdutos();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast.error('Erro ao excluir produto');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  return (
    <div className="p-6 space-y-6">
      <Header
        title="Produtos"
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button onClick={() => abrirModal()} className="!px-2 sm:!px-4">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Novo Produto</span>
            </Button>
          </div>
        }
      />

      {/* Filtros e Busca */}
      <Card className="p-4">
        <form onSubmit={buscar} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[250px]">
            <Input
              placeholder="Buscar por nome..."
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

      {/* Grid de Produtos */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="skeleton-quatrelati h-6 w-3/4 mb-4" />
              <div className="skeleton-quatrelati h-4 w-full mb-2" />
              <div className="skeleton-quatrelati h-4 w-2/3" />
            </Card>
          ))}
        </div>
      ) : produtos.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nenhum produto encontrado</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {produtos.map((produto) => (
            <Card key={produto.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                {produto.imagem_url ? (
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                      src={produto.imagem_url}
                      alt={produto.nome}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-quatrelati-blue-500/20 flex items-center justify-center">
                    <Package className="w-8 h-8 text-quatrelati-blue-600" />
                  </div>
                )}
                <Badge variant={produto.ativo ? 'success' : 'error'}>
                  {produto.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {produto.nome}
              </h3>

              {produto.descricao && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                  {produto.descricao}
                </p>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Weight className="w-4 h-4" />
                    <span>Peso/Caixa</span>
                  </div>
                  <span className="font-medium">{formatNumber(produto.peso_caixa_kg)} kg</span>
                </div>
                {produto.preco_padrao && (
                  <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <span>Preço/kg</span>
                    </div>
                    <span className="font-medium">{formatCurrency(produto.preco_padrao)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <ShoppingCart className="w-4 h-4" />
                  <span>{produto.total_pedidos || 0} pedidos</span>
                </div>
                <p className="font-semibold text-quatrelati-gold-600">
                  {formatNumber(produto.total_caixas_vendidas || 0)} cx
                </p>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => abrirModal(produto)}
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-500/10"
                  onClick={() => setDeleteConfirm(produto)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Produto */}
      <Modal
        isOpen={modalOpen}
        onClose={fecharModal}
        title={editingProduto ? 'Editar Produto' : 'Novo Produto'}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={fecharModal}>
              Cancelar
            </Button>
            <Button type="submit" form="produto-form" loading={saving}>
              {editingProduto ? 'Salvar' : 'Criar Produto'}
            </Button>
          </div>
        }
      >
        <form id="produto-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Upload de Imagem */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Imagem do Produto
            </label>
            <div className="flex items-start gap-4">
              {imagemUrl ? (
                <div className="relative">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                      src={imagemUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={removerImagem}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-quatrelati-blue-500 hover:bg-quatrelati-blue-50 dark:hover:bg-quatrelati-blue-900/20 transition-colors"
                >
                  {uploadingImage ? (
                    <div className="w-6 h-6 border-2 border-quatrelati-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">Upload</span>
                    </>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="flex-1 text-sm text-gray-500 dark:text-gray-400">
                <p>Clique para selecionar uma imagem</p>
                <p className="text-xs mt-1">JPG, PNG ou GIF. Máximo 1MB.</p>
              </div>
            </div>
          </div>

          <Input
            label="Nome"
            error={errors.nome?.message}
            required
            {...register('nome')}
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Descrição
            </label>
            <textarea
              className="input-glass resize-none w-full"
              rows={3}
              {...register('descricao')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Peso por Caixa (kg)"
              placeholder="0,000"
              error={errors.peso_caixa_kg?.message}
              required
              value={watch('peso_caixa_kg') || ''}
              onChange={(e) => setValue('peso_caixa_kg', mascaraPeso(e.target.value))}
            />
            <Input
              label="Preço Padrão (R$/kg)"
              placeholder="0,00"
              value={watch('preco_padrao') || ''}
              onChange={(e) => setValue('preco_padrao', mascaraMoeda(e.target.value))}
            />
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Tem certeza que deseja excluir/desativar o produto <strong>{deleteConfirm?.nome}</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => excluirProduto(deleteConfirm?.id)}>
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  );
}
