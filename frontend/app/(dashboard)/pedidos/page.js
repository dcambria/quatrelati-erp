'use client';
// =====================================================
// Pagina de Gestao de Pedidos
// v2.6.0 - Aba Cancelados + fix criação orçamentos
// =====================================================

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Search,
  X,
  CalendarDays,
  ShoppingCart,
  FileText,
  Ban,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useVendedorFilter } from '../../contexts/VendedorFilterContext';
import Header from '../../components/layout/Header';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { TableSkeleton } from '../../components/ui/Loading';

// Componentes extraídos
import { ResumoPedidos, TabelaPedidos, PedidoFormModal, PedidoViewModal, PdfExportModal } from './components';
import { MESES, isCurrentMonth } from './utils';

export default function PedidosPage() {
  const searchParams = useSearchParams();
  const { canEdit, canViewAll, user, isSuperAdmin } = useAuth();
  const { vendedorId: vendedorGlobal } = useVendedorFilter();

  // Aba ativa: 'pedidos', 'orcamentos' ou 'cancelados'
  const [abaAtiva, setAbaAtiva] = useState('pedidos');

  // Ler parâmetros da URL (vindos do dashboard)
  const urlMes = searchParams.get('mes');
  const urlAno = searchParams.get('ano');
  const urlStatus = searchParams.get('status');
  const urlClienteId = searchParams.get('cliente_id');
  const urlProdutoId = searchParams.get('produto_id');
  const urlPedidoId = searchParams.get('pedido_id');

  // Estados principais
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState([]);
  const [totais, setTotais] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  // Estados de filtro (inicializados com URL ou valores padrão)
  const [mes, setMes] = useState(urlMes ? parseInt(urlMes) : new Date().getMonth() + 1);
  const [ano, setAno] = useState(urlAno ? parseInt(urlAno) : new Date().getFullYear());
  const [filtroStatus, setFiltroStatus] = useState(urlStatus || 'todos');
  const [filtroCliente, setFiltroCliente] = useState(urlClienteId || '');
  const [filtroProduto, setFiltroProduto] = useState(urlProdutoId || '');
  const [busca, setBusca] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Verificar se há filtros ativos (além do mês/ano atual)
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  const hasActiveFilters =
    filtroStatus !== 'todos' ||
    filtroCliente !== '' ||
    filtroProduto !== '' ||
    mes !== mesAtual ||
    ano !== anoAtual;

  const contadorFiltros = [
    filtroStatus !== 'todos',
    filtroCliente !== '',
    filtroProduto !== '',
    mes !== mesAtual || ano !== anoAtual,
  ].filter(Boolean).length;

  const limparFiltros = () => {
    setFiltroStatus('todos');
    setFiltroCliente('');
    setFiltroProduto('');
    setMes(mesAtual);
    setAno(anoAtual);
    setBusca('');
  };

  // Estados de modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPedido, setEditingPedido] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingPedido, setViewingPedido] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [revertConfirm, setRevertConfirm] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfVendedorId, setPdfVendedorId] = useState('');
  const [pdfMode, setPdfMode] = useState('download');

  // Carregar dados iniciais
  useEffect(() => {
    carregarClientes();
    carregarProdutos();
    carregarUsuarios();
  }, []);

  useEffect(() => {
    carregarPedidos();
  }, [mes, ano, filtroStatus, filtroCliente, filtroProduto, vendedorGlobal, abaAtiva]);

  // Abrir pedido específico vindo da URL (dashboard) - abre visualização
  useEffect(() => {
    if (urlPedidoId && pedidos.length > 0) {
      const pedido = pedidos.find(p => p.id === parseInt(urlPedidoId));
      if (pedido) {
        setViewingPedido(pedido);
        setViewModalOpen(true);
      }
    }
  }, [urlPedidoId, pedidos]);

  // Funções de carregamento
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

  const carregarUsuarios = async () => {
    try {
      const res = await api.get('/usuarios');
      setUsuarios(res.data.usuarios || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const carregarPedidos = async () => {
    setLoading(true);
    try {
      let url = `/pedidos?mes=${mes}&ano=${ano}`;
      if (filtroStatus !== 'todos') url += `&status=${filtroStatus}`;
      if (filtroCliente) url += `&cliente_id=${filtroCliente}`;
      if (filtroProduto) url += `&produto_id=${filtroProduto}`;
      if (vendedorGlobal) url += `&vendedor_id=${vendedorGlobal}`;
      if (abaAtiva === 'orcamentos') url += `&apenas_orcamentos=true`;
      if (abaAtiva === 'cancelados') url += `&apenas_cancelados=true`;

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

  const carregarPedidoCompleto = async (id) => {
    const response = await api.get(`/pedidos/${id}`);
    return response.data?.pedido || response.pedido;
  };

  // Navegação de mês
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

  // Handlers de pedido
  const abrirVisualizacao = (pedido) => {
    setViewingPedido(pedido);
    setViewModalOpen(true);
  };

  const fecharVisualizacao = () => {
    setViewModalOpen(false);
    setViewingPedido(null);
  };

  const abrirModal = (pedido = null) => {
    setEditingPedido(pedido);
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setEditingPedido(null);
  };

  const salvarPedido = async (payload, pedidoId) => {
    if (pedidoId) {
      await api.put(`/pedidos/${pedidoId}`, payload);
      toast.success('Pedido atualizado com sucesso');
    } else {
      await api.post('/pedidos', payload);
      toast.success('Pedido criado com sucesso');
    }
    carregarPedidos();
  };

  const marcarEntregue = async (pedido) => {
    try {
      await api.patch(`/pedidos/${pedido.id}/entregar`, {
        data_entrega_real: new Date().toISOString().split('T')[0],
      });
      toast.success('Pedido marcado como entregue');
      // Recarregar pedidos e totais para atualizar os cards
      carregarPedidos();
    } catch (error) {
      console.error('Erro ao marcar como entregue:', error);
      toast.error('Erro ao atualizar pedido');
    }
  };

  const reverterEntrega = async (id) => {
    try {
      await api.patch(`/pedidos/${id}/reverter-entrega`);
      toast.success('Entrega revertida para pendente');
      setRevertConfirm(null);
      // Recarregar pedidos e totais para atualizar os cards
      carregarPedidos();
    } catch (error) {
      console.error('Erro ao reverter entrega:', error);
      toast.error('Erro ao reverter entrega');
    }
  };

  const excluirPedido = async (id) => {
    try {
      await api.delete(`/pedidos/${id}`);
      toast.success('Pedido excluído com sucesso');
      setDeleteConfirm(null);
      carregarPedidos();
    } catch (error) {
      console.error('Erro ao excluir pedido:', error);
      toast.error(error.message || 'Erro ao excluir pedido');
    }
  };

  const cancelarPedido = async (id) => {
    try {
      await api.patch(`/pedidos/${id}/cancelar`, { motivo: motivoCancelamento });
      toast.success('Pedido cancelado com sucesso');
      setCancelConfirm(null);
      setMotivoCancelamento('');
      carregarPedidos();
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      toast.error(error.message || 'Erro ao cancelar pedido');
    }
  };

  const reativarPedido = async (id) => {
    try {
      await api.patch(`/pedidos/${id}/reativar`);
      toast.success('Pedido reativado com sucesso');
      carregarPedidos();
    } catch (error) {
      console.error('Erro ao reativar pedido:', error);
      toast.error(error.message || 'Erro ao reativar pedido');
    }
  };

  const converterOrcamento = async (id) => {
    try {
      await api.patch(`/pedidos/${id}/converter-orcamento`);
      toast.success('Orçamento convertido em pedido com sucesso');
      setAbaAtiva('pedidos');
      carregarPedidos();
    } catch (error) {
      console.error('Erro ao converter orçamento:', error);
      toast.error(error.message || 'Erro ao converter orçamento');
    }
  };

  // Handlers de PDF
  const handleExportarPDF = (mode = 'download') => {
    if (canViewAll) {
      setPdfMode(mode);
      setPdfVendedorId('');
      setPdfModalOpen(true);
    } else {
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
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao gerar PDF');

      const blob = await response.blob();
      const pdfUrl = window.URL.createObjectURL(blob);

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
    const ignorarFiltroGlobal = pdfVendedorId === '';
    if (pdfMode === 'download') {
      exportarPDF(pdfVendedorId || null, ignorarFiltroGlobal);
    } else {
      imprimir(pdfVendedorId || null, ignorarFiltroGlobal);
    }
  };

  const baixarPDFPedido = async (pedido) => {
    try {
      await api.download(`/pedidos/${pedido.id}/pdf`, `pedido-${pedido.numero_pedido}.pdf`);
      toast.success('PDF do pedido gerado com sucesso');
    } catch (error) {
      console.error('Erro ao gerar PDF do pedido:', error);
      toast.error('Erro ao gerar PDF do pedido');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Header
        title={abaAtiva === 'pedidos' ? 'Pedidos' : abaAtiva === 'orcamentos' ? 'Orçamentos' : 'Cancelados'}
        stats={[
          {
            icon: abaAtiva === 'pedidos' ? ShoppingCart : abaAtiva === 'orcamentos' ? FileText : Ban,
            label: 'Total',
            value: pedidos.length,
            color: abaAtiva === 'pedidos'
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : abaAtiva === 'orcamentos'
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
          }
        ]}
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
              {!isCurrentMonth(mes, ano) && (
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
            {/* Indicador de filtros ativos */}
            {hasActiveFilters && (
              <button
                onClick={limparFiltros}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                title="Clique para limpar filtros"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{contadorFiltros} filtro{contadorFiltros > 1 ? 's' : ''}</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Botões de ação */}
            <Button
              variant={showFilters ? 'primary' : 'ghost'}
              onClick={() => setShowFilters(!showFilters)}
              className="!px-2 sm:!px-4 relative"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Filtros</span>
              {hasActiveFilters && !showFilters && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
              )}
            </Button>
            <Button variant="secondary" onClick={() => handleExportarPDF('download')} className="!px-2 sm:!px-4">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">PDF</span>
            </Button>
            {canEdit && abaAtiva !== 'cancelados' && (
              <Button onClick={() => abrirModal()} className="!px-2 sm:!px-4">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">
                  {abaAtiva === 'pedidos' ? 'Novo Pedido' : 'Novo Orçamento'}
                </span>
              </Button>
            )}
          </div>
        }
      />

      {/* Abas: Pedidos | Orçamentos | Cancelados */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setAbaAtiva('pedidos')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            abaAtiva === 'pedidos'
              ? 'border-quatrelati-gold-500 text-quatrelati-gold-600 dark:text-quatrelati-gold-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Pedidos
        </button>
        <button
          onClick={() => setAbaAtiva('orcamentos')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            abaAtiva === 'orcamentos'
              ? 'border-quatrelati-blue-500 text-quatrelati-blue-600 dark:text-quatrelati-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          Orçamentos
        </button>
        <button
          onClick={() => setAbaAtiva('cancelados')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            abaAtiva === 'cancelados'
              ? 'border-gray-500 text-gray-600 dark:text-gray-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Ban className="w-4 h-4" />
          Cancelados
        </button>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <Select
              label="Produto"
              value={filtroProduto}
              onChange={(e) => setFiltroProduto(e.target.value)}
              options={produtos.map(p => ({ value: p.id, label: p.nome }))}
              placeholder="Todos os produtos"
            />
            {hasActiveFilters && (
              <div className="flex items-end">
                <Button variant="ghost" onClick={limparFiltros} className="w-full text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                  <X className="w-4 h-4 mr-1" />
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Container principal */}
      <div className="space-y-4">
        {/* Resumo por Status */}
        <ResumoPedidos totais={totais} pedidos={pedidos} />

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
          <TabelaPedidos
            pedidos={pedidos}
            busca={busca}
            canEdit={canEdit}
            isSuperAdmin={isSuperAdmin}
            isOrcamento={abaAtiva === 'orcamentos'}
            isCancelados={abaAtiva === 'cancelados'}
            onView={abrirVisualizacao}
            onEdit={abrirModal}
            onDelete={setDeleteConfirm}
            onCancelar={setCancelConfirm}
            onReativar={reativarPedido}
            onConverterOrcamento={converterOrcamento}
            onMarcarEntregue={marcarEntregue}
            onReverterEntrega={setRevertConfirm}
            onBaixarPDF={baixarPDFPedido}
          />
        )}
      </div>

      {/* Modal de Visualização */}
      <PedidoViewModal
        isOpen={viewModalOpen}
        onClose={fecharVisualizacao}
        pedido={viewingPedido}
        canEdit={canEdit}
        onEdit={abrirModal}
        onBaixarPDF={baixarPDFPedido}
        carregarPedidoCompleto={carregarPedidoCompleto}
      />

      {/* Modal de Edição */}
      <PedidoFormModal
        isOpen={modalOpen}
        onClose={fecharModal}
        editingPedido={editingPedido}
        clientes={clientes}
        produtos={produtos}
        usuarios={usuarios}
        currentUser={user}
        canEdit={canEdit}
        onSave={salvarPedido}
        carregarPedidoCompleto={carregarPedidoCompleto}
        isOrcamento={abaAtiva === 'orcamentos'}
      />

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

      {/* Modal de Cancelamento */}
      <Modal
        isOpen={!!cancelConfirm}
        onClose={() => { setCancelConfirm(null); setMotivoCancelamento(''); }}
        title="Cancelar Pedido"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Tem certeza que deseja cancelar o pedido <strong>{cancelConfirm?.numero_pedido || `#${cancelConfirm?.id}`}</strong>?
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Motivo do cancelamento (opcional)
          </label>
          <textarea
            value={motivoCancelamento}
            onChange={(e) => setMotivoCancelamento(e.target.value)}
            placeholder="Informe o motivo do cancelamento..."
            className="input-glass w-full resize-none"
            rows={2}
          />
        </div>
        <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
          <Ban className="w-4 h-4 inline mr-1" />
          O número do pedido permanecerá bloqueado e não poderá ser reutilizado.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => { setCancelConfirm(null); setMotivoCancelamento(''); }}>
            Voltar
          </Button>
          <Button
            className="bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => cancelarPedido(cancelConfirm?.id)}
          >
            <Ban className="w-4 h-4 mr-1" />
            Cancelar Pedido
          </Button>
        </div>
      </Modal>

      {/* Modal de Seleção de Vendedor para PDF */}
      <PdfExportModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        pdfMode={pdfMode}
        pdfVendedorId={pdfVendedorId}
        setPdfVendedorId={setPdfVendedorId}
        usuarios={usuarios}
        onConfirm={confirmarExportarPDF}
      />
    </div>
  );
}
