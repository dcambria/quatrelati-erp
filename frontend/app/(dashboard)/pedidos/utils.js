// =====================================================
// Utilitários da Página de Pedidos
// v1.0.0
// =====================================================

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatNumber = (value) => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

// Formata data sem problemas de timezone
export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
};

// Verifica se é mês atual
export const isCurrentMonth = (mes, ano) => {
  const hoje = new Date();
  return mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();
};

// Verifica se pedido está atrasado
export const isAtrasado = (pedido) => {
  if (pedido.entregue || !pedido.data_entrega) return false;
  const hoje = new Date(new Date().toDateString());
  return new Date(pedido.data_entrega) < hoje;
};

// Calcula total do pedido baseado nos itens
export const calcularTotalPedido = (itens, produtos) => {
  return itens.reduce((total, item) => {
    if (!item.produto_id || !item.quantidade_caixas || !item.preco_unitario) return total;
    const produto = produtos.find(p => p.id === parseInt(item.produto_id));
    if (!produto) return total;
    const peso = parseFloat(produto.peso_caixa_kg) * parseInt(item.quantidade_caixas);
    return total + (peso * parseFloat(item.preco_unitario));
  }, 0);
};
