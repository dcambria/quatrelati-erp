// =====================================================
// Funções de Formatação Centralizadas
// v1.0.0
// =====================================================

/**
 * Formata valor monetário no padrão brasileiro (R$)
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado como moeda
 */
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

/**
 * Formata número no padrão brasileiro (separador de milhares)
 * @param {number} value - Número a ser formatado
 * @returns {string} Número formatado
 */
export const formatNumber = (value) => {
  return new Intl.NumberFormat('pt-BR').format(value || 0);
};

/**
 * Formata data no padrão brasileiro (dd/mm/yyyy) sem problemas de timezone
 * @param {string} dateStr - Data em formato ISO
 * @returns {string} Data formatada ou '-' se não houver data
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
};

/**
 * Formata peso com unidade (kg)
 * @param {number} value - Peso em kg
 * @returns {string} Peso formatado com unidade
 */
export const formatWeight = (value) => {
  return `${formatNumber(value)} kg`;
};
