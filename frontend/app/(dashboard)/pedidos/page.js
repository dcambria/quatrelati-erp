'use client';
// =====================================================
// Pagina de Gestao de Pedidos
// v1.3.1 - Efeito de clique nos botões (active:scale-90)
//          status corrigida, contador atrasados no card
// =====================================================

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Filter,
  Download,
  Printer,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
  Undo2,
  ArrowUpDown,
  Package,
  Star,
  Award,
  Circle,
  Cookie,
  User,
  CalendarDays,
  FileText,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useVendedorFilter } from '../../contexts/VendedorFilterContext';
import Header from '../../components/layout/Header';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Loading, { TableSkeleton } from '../../components/ui/Loading';
import Gravatar from '../../components/ui/Gravatar';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const pedidoSchema = z.object({
  data_pedido: z.string().min(1, 'Data é obrigatória'),
  cliente_id: z.string().min(1, 'Cliente é obrigatório'),
  data_entrega: z.string().optional(),
  nf: z.string().optional(),
  observacoes: z.string().optional(),
  preco_descarga_pallet: z.string().optional(),
  horario_recebimento: z.string().optional(),
});

export default function PedidosPage() {
  const { isAdmin, canEdit, canViewAll, isVendedor, user } = useAuth();
  const { vendedorId: vendedorGlobal } = useVendedorFilter();
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState([]);
  const [totais, setTotais] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [busca, setBusca] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPedido, setEditingPedido] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [revertConfirm, setRevertConfirm] = useState(null);
  const [ordenacao, setOrdenacao] = useState({ coluna: 'numero_pedido', direcao: 'asc' });
  const [itens, setItens] = useState([{ produto_id: '', quantidade_caixas: '', preco_unitario: '' }]);
  const [expandedPedido, setExpandedPedido] = useState(null);
  const [allExpanded, setAllExpanded] = useState(false);
  const [vendedorSelecionado, setVendedorSelecionado] = useState('');
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfVendedorId, setPdfVendedorId] = useState('');
  const [pdfMode, setPdfMode] = useState('download'); // 'download' ou 'print'

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(pedidoSchema),
  });

  useEffect(() => {
    carregarClientes();
    carregarProdutos();
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      const res = await api.get('/usuarios');
      setUsuarios(res.data.usuarios || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  useEffect(() => {
    carregarPedidos();
  }, [mes, ano, filtroStatus, filtroCliente, vendedorGlobal]);

  const carregarClientes = async () => {
    try {
      const res = await api.get('/clientes?ativo=true');
      setClientes(res.data.clientes);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const carregarProdutos = async () => {
    try {
      const res = await api.get('/produtos?ativo=true');
      setProdutos(res.data.produtos);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const carregarPedidos = async () => {
    setLoading(true);
    try {
      let url = `/pedidos?mes=${mes}&ano=${ano}`;
      if (filtroStatus !== 'todos') url += `&status=${filtroStatus}`;
      if (filtroCliente) url += `&cliente_id=${filtroCliente}`;
      if (vendedorGlobal) url += `&vendedor_id=${vendedorGlobal}`;

      const res = await api.get(url);
      setPedidos(res.data.pedidos);
      setTotais(res.data.totais);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const navegarMes = (direcao) => {
    let novoMes = mes + direcao;
    let novoAno = ano;

    if (novoMes > 12) {
      novoMes = 1;
      novoAno++;
    } else if (novoMes < 1) {
      novoMes = 12;
      novoAno--;
    }

    setMes(novoMes);
    setAno(novoAno);
  };

  const voltarMesAtual = () => {
    const hoje = new Date();
    setMes(hoje.getMonth() + 1);
    setAno(hoje.getFullYear());
  };

  const isCurrentMonth = () => {
    const hoje = new Date();
    return mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();
  };

  const abrirModal = async (pedido = null) => {
    if (pedido) {
      setEditingPedido(pedido);
      setVendedorSelecionado(pedido.created_by?.toString() || '');
      reset({
        data_pedido: pedido.data_pedido?.split('T')[0] || '',
        cliente_id: pedido.cliente_id?.toString() || '',
        data_entrega: pedido.data_entrega?.split('T')[0] || '',
        nf: pedido.nf || '',
        observacoes: pedido.observacoes || '',
        preco_descarga_pallet: pedido.preco_descarga_pallet?.toString() || '',
        horario_recebimento: pedido.horario_recebimento || '',
      });
      // Carregar itens do pedido
      try {
        const response = await api.get(`/pedidos/${pedido.id}`);
        const pedidoData = response.data?.pedido || response.pedido;
        if (pedidoData?.itens?.length > 0) {
          setItens(pedidoData.itens.map(item => ({
            produto_id: item.produto_id?.toString() || '',
            quantidade_caixas: item.quantidade_caixas?.toString() || '',
            preco_unitario: item.preco_unitario?.toString() || '',
          })));
          // Atualizar vendedor do pedido carregado
          if (pedidoData.created_by) {
            setVendedorSelecionado(pedidoData.created_by.toString());
          }
        } else if (pedido.itens?.length > 0) {
          setItens(pedido.itens.map(item => ({
            produto_id: item.produto_id?.toString() || '',
            quantidade_caixas: item.quantidade_caixas?.toString() || '',
            preco_unitario: item.preco_unitario?.toString() || '',
          })));
        } else {
          setItens([{
            produto_id: pedido.produto_id?.toString() || '',
            quantidade_caixas: pedido.quantidade_caixas?.toString() || '',
            preco_unitario: pedido.preco_unitario?.toString() || '',
          }]);
        }
      } catch (error) {
        // Tentar usar itens do pedido da lista
        if (pedido.itens?.length > 0) {
          setItens(pedido.itens.map(item => ({
            produto_id: item.produto_id?.toString() || '',
            quantidade_caixas: item.quantidade_caixas?.toString() || '',
            preco_unitario: item.preco_unitario?.toString() || '',
          })));
        } else {
          setItens([{
            produto_id: pedido.produto_id?.toString() || '',
            quantidade_caixas: pedido.quantidade_caixas?.toString() || '',
            preco_unitario: pedido.preco_unitario?.toString() || '',
          }]);
        }
      }
    } else {
      setEditingPedido(null);
      setVendedorSelecionado('');
      reset({
        data_pedido: new Date().toISOString().split('T')[0],
        cliente_id: '',
        data_entrega: '',
        nf: '',
        observacoes: '',
        preco_descarga_pallet: '',
        horario_recebimento: '',
      });
      setItens([{ produto_id: '', quantidade_caixas: '', preco_unitario: '' }]);
    }
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setEditingPedido(null);
    setItens([{ produto_id: '', quantidade_caixas: '', preco_unitario: '' }]);
    setVendedorSelecionado('');
    reset();
  };

  // Funções para gerenciar itens do pedido
  const adicionarItem = () => {
    setItens([...itens, { produto_id: '', quantidade_caixas: '', preco_unitario: '' }]);
  };

  const removerItem = (index) => {
    if (itens.length > 1) {
      setItens(itens.filter((_, i) => i !== index));
    }
  };

  const atualizarItem = (index, campo, valor) => {
    const novosItens = [...itens];
    novosItens[index][campo] = valor;

    // Se mudou o produto, sugerir preço padrão
    if (campo === 'produto_id' && valor) {
      const produto = produtos.find(p => p.id === parseInt(valor));
      if (produto && produto.preco_padrao && !novosItens[index].preco_unitario) {
        novosItens[index].preco_unitario = produto.preco_padrao.toString();
      }
    }

    setItens(novosItens);
  };

  // Calcular total do pedido
  const calcularTotalPedido = () => {
    return itens.reduce((total, item) => {
      if (!item.produto_id || !item.quantidade_caixas || !item.preco_unitario) return total;
      const produto = produtos.find(p => p.id === parseInt(item.produto_id));
      if (!produto) return total;
      const peso = parseFloat(produto.peso_caixa_kg) * parseInt(item.quantidade_caixas);
      return total + (peso * parseFloat(item.preco_unitario));
    }, 0);
  };

  const onSubmit = async (data) => {
    // Validar itens
    const itensValidos = itens.filter(item =>
      item.produto_id && item.quantidade_caixas && item.preco_unitario
    );

    if (itensValidos.length === 0) {
      toast.error('Adicione pelo menos um produto ao pedido');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        data_pedido: data.data_pedido,
        cliente_id: parseInt(data.cliente_id),
        data_entrega: data.data_entrega || null,
        nf: data.nf || null,
        observacoes: data.observacoes || null,
        preco_descarga_pallet: data.preco_descarga_pallet ? parseFloat(data.preco_descarga_pallet) : null,
        horario_recebimento: data.horario_recebimento || null,
        itens: itensValidos.map(item => ({
          produto_id: parseInt(item.produto_id),
          quantidade_caixas: parseInt(item.quantidade_caixas),
          preco_unitario: parseFloat(item.preco_unitario),
        })),
      };

      // Incluir vendedor se selecionado (apenas na edição)
      if (editingPedido && vendedorSelecionado) {
        payload.created_by = parseInt(vendedorSelecionado);
      }

      if (editingPedido) {
        await api.put(`/pedidos/${editingPedido.id}`, payload);
        toast.success('Pedido atualizado com sucesso');
      } else {
        await api.post('/pedidos', payload);
        toast.success('Pedido criado com sucesso');
      }

      fecharModal();
      carregarPedidos();
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
      toast.error(error.message || 'Erro ao salvar pedido');
    } finally {
      setSaving(false);
    }
  };

  const marcarEntregue = async (pedido) => {
    try {
      await api.patch(`/pedidos/${pedido.id}/entregar`, {
        data_entrega_real: new Date().toISOString().split('T')[0],
      });
      // Atualizar estado local sem recarregar toda a lista
      setPedidos(prev => prev.map(p =>
        p.id === pedido.id ? { ...p, entregue: true } : p
      ));
      toast.success('Pedido marcado como entregue');
    } catch (error) {
      console.error('Erro ao marcar como entregue:', error);
      toast.error('Erro ao atualizar pedido');
    }
  };

  const reverterEntrega = async (id) => {
    try {
      await api.patch(`/pedidos/${id}/reverter-entrega`);
      // Atualizar estado local sem recarregar toda a lista
      setPedidos(prev => prev.map(p =>
        p.id === id ? { ...p, entregue: false } : p
      ));
      toast.success('Entrega revertida para pendente');
      setRevertConfirm(null);
    } catch (error) {
      console.error('Erro ao reverter entrega:', error);
      toast.error('Erro ao reverter entrega');
    }
  };

  const excluirPedido = async (id) => {
    try {
      await api.delete(`/pedidos/${id}`);
      // Remover do estado local sem recarregar toda a lista
      setPedidos(prev => prev.filter(p => p.id !== id));
      toast.success('Pedido excluído com sucesso');
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Erro ao excluir pedido:', error);
      toast.error('Erro ao excluir pedido');
    }
  };

  // Abrir modal de seleção de vendedor (para admins/visualizadores) ou exportar direto (para vendedores)
  const handleExportarPDF = (mode = 'download') => {
    if (canViewAll) {
      setPdfMode(mode);
      setPdfVendedorId('');
      setPdfModalOpen(true);
    } else {
      // Vendedor exporta direto seus próprios pedidos
      if (mode === 'download') {
        exportarPDF();
      } else {
        imprimir();
      }
    }
  };

  const exportarPDF = async (vendedorId = null, ignorarFiltroGlobal = false) => {
    try {
      let url = `/pedidos/exportar/pdf?mes=${mes}&ano=${ano}`;
      if (filtroStatus !== 'todos') url += `&status=${filtroStatus}`;
      if (filtroCliente) url += `&cliente_id=${filtroCliente}`;
      // Se vendedorId foi passado, usa ele; se não e não ignorar filtro global, usa o global
      if (vendedorId) {
        url += `&vendedor_id=${vendedorId}`;
      } else if (!ignorarFiltroGlobal && vendedorGlobal) {
        url += `&vendedor_id=${vendedorGlobal}`;
      }

      await api.download(url, `pedidos-${ano}-${mes.toString().padStart(2, '0')}.pdf`);
      toast.success('PDF gerado com sucesso');
      setPdfModalOpen(false);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const imprimir = async (vendedorId = null, ignorarFiltroGlobal = false) => {
    try {
      let url = `/pedidos/exportar/pdf?mes=${mes}&ano=${ano}`;
      if (filtroStatus !== 'todos') url += `&status=${filtroStatus}`;
      if (filtroCliente) url += `&cliente_id=${filtroCliente}`;
      if (vendedorId) {
        url += `&vendedor_id=${vendedorId}`;
      } else if (!ignorarFiltroGlobal && vendedorGlobal) {
        url += `&vendedor_id=${vendedorGlobal}`;
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${API_URL}${url}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erro ao gerar PDF');

      const blob = await response.blob();
      const pdfUrl = window.URL.createObjectURL(blob);

      // Abrir PDF em nova janela e imprimir
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };
      }
      setPdfModalOpen(false);
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      toast.error('Erro ao gerar PDF para impressão');
    }
  };

  const confirmarExportarPDF = () => {
    // Se pdfVendedorId é vazio, significa "Todos os vendedores" - ignorar filtro global
    const ignorarFiltroGlobal = pdfVendedorId === '';
    if (pdfMode === 'download') {
      exportarPDF(pdfVendedorId || null, ignorarFiltroGlobal);
    } else {
      imprimir(pdfVendedorId || null, ignorarFiltroGlobal);
    }
  };

  // Baixar PDF individual do pedido
  const baixarPDFPedido = async (pedido) => {
    try {
      await api.download(`/pedidos/${pedido.id}/pdf`, `pedido-${pedido.numero_pedido}.pdf`);
      toast.success('PDF do pedido gerado com sucesso');
    } catch (error) {
      console.error('Erro ao gerar PDF do pedido:', error);
      toast.error('Erro ao gerar PDF do pedido');
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

  // Formata data sem problemas de timezone
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  // Retorna ícone do produto baseado na descrição
  const IconeProduto = ({ nome }) => {
    const nomeLower = nome?.toLowerCase() || '';

    // Verifica o tipo de embalagem
    const isPote = nomeLower.includes('pote');
    const isBloco = nomeLower.includes('bloco');

    // Verifica a qualidade
    const isExtra = nomeLower.includes('extra');
    const isPrimeira = nomeLower.includes('primeira');

    // Define cor baseada na qualidade
    let corClasse = 'text-gray-500'; // Comum
    if (isExtra) corClasse = 'text-amber-500';
    if (isPrimeira) corClasse = 'text-blue-500';

    // Retorna ícone baseado no tipo
    if (isPote) {
      return <Cookie className={`w-4 h-4 ${corClasse}`} />;
    }

    // Bloco com indicador de qualidade
    if (isExtra) {
      return (
        <div className="relative">
          <Package className={`w-4 h-4 ${corClasse}`} />
          <Award className="w-2.5 h-2.5 text-amber-500 absolute -top-1 -right-1" />
        </div>
      );
    }

    if (isPrimeira) {
      return (
        <div className="relative">
          <Package className={`w-4 h-4 ${corClasse}`} />
          <Star className="w-2.5 h-2.5 text-blue-500 absolute -top-1 -right-1" />
        </div>
      );
    }

    // Comum (padrão)
    return <Package className={`w-4 h-4 ${corClasse}`} />;
  };

  // Alterna ordenação ao clicar no cabeçalho
  const alternarOrdenacao = (coluna) => {
    setOrdenacao((prev) => ({
      coluna,
      direcao: prev.coluna === coluna && prev.direcao === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Ícone de ordenação
  const IconeOrdenacao = ({ coluna }) => {
    if (ordenacao.coluna !== coluna) {
      return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    }
    return ordenacao.direcao === 'asc'
      ? <ChevronUp className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3" />;
  };

  // Filtra e ordena pedidos
  const pedidosFiltrados = pedidos
    .filter((pedido) => {
      if (!busca.trim()) return true;
      const termo = busca.toLowerCase();
      return (
        pedido.numero_pedido?.toLowerCase().includes(termo) ||
        pedido.cliente_nome?.toLowerCase().includes(termo) ||
        pedido.produto_nome?.toLowerCase().includes(termo) ||
        pedido.vendedor_nome?.toLowerCase().includes(termo) ||
        pedido.nf?.toLowerCase().includes(termo)
      );
    })
    .sort((a, b) => {
      const { coluna, direcao } = ordenacao;
      let valorA = a[coluna];
      let valorB = b[coluna];

      // Tratamento para diferentes tipos de dados
      if (coluna === 'quantidade_caixas' || coluna === 'peso_kg' || coluna === 'preco_unitario' || coluna === 'total') {
        valorA = parseFloat(valorA) || 0;
        valorB = parseFloat(valorB) || 0;
      } else if (coluna === 'data_pedido' || coluna === 'data_entrega') {
        valorA = valorA ? new Date(valorA) : new Date(0);
        valorB = valorB ? new Date(valorB) : new Date(0);
      } else if (coluna === 'entregue') {
        // Ordenar por status: Atrasado (0) < Pendente (1) < Entregue (2)
        const hoje = new Date(new Date().toDateString());
        const isAtrasadoA = !a.entregue && a.data_entrega && new Date(a.data_entrega) < hoje;
        const isAtrasadoB = !b.entregue && b.data_entrega && new Date(b.data_entrega) < hoje;
        valorA = a.entregue ? 2 : isAtrasadoA ? 0 : 1;
        valorB = b.entregue ? 2 : isAtrasadoB ? 0 : 1;
      } else {
        valorA = (valorA || '').toString().toLowerCase();
        valorB = (valorB || '').toString().toLowerCase();
      }

      if (valorA < valorB) return direcao === 'asc' ? -1 : 1;
      if (valorA > valorB) return direcao === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="p-6 space-y-6">
      <Header
        title="Pedidos"
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Navegação de mês */}
            <div className="flex items-center gap-1">
              <div className="flex items-center bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-xl p-1">
                <button
                  onClick={() => navegarMes(-1)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <span className="px-2 sm:px-4 font-medium text-gray-900 dark:text-white text-sm sm:text-base whitespace-nowrap">
                  {MESES[mes - 1]} {ano}
                </span>
                <button
                  onClick={() => navegarMes(1)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label="Próximo mês"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              {!isCurrentMonth() && (
                <button
                  onClick={voltarMesAtual}
                  className="p-2 bg-quatrelati-blue-100 dark:bg-quatrelati-gold-900/30 hover:bg-quatrelati-blue-200 dark:hover:bg-quatrelati-gold-900/50 text-quatrelati-blue-700 dark:text-quatrelati-gold-300 rounded-lg transition-colors"
                  aria-label="Voltar ao mês atual"
                  title="Voltar ao mês atual"
                >
                  <CalendarDays className="w-5 h-5" />
                </button>
              )}
            </div>
            {/* Botões de ação */}
            <Button variant="ghost" onClick={() => setShowFilters(!showFilters)} className="!px-2 sm:!px-4">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Filtros</span>
            </Button>
            <Button variant="secondary" onClick={() => handleExportarPDF('download')} className="!px-2 sm:!px-4">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">PDF</span>
            </Button>
            {canEdit && (
              <Button onClick={() => abrirModal()} className="!px-2 sm:!px-4">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Novo Pedido</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Filtros */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              label="Status"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'pendente', label: 'Pendentes' },
                { value: 'entregue', label: 'Entregues' },
              ]}
              placeholder="Todos"
            />
            <Select
              label="Cliente"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              options={clientes.map(c => ({ value: c.id, label: c.nome }))}
              placeholder="Todos os clientes"
            />
          </div>
        </Card>
      )}

      {/* Container principal - cards e tabela alinhados */}
      <div className="space-y-4">
        {/* Resumo por Status */}
        {totais && (() => {
          const hoje = new Date(new Date().toDateString());
          const atrasados = pedidos.filter(p => !p.entregue && p.data_entrega && new Date(p.data_entrega) < hoje).length;
          return (
          <div className="grid grid-cols-2 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
            {/* Card A Entregar */}
            <div className="bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  A Entregar
                </h3>
                {atrasados > 0 && (
                  <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded">
                    {atrasados} atrasado{atrasados > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-6">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Peso</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatNumber(totais.peso_pendente || 0)} kg
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Caixas</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatNumber(totais.unidades_pendente || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total</p>
                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {formatCurrency(totais.valor_pendente || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Pedidos</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {totais.pendentes || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Card Entregue */}
            <div className="bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Entregue
                </h3>
              </div>
              <div className="grid grid-cols-4 gap-6">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Peso</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatNumber(totais.peso_entregue || 0)} kg
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Caixas</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatNumber(totais.unidades_entregue || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total</p>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(totais.valor_entregue || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Pedidos</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {totais.entregues || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
          );
        })()}

        {/* Busca Rápida */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar pedido, cliente, produto ou NF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-quatrelati-blue-500/20 focus:border-quatrelati-blue-500"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Tabela */}
        {loading ? (
          <TableSkeleton rows={10} cols={10} />
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-420px)] min-h-[300px]">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="text-xs text-white uppercase tracking-wider bg-quatrelati-blue-800 dark:bg-quatrelati-blue-900">
                    <th className="w-8 py-3 px-2">
                      <button
                        onClick={() => setAllExpanded(!allExpanded)}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                        title={allExpanded ? 'Recolher todos' : 'Expandir todos'}
                      >
                        {allExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </th>
                    <th onClick={() => alternarOrdenacao('numero_pedido')} className="py-3 px-3 text-left cursor-pointer hover:bg-white/10">
                      <div className="flex items-center gap-1">Pedido <IconeOrdenacao coluna="numero_pedido" /></div>
                    </th>
                    <th onClick={() => alternarOrdenacao('data_pedido')} className="py-3 px-3 text-left cursor-pointer hover:bg-white/10">
                      <div className="flex items-center gap-1">Data <IconeOrdenacao coluna="data_pedido" /></div>
                    </th>
                    <th onClick={() => alternarOrdenacao('cliente_nome')} className="py-3 px-3 text-left cursor-pointer hover:bg-white/10">
                      <div className="flex items-center gap-1">Cliente <IconeOrdenacao coluna="cliente_nome" /></div>
                    </th>
                    <th className="py-3 px-3 text-left">N.F.</th>
                    <th onClick={() => alternarOrdenacao('peso_kg')} className="py-3 px-3 text-right cursor-pointer hover:bg-white/10">
                      <div className="flex items-center justify-end gap-1">Peso <IconeOrdenacao coluna="peso_kg" /></div>
                    </th>
                    <th onClick={() => alternarOrdenacao('quantidade_caixas')} className="py-3 px-3 text-right cursor-pointer hover:bg-white/10">
                      <div className="flex items-center justify-end gap-1">Cx <IconeOrdenacao coluna="quantidade_caixas" /></div>
                    </th>
                    <th onClick={() => alternarOrdenacao('preco_unitario')} className="py-3 px-3 text-right cursor-pointer hover:bg-white/10">
                      <div className="flex items-center justify-end gap-1">R$ Unit. Méd. <IconeOrdenacao coluna="preco_unitario" /></div>
                    </th>
                    <th onClick={() => alternarOrdenacao('total')} className="py-3 px-3 text-right cursor-pointer hover:bg-white/10">
                      <div className="flex items-center justify-end gap-1">Total <IconeOrdenacao coluna="total" /></div>
                    </th>
                    <th onClick={() => alternarOrdenacao('data_entrega')} className="py-3 px-3 text-center cursor-pointer hover:bg-white/10">
                      <div className="flex items-center justify-center gap-1">Entrega <IconeOrdenacao coluna="data_entrega" /></div>
                    </th>
                    <th onClick={() => alternarOrdenacao('entregue')} className="py-3 px-3 text-center cursor-pointer hover:bg-white/10">
                      <div className="flex items-center justify-center gap-1">Status <IconeOrdenacao coluna="entregue" /></div>
                    </th>
                  </tr>
                </thead>
              {pedidosFiltrados.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={11} className="text-center py-12 text-gray-400">
                      {busca ? 'Nenhum pedido encontrado para esta busca' : 'Nenhum pedido neste período'}
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody>
                  {pedidosFiltrados.map((pedido, index) => {
                    const isExpanded = allExpanded || expandedPedido === pedido.id;
                    const hasItens = pedido.itens && pedido.itens.length > 0;
                    const hasObs = !!pedido.observacoes;
                    const isFirst = index === 0;
                    const isAtrasado = !pedido.entregue && pedido.data_entrega && new Date(pedido.data_entrega) < new Date(new Date().toDateString());
                    const borderColor = pedido.entregue ? 'border-l-green-500' : isAtrasado ? 'border-l-red-500' : 'border-l-amber-500';
                    return (
                      <React.Fragment key={pedido.id}>
                        {/* Espaçador entre pedidos */}
                        {!isFirst && (
                          <tr>
                            <td colSpan={11} className="h-2 bg-gray-100 dark:bg-gray-800"></td>
                          </tr>
                        )}

                        {/* Linha principal do pedido */}
                        <tr
                          className={`text-sm cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isExpanded ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-white dark:bg-gray-900'}`}
                          onClick={() => {
                            if (allExpanded) {
                              setAllExpanded(false);
                              setExpandedPedido(pedido.id);
                            } else {
                              setExpandedPedido(isExpanded ? null : pedido.id);
                            }
                          }}
                        >
                          <td className={`py-3 px-2 text-center border-l-4 ${borderColor}`}>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-blue-500 mx-auto" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-300 mx-auto" />
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-mono font-semibold text-gray-900 dark:text-white">#{pedido.numero_pedido}</div>
                            {hasItens && !isExpanded && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedPedido(pedido.id);
                                  setAllExpanded(false);
                                }}
                                className="text-[10px] text-blue-400 hover:text-blue-500 flex items-center gap-0.5 mt-0.5"
                              >
                                Ver produtos <ChevronDown className="w-3 h-3" />
                              </button>
                            )}
                            {hasItens && isExpanded && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedPedido(null);
                                }}
                                className="text-[10px] text-blue-500 flex items-center gap-0.5 mt-0.5"
                              >
                                Ocultar <ChevronUp className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-3 text-gray-500">{formatDate(pedido.data_pedido)}</td>
                          <td className="py-3 px-3 font-medium text-gray-900 dark:text-white truncate max-w-[200px]" title={pedido.cliente_nome}>
                            {pedido.cliente_nome}
                          </td>
                          <td className="py-3 px-3 text-gray-400">{pedido.nf || '-'}</td>
                          <td className="py-3 px-3 text-right tabular-nums text-gray-600 dark:text-gray-400">{formatNumber(pedido.peso_kg)} kg</td>
                          <td className="py-3 px-3 text-right tabular-nums text-gray-600 dark:text-gray-400">{formatNumber(pedido.quantidade_caixas)}</td>
                          <td className="py-3 px-3 text-right tabular-nums text-gray-600 dark:text-gray-400">{pedido.preco_unitario ? parseFloat(pedido.preco_unitario).toFixed(2) : '-'}</td>
                          <td className="py-3 px-3 text-right tabular-nums font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(pedido.total)}
                          </td>
                          <td className="py-3 px-3 text-center text-gray-500">{formatDate(pedido.data_entrega)}</td>
                          <td className="py-3 px-3 text-center">
                            {pedido.entregue ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                Entregue
                              </span>
                            ) : isAtrasado ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                Atrasado
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                Pendente
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Linha de detalhes (vendedor + obs + ações) */}
                        <tr className={`text-xs ${isExpanded ? 'bg-blue-50/30 dark:bg-blue-900/5' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                          <td className={`py-2 px-2 border-l-4 ${borderColor}`}></td>
                          <td colSpan={6} className="py-2 px-3">
                            <div className="flex items-center gap-6 text-gray-500">
                              <div className="flex items-center gap-2">
                                <Gravatar
                                  email={pedido.vendedor_email || ''}
                                  name={pedido.vendedor_nome || 'Vendedor'}
                                  size={20}
                                  className="rounded-full"
                                />
                                <span>
                                  <span className="text-gray-400">Vendedor:</span> {pedido.vendedor_nome || '-'}
                                </span>
                              </div>
                              {hasObs && (
                                <span className="text-amber-600 dark:text-amber-400">
                                  <span className="font-medium">Obs:</span> <span className="italic">{pedido.observacoes}</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td colSpan={4} className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <div className="relative group/tip">
                                <button
                                  onClick={() => baixarPDFPedido(pedido)}
                                  className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition-all active:scale-90"
                                >
                                  <FileText className="w-4 h-4 text-purple-500 group-hover/tip:text-purple-600" />
                                </button>
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-[10px] font-medium text-white bg-gray-800 dark:bg-gray-700 rounded whitespace-nowrap opacity-0 group-hover/tip:opacity-100 pointer-events-none z-50">
                                  Baixar PDF
                                </span>
                              </div>
                              {canEdit && (
                                <>
                                  {!pedido.entregue ? (
                                    <div className="relative group/tip">
                                      <button
                                        onClick={() => marcarEntregue(pedido)}
                                        className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-all active:scale-90"
                                      >
                                        <Check className="w-4 h-4 text-green-500 group-hover/tip:text-green-600" />
                                      </button>
                                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-[10px] font-medium text-white bg-gray-800 dark:bg-gray-700 rounded whitespace-nowrap opacity-0 group-hover/tip:opacity-100 pointer-events-none z-50">
                                        Marcar entregue
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="relative group/tip">
                                      <button
                                        onClick={() => setRevertConfirm(pedido)}
                                        className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded transition-all active:scale-90"
                                      >
                                        <Undo2 className="w-4 h-4 text-amber-500 group-hover/tip:text-amber-600" />
                                      </button>
                                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-[10px] font-medium text-white bg-gray-800 dark:bg-gray-700 rounded whitespace-nowrap opacity-0 group-hover/tip:opacity-100 pointer-events-none z-50">
                                        Reverter pendente
                                      </span>
                                    </div>
                                  )}
                                  <div className="relative group/tip">
                                    <button
                                      onClick={() => abrirModal(pedido)}
                                      className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-all active:scale-90"
                                    >
                                      <Edit2 className="w-4 h-4 text-blue-500 group-hover/tip:text-blue-600" />
                                    </button>
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-[10px] font-medium text-white bg-gray-800 dark:bg-gray-700 rounded whitespace-nowrap opacity-0 group-hover/tip:opacity-100 pointer-events-none z-50">
                                      Editar
                                    </span>
                                  </div>
                                  <div className="relative group/tip">
                                    <button
                                      onClick={() => setDeleteConfirm(pedido)}
                                      className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all active:scale-90"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-500 group-hover/tip:text-red-600" />
                                    </button>
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-[10px] font-medium text-white bg-gray-800 dark:bg-gray-700 rounded whitespace-nowrap opacity-0 group-hover/tip:opacity-100 pointer-events-none z-50">
                                      Excluir
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Linha expandida com produtos */}
                        {isExpanded && hasItens && (
                          <tr>
                            <td className={`p-0 border-l-4 ${borderColor}`}></td>
                            <td colSpan={10} className="p-0">
                              <div className="mx-3 my-3 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-800/30 border border-gray-200/80 dark:border-gray-700/50 overflow-hidden">
                                {/* Header da lista de produtos */}
                                <div className="px-4 py-2 bg-gray-100/80 dark:bg-gray-800/80 border-b border-gray-200/50 dark:border-gray-700/50">
                                  <div className="flex items-center gap-2">
                                    <Package className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                      Produtos do Pedido ({pedido.itens.length} {pedido.itens.length === 1 ? 'item' : 'itens'})
                                    </span>
                                  </div>
                                </div>
                                {/* Lista de produtos */}
                                <div className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                                  {pedido.itens.map((item, idx) => (
                                    <div
                                      key={`${pedido.id}-item-${idx}`}
                                      className="flex items-center justify-between px-4 py-2.5 hover:bg-white/50 dark:hover:bg-gray-700/30 transition-colors"
                                    >
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                                          <IconeProduto nome={item.produto_nome} />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.produto_nome}</p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatNumber(item.quantidade_caixas)} cx · {formatNumber(item.peso_kg)} kg · R$ {parseFloat(item.preco_unitario).toFixed(2)}/kg
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex-shrink-0 text-right ml-4">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                                          {formatCurrency(item.subtotal)}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {/* Rodapé com total */}
                                <div className="px-4 py-2.5 bg-gray-100/80 dark:bg-gray-800/80 border-t border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Total: {formatNumber(pedido.peso_kg)} kg em {formatNumber(pedido.quantidade_caixas)} caixas
                                  </span>
                                  <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                                    {formatCurrency(pedido.total)}
                                  </span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Borda inferior do bloco */}
                        <tr>
                          <td colSpan={11} className="h-px bg-gray-200 dark:bg-gray-700"></td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              )}
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Pedido */}
      <Modal
        isOpen={modalOpen}
        onClose={fecharModal}
        title={editingPedido ? 'Editar Pedido' : 'Novo Pedido'}
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Linha 1: Datas */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data do Pedido"
              type="date"
              error={errors.data_pedido?.message}
              {...register('data_pedido')}
            />
            <Input
              label="Data de Entrega"
              type="date"
              error={errors.data_entrega?.message}
              {...register('data_entrega')}
            />
          </div>

          {/* Linha 2: Cliente e NF */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Select
                label="Cliente"
                error={errors.cliente_id?.message}
                options={clientes.map(c => ({ value: c.id, label: c.nome }))}
                {...register('cliente_id')}
              />
            </div>
            <Input
              label="N.F."
              placeholder="Opcional"
              {...register('nf')}
            />
          </div>

          {/* Linha 3: Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Observações
            </label>
            <input
              type="text"
              placeholder="Observações do pedido (opcional)"
              className="input-glass w-full"
              {...register('observacoes')}
            />
          </div>

          {/* Seção Entrega */}
          <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Entrega
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Horário de Recebimento
                </label>
                <input
                  type="text"
                  placeholder="Ex: 08:00 às 17:00"
                  className="input-glass w-full"
                  {...register('horario_recebimento')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Preço Descarga Pallet (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className="input-glass w-full"
                  {...register('preco_descarga_pallet')}
                />
              </div>
            </div>
          </div>

          {/* Vendedor (apenas na edição e para admins que podem editar) */}
          {editingPedido && canEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vendedor
              </label>
              <select
                value={vendedorSelecionado}
                onChange={(e) => setVendedorSelecionado(e.target.value)}
                className="input-glass w-full"
              >
                <option value="">Selecione o vendedor</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nome} ({u.nivel})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Seção de Produtos */}
          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Produtos
              </label>
              <button
                type="button"
                onClick={adicionarItem}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {itens.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <select
                    value={item.produto_id}
                    onChange={(e) => atualizarItem(index, 'produto_id', e.target.value)}
                    className="input-glass text-sm flex-1"
                  >
                    <option value="">Produto</option>
                    {produtos.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({p.peso_caixa_kg}kg)
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={item.quantidade_caixas}
                    onChange={(e) => atualizarItem(index, 'quantidade_caixas', e.target.value)}
                    placeholder="Cx"
                    className="input-glass text-sm w-20 text-center"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.preco_unitario}
                    onChange={(e) => atualizarItem(index, 'preco_unitario', e.target.value)}
                    placeholder="R$/kg"
                    className="input-glass text-sm w-24 text-right"
                  />
                  {itens.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerItem(index)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Total estimado */}
            <div className="text-right text-sm pt-1">
              <span className="text-gray-500 dark:text-gray-400">Total: </span>
              <span className="font-semibold text-quatrelati-gold-600">
                {formatCurrency(calcularTotalPedido())}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Button variant="ghost" type="button" onClick={fecharModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editingPedido ? 'Salvar' : 'Criar Pedido'}
            </Button>
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
          Tem certeza que deseja excluir o pedido <strong>{deleteConfirm?.numero_pedido}</strong>?
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => excluirPedido(deleteConfirm?.id)}>
            Excluir
          </Button>
        </div>
      </Modal>

      {/* Modal de Confirmação de Reverter Entrega */}
      <Modal
        isOpen={!!revertConfirm}
        onClose={() => setRevertConfirm(null)}
        title="Reverter Entrega"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Tem certeza que deseja reverter a entrega do pedido <strong>{revertConfirm?.numero_pedido}</strong>?
          O status voltará para <strong>Pendente</strong>.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setRevertConfirm(null)}>
            Cancelar
          </Button>
          <Button
            className="bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => reverterEntrega(revertConfirm?.id)}
          >
            Reverter Entrega
          </Button>
        </div>
      </Modal>

      {/* Modal de Seleção de Vendedor para PDF */}
      <Modal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        title={pdfMode === 'download' ? 'Exportar PDF' : 'Imprimir Relatório'}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Selecione o vendedor para gerar o relatório ou deixe em branco para incluir todos os vendedores.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Vendedor
            </label>
            <select
              value={pdfVendedorId}
              onChange={(e) => setPdfVendedorId(e.target.value)}
              className="input-glass w-full"
            >
              <option value="">Todos os vendedores</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>
                  {u.nome} ({u.nivel})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="ghost" onClick={() => setPdfModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarExportarPDF}>
              {pdfMode === 'download' ? (
                <>
                  <Download className="w-4 h-4" />
                  Baixar PDF
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  Imprimir
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
