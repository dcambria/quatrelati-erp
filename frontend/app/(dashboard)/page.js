'use client';

// =====================================================
// Dashboard - Página Principal
// v1.1.0 - Elementos clicáveis com navegação
// =====================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Package,
  TrendingUp,
  Weight,
  Truck,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Users,
  ShoppingCart,
  CalendarDays,
  ExternalLink,
} from 'lucide-react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { useVendedorFilter } from '../contexts/VendedorFilterContext';
import Header from '../components/layout/Header';
import Card, { StatCard } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Loading from '../components/ui/Loading';
import { formatCurrency, formatNumber } from '../lib/formatters';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const PIE_COLORS = ['#22C55E', '#D4A017'];

export default function DashboardPage() {
  const router = useRouter();
  const { vendedorId } = useVendedorFilter();
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [resumo, setResumo] = useState(null);
  const [topClientes, setTopClientes] = useState([]);
  const [topProdutos, setTopProdutos] = useState([]);
  const [evolucao, setEvolucao] = useState([]);
  const [proximasEntregas, setProximasEntregas] = useState([]);
  const [atrasados, setAtrasados] = useState([]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const vendedorParam = vendedorId ? `&vendedor_id=${vendedorId}` : '';
      const [resumoRes, clientesRes, produtosRes, evolucaoRes, entregasRes, atrasadosRes] = await Promise.all([
        api.get(`/dashboard/resumo?mes=${mes}&ano=${ano}${vendedorParam}`),
        api.get(`/dashboard/top-clientes?mes=${mes}&ano=${ano}${vendedorParam}`),
        api.get(`/dashboard/top-produtos?mes=${mes}&ano=${ano}${vendedorParam}`),
        api.get(`/dashboard/evolucao${vendedorParam ? '?' + vendedorParam.slice(1) : ''}`),
        api.get(`/dashboard/proximas-entregas${vendedorParam ? '?' + vendedorParam.slice(1) : ''}`),
        api.get(`/dashboard/entregas-atrasadas${vendedorParam ? '?' + vendedorParam.slice(1) : ''}`),
      ]);

      setResumo(resumoRes.data);
      setTopClientes(clientesRes.data.clientes);
      setTopProdutos(produtosRes.data.produtos);
      setEvolucao(evolucaoRes.data.evolucao);
      setProximasEntregas(entregasRes.data.entregas);
      setAtrasados(atrasadosRes.data.atrasados);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [mes, ano, vendedorId]);

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

  // Funções de navegação
  const navegarParaPedidos = (filtros = {}) => {
    const params = new URLSearchParams();
    if (filtros.mes) params.set('mes', filtros.mes);
    if (filtros.ano) params.set('ano', filtros.ano);
    if (filtros.status) params.set('status', filtros.status);
    if (filtros.cliente_id) params.set('cliente_id', filtros.cliente_id);
    if (filtros.produto_id) params.set('produto_id', filtros.produto_id);
    if (filtros.pedido_id) params.set('pedido_id', filtros.pedido_id);
    router.push(`/pedidos${params.toString() ? '?' + params.toString() : ''}`);
  };

  const navegarParaCliente = (clienteId) => {
    router.push(`/clientes?detalhe=${clienteId}`);
  };

  const pieData = resumo ? [
    { name: 'Entregues', value: resumo.resumo.entregues },
    { name: 'Pendentes', value: resumo.resumo.pendentes },
  ] : [];

  if (loading) {
    return (
      <div className="p-6">
        <Header title="Dashboard" subtitle="Carregando..." />
        <Loading />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Header
        title="Dashboard"
        subtitle={`Visão geral do mês de ${MESES[mes - 1]} de ${ano}`}
        actions={
          <div className="flex items-center gap-1">
            <div className="flex items-center bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl p-1">
              <button
                onClick={() => navegarMes(-1)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <span className="px-4 font-medium text-gray-900 dark:text-white">
                {MESES[mes - 1]} {ano}
              </span>
              <button
                onClick={() => navegarMes(1)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
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
        }
      />

      {/* Estatísticas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-tour="dashboard-stats">
        <div
          onClick={() => navegarParaPedidos({ mes, ano })}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <StatCard
            title="Total de Pedidos"
            value={resumo?.resumo.total_pedidos || 0}
            subtitle={resumo?.comparativo.pedidos_variacao > 0
              ? `+${resumo.comparativo.pedidos_variacao}% vs mês anterior`
              : `${resumo?.comparativo.pedidos_variacao || 0}% vs mês anterior`
            }
            icon={ShoppingCart}
            variant="gold"
          />
        </div>
        <div
          onClick={() => navegarParaPedidos({ mes, ano })}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <StatCard
            title="Valor Total"
            value={formatCurrency(resumo?.resumo.valor_total || 0)}
            subtitle={resumo?.comparativo.valor_variacao > 0
              ? `+${resumo.comparativo.valor_variacao}% vs mês anterior`
              : `${resumo?.comparativo.valor_variacao || 0}% vs mês anterior`
            }
            icon={DollarSign}
            variant="blue"
          />
        </div>
        <div
          onClick={() => navegarParaPedidos({ mes, ano })}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <StatCard
            title="Peso Total"
            value={`${formatNumber(resumo?.resumo.peso_total || 0)} kg`}
            subtitle={`${formatNumber(resumo?.resumo.total_caixas || 0)} caixas`}
            icon={Weight}
            variant="gold"
          />
        </div>
        <div
          onClick={() => navegarParaPedidos({ mes, ano, status: 'pendente' })}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <StatCard
            title="Taxa de Entrega"
            value={`${resumo?.resumo.taxa_entrega || 0}%`}
            subtitle={`${resumo?.resumo.entregues || 0} de ${resumo?.resumo.total_pedidos || 0} entregues`}
            icon={Truck}
            variant="green"
          />
        </div>
      </div>

      {/* Gráficos e listas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status de Entregas */}
        <Card className="lg:col-span-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Status de Entregas
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  onClick={(data) => {
                    const status = data.name === 'Entregues' ? 'entregue' : 'pendente';
                    navegarParaPedidos({ mes, ano, status });
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index]}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '12px',
                    border: '1px solid rgba(0,0,0,0.1)',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">Clique nas fatias para filtrar</p>
        </Card>

        {/* Evolução Mensal */}
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Evolução Mensal (Últimos 6 meses)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis dataKey="periodo" tick={{ fill: '#71717A', fontSize: 12 }} />
                <YAxis tick={{ fill: '#71717A', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '12px',
                    border: '1px solid rgba(0,0,0,0.1)',
                  }}
                  formatter={(value, name) => {
                    if (name === 'valor_total') return formatCurrency(value);
                    return formatNumber(value);
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total_pedidos"
                  name="Pedidos"
                  stroke="#D4A017"
                  strokeWidth={3}
                  dot={{ fill: '#D4A017', strokeWidth: 2, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="entregues"
                  name="Entregues"
                  stroke="#22C55E"
                  strokeWidth={3}
                  dot={{ fill: '#22C55E', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top Clientes e Produtos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Clientes */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top 5 Clientes
            </h3>
            <Users className="w-5 h-5 text-quatrelati-gold-500" />
          </div>
          <div className="space-y-3">
            {topClientes.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                Nenhum pedido no período
              </p>
            ) : (
              topClientes.map((cliente, index) => (
                <div
                  key={cliente.id}
                  onClick={() => navegarParaCliente(cliente.id)}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 cursor-pointer hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-quatrelati-gold-500/20 text-quatrelati-gold-600 dark:text-quatrelati-gold-400 font-semibold text-sm">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white group-hover:text-quatrelati-gold-600 dark:group-hover:text-quatrelati-gold-400 transition-colors">
                        {cliente.nome}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {cliente.total_pedidos} pedidos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-quatrelati-gold-600 dark:text-quatrelati-gold-400">
                      {formatCurrency(cliente.valor_total)}
                    </p>
                    <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Top 5 Produtos */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top 5 Produtos
            </h3>
            <Package className="w-5 h-5 text-quatrelati-blue-500" />
          </div>
          <div className="space-y-3">
            {topProdutos.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                Nenhum pedido no período
              </p>
            ) : (
              topProdutos.map((produto, index) => (
                <div
                  key={produto.id}
                  onClick={() => navegarParaPedidos({ mes, ano, produto_id: produto.id })}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 cursor-pointer hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-quatrelati-blue-500/20 text-quatrelati-blue-600 dark:text-quatrelati-blue-400 font-semibold text-sm">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-quatrelati-blue-600 dark:group-hover:text-quatrelati-blue-400 transition-colors">
                        {produto.nome}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatNumber(produto.total_caixas)} caixas
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-quatrelati-blue-600 dark:text-quatrelati-blue-400">
                      {formatCurrency(produto.valor_total)}
                    </p>
                    <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Próximas Entregas e Atrasadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximas Entregas */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Próximas Entregas (7 dias)
            </h3>
            <Clock className="w-5 h-5 text-quatrelati-gold-500" />
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin">
            {proximasEntregas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                <CheckCircle className="w-12 h-12 mb-2 text-quatrelati-green-500/50" />
                <p>Nenhuma entrega pendente</p>
              </div>
            ) : (
              proximasEntregas.map((pedido) => (
                <div
                  key={pedido.id}
                  onClick={() => navegarParaPedidos({ pedido_id: pedido.id })}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 cursor-pointer hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white group-hover:text-quatrelati-blue-600 dark:group-hover:text-quatrelati-blue-400 transition-colors">
                      {pedido.numero_pedido} - {pedido.cliente_nome}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {pedido.produto_nome}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <Badge variant="info">
                        {format(new Date(pedido.data_entrega), 'dd/MM', { locale: ptBR })}
                      </Badge>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatNumber(pedido.peso_kg)} kg
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Entregas Atrasadas */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Entregas Atrasadas
            </h3>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin">
            {atrasados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                <CheckCircle className="w-12 h-12 mb-2 text-quatrelati-green-500/50" />
                <p>Nenhuma entrega atrasada</p>
              </div>
            ) : (
              atrasados.map((pedido) => (
                <div
                  key={pedido.id}
                  onClick={() => navegarParaPedidos({ pedido_id: pedido.id })}
                  className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 dark:bg-red-900/10 border border-red-200/50 dark:border-red-800/30 cursor-pointer hover:bg-red-100/80 dark:hover:bg-red-900/20 transition-colors group"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                      {pedido.numero_pedido} - {pedido.cliente_nome}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {pedido.produto_nome}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <Badge variant="error" dot>
                        {pedido.dias_atraso} dias
                      </Badge>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {format(new Date(pedido.data_entrega), 'dd/MM', { locale: ptBR })}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
