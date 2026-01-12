// =====================================================
// Componente de Resumo de Pedidos
// v1.0.0 - Cards de resumo (A Entregar / Entregue)
// =====================================================

import { formatCurrency, formatNumber, isAtrasado } from '../utils';

export default function ResumoPedidos({ totais, pedidos }) {
  if (!totais) return null;

  const atrasados = pedidos.filter(p => isAtrasado(p)).length;

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
}
