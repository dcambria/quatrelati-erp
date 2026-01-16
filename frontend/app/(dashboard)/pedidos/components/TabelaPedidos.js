// =====================================================
// Componente de Tabela de Pedidos
// v1.2.0 - Cancelamento, Orçamentos, Superadmin exclusão
// =====================================================

'use client';

import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Check,
  Edit2,
  Trash2,
  Undo2,
  FileText,
  Package,
  Ban,
  RotateCcw,
  FileCheck,
} from 'lucide-react';
import Gravatar from '../../../components/ui/Gravatar';
import IconeProduto from './IconeProduto';
import { formatCurrency, formatNumber, formatDate, isAtrasado } from '../utils';

export default function TabelaPedidos({
  pedidos,
  busca,
  canEdit,
  isSuperAdmin = false,
  isOrcamento = false,
  isCancelados = false,
  onView,
  onEdit,
  onDelete,
  onCancelar,
  onReativar,
  onConverterOrcamento,
  onMarcarEntregue,
  onReverterEntrega,
  onBaixarPDF,
}) {
  const [ordenacao, setOrdenacao] = useState({ coluna: 'numero_pedido', direcao: 'asc' });
  const [expandedPedido, setExpandedPedido] = useState(null);
  const [allExpanded, setAllExpanded] = useState(false);

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
        valorA = a.entregue ? 2 : isAtrasado(a) ? 0 : 1;
        valorB = b.entregue ? 2 : isAtrasado(b) ? 0 : 1;
      } else {
        valorA = (valorA || '').toString().toLowerCase();
        valorB = (valorB || '').toString().toLowerCase();
      }

      if (valorA < valorB) return direcao === 'asc' ? -1 : 1;
      if (valorA > valorB) return direcao === 'asc' ? 1 : -1;
      return 0;
    });

  return (
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
                <div className="flex items-center gap-1">{isCancelados ? 'Item' : isOrcamento ? 'Orçamento' : 'Pedido'} <IconeOrdenacao coluna="numero_pedido" /></div>
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
                  {busca
                    ? `Nenhum ${isCancelados ? 'item cancelado' : isOrcamento ? 'orçamento' : 'pedido'} encontrado para esta busca`
                    : `Nenhum ${isCancelados ? 'item cancelado' : isOrcamento ? 'orçamento' : 'pedido'} neste período`}
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
                const pedidoAtrasado = isAtrasado(pedido);
                const pedidoCancelado = pedido.cancelado === true;
                const borderColor = pedidoCancelado
                  ? 'border-l-gray-400'
                  : isOrcamento
                    ? 'border-l-purple-500'
                    : pedido.entregue
                      ? 'border-l-green-500'
                      : pedidoAtrasado
                        ? 'border-l-red-500'
                        : 'border-l-amber-500';

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
                      onClick={() => onView(pedido)}
                    >
                      <td
                        className={`py-3 px-2 text-center border-l-4 ${borderColor}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (allExpanded) {
                            setAllExpanded(false);
                            setExpandedPedido(pedido.id);
                          } else {
                            setExpandedPedido(isExpanded ? null : pedido.id);
                          }
                        }}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-blue-500 mx-auto" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-300 mx-auto" />
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className={`font-mono font-semibold ${pedidoCancelado ? 'text-gray-400 line-through' : isOrcamento ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'}`}>
                          {isOrcamento && !pedido.numero_pedido ? (
                            <span className="flex items-center gap-1">
                              <FileCheck className="w-3.5 h-3.5" />
                              Orçamento
                            </span>
                          ) : (
                            <>#{pedido.numero_pedido}</>
                          )}
                        </div>
                        {pedidoCancelado && (
                          <span className="text-[10px] text-gray-400 italic">
                            Cancelado
                          </span>
                        )}
                        {hasItens && !isExpanded && !pedidoCancelado && (
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
                        {hasItens && isExpanded && !pedidoCancelado && (
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
                        {pedidoCancelado ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                            Cancelado
                          </span>
                        ) : isOrcamento ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            Orçamento
                          </span>
                        ) : pedido.entregue ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Entregue
                          </span>
                        ) : pedidoAtrasado ? (
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
                          {/* Pedidos cancelados: apenas reativar e excluir (superadmin) */}
                          {pedidoCancelado ? (
                            <>
                              {canEdit && onReativar && (
                                <ActionButton
                                  icon={RotateCcw}
                                  tooltip="Reativar pedido"
                                  color="green"
                                  onClick={() => onReativar(pedido.id)}
                                />
                              )}
                              {isSuperAdmin && onDelete && (
                                <ActionButton
                                  icon={Trash2}
                                  tooltip="Excluir definitivamente"
                                  color="red"
                                  onClick={() => onDelete(pedido)}
                                />
                              )}
                            </>
                          ) : isOrcamento ? (
                            /* Orçamentos: converter, editar, excluir (superadmin) */
                            <>
                              {canEdit && onConverterOrcamento && (
                                <ActionButton
                                  icon={FileCheck}
                                  tooltip="Converter em Pedido"
                                  color="green"
                                  onClick={() => onConverterOrcamento(pedido.id)}
                                />
                              )}
                              {canEdit && (
                                <ActionButton
                                  icon={Edit2}
                                  tooltip="Editar"
                                  color="blue"
                                  onClick={() => onEdit(pedido)}
                                />
                              )}
                              {isSuperAdmin && onDelete && (
                                <ActionButton
                                  icon={Trash2}
                                  tooltip="Excluir"
                                  color="red"
                                  onClick={() => onDelete(pedido)}
                                />
                              )}
                            </>
                          ) : (
                            /* Pedidos ativos: todas as ações */
                            <>
                              <ActionButton
                                icon={FileText}
                                tooltip="Baixar PDF"
                                color="purple"
                                onClick={() => onBaixarPDF(pedido)}
                              />
                              {canEdit && (
                                <>
                                  {!pedido.entregue ? (
                                    <ActionButton
                                      icon={Check}
                                      tooltip="Marcar entregue"
                                      color="green"
                                      onClick={() => onMarcarEntregue(pedido)}
                                    />
                                  ) : (
                                    <ActionButton
                                      icon={Undo2}
                                      tooltip="Reverter pendente"
                                      color="amber"
                                      onClick={() => onReverterEntrega(pedido)}
                                    />
                                  )}
                                  <ActionButton
                                    icon={Edit2}
                                    tooltip="Editar"
                                    color="blue"
                                    onClick={() => onEdit(pedido)}
                                  />
                                  {onCancelar && (
                                    <ActionButton
                                      icon={Ban}
                                      tooltip="Cancelar pedido"
                                      color="amber"
                                      onClick={() => onCancelar(pedido)}
                                    />
                                  )}
                                  {isSuperAdmin && onDelete && (
                                    <ActionButton
                                      icon={Trash2}
                                      tooltip="Excluir definitivamente"
                                      color="red"
                                      onClick={() => onDelete(pedido)}
                                    />
                                  )}
                                </>
                              )}
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
  );
}

// Componente auxiliar para botões de ação com tooltip
function ActionButton({ icon: Icon, tooltip, color, onClick }) {
  const colorClasses = {
    purple: 'hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-500',
    green: 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-500',
    amber: 'hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-500',
    blue: 'hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500',
    red: 'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500',
  };

  return (
    <div className="relative group/tip">
      <button
        onClick={onClick}
        className={`p-1.5 rounded transition-all active:scale-90 ${colorClasses[color]}`}
      >
        <Icon className="w-4 h-4" />
      </button>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-[10px] font-medium text-white bg-gray-800 dark:bg-gray-700 rounded whitespace-nowrap opacity-0 group-hover/tip:opacity-100 pointer-events-none z-50">
        {tooltip}
      </span>
    </div>
  );
}
