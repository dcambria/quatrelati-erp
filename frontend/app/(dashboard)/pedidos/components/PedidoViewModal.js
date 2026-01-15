// =====================================================
// Modal de Visualização de Pedido
// v1.4.0 - Layout melhorado seção horário recebimento
// =====================================================

'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Edit2,
  X,
  Calendar,
  User,
  Package,
  MapPin,
  Clock,
  FileCheck,
  Printer,
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Gravatar from '../../../components/ui/Gravatar';
import IconeProduto from './IconeProduto';
import { formatCurrency, formatNumber, formatDate, isAtrasado } from '../utils';

export default function PedidoViewModal({
  isOpen,
  onClose,
  pedido,
  canEdit,
  onEdit,
  onBaixarPDF,
  carregarPedidoCompleto,
}) {
  const [pedidoCompleto, setPedidoCompleto] = useState(null);
  const [loading, setLoading] = useState(false);

  // Carregar dados completos do pedido ao abrir
  useEffect(() => {
    if (isOpen && pedido) {
      carregarDados();
    } else {
      setPedidoCompleto(null);
    }
  }, [isOpen, pedido]);

  const carregarDados = async () => {
    if (!pedido) return;

    setLoading(true);
    try {
      const dados = await carregarPedidoCompleto(pedido.id);
      setPedidoCompleto(dados || pedido);
    } catch (error) {
      console.error('Erro ao carregar pedido:', error);
      setPedidoCompleto(pedido);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    onClose();
    onEdit(pedido);
  };

  const handlePrint = () => {
    onBaixarPDF(pedido);
  };

  if (!pedido) return null;

  const dados = pedidoCompleto || pedido;
  const pedidoAtrasado = isAtrasado(dados);
  const statusColor = dados.entregue
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    : pedidoAtrasado
      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  const statusText = dados.entregue ? 'Entregue' : pedidoAtrasado ? 'Atrasado' : 'Pendente';

  // Parsear horário de recebimento (formato: "Sex 08:00-18:00" ou "Seg-Sex 08:00-18:00")
  const parseHorarioRecebimento = (horarioStr) => {
    if (!horarioStr) return null;

    // Tentar parse JSON primeiro (formato antigo)
    try {
      const parsed = JSON.parse(horarioStr);
      if (parsed.dias || parsed.inicio) return parsed;
    } catch {
      // Não é JSON, continuar com parse de string
    }

    // Parse do formato string: "Sex 08:00-18:00" ou "Seg, Ter 08:00-18:00"
    const result = { dias: [], inicio: '08:00', fim: '18:00' };

    // Extrair horário
    const horarioMatch = horarioStr.match(/(\d{2}:\d{2})\s*(?:às|a|-)\s*(\d{2}:\d{2})/i);
    if (horarioMatch) {
      result.inicio = horarioMatch[1];
      result.fim = horarioMatch[2];
    }

    // Extrair dias
    if (/dom|domingo/i.test(horarioStr)) result.dias.push('dom');
    if (/seg|segunda/i.test(horarioStr)) result.dias.push('seg');
    if (/ter|terça/i.test(horarioStr)) result.dias.push('ter');
    if (/qua|quarta/i.test(horarioStr)) result.dias.push('qua');
    if (/qui|quinta/i.test(horarioStr)) result.dias.push('qui');
    if (/sex|sexta/i.test(horarioStr)) result.dias.push('sex');
    if (/sab|sáb|sábado/i.test(horarioStr)) result.dias.push('sab');

    // Verificar se encontrou algo válido
    if (result.dias.length > 0 || horarioMatch) {
      return result;
    }

    return null;
  };

  const horario = parseHorarioRecebimento(dados.horario_recebimento);

  const footerButtons = (
    <div className="flex items-center justify-between w-full">
      {/* Vendedor discreto no footer */}
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          onClick={handlePrint}
          className="flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          Imprimir PDF
        </Button>
        {dados.vendedor_nome && (
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200 dark:border-gray-700">
            <Gravatar
              email={dados.vendedor_email || ''}
              name={dados.vendedor_nome}
              size={24}
              className="ring-1 ring-gray-200 dark:ring-gray-600"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {dados.vendedor_nome}
            </span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {canEdit && (
          <Button
            variant="ghost"
            onClick={handleEdit}
            className="flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Editar
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between w-full pr-8">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold">Pedido #{dados.numero_pedido}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor}`}>
              {statusText}
            </span>
          </div>
        </div>
      }
      size="lg"
      footer={footerButtons}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-quatrelati-gold-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Informações principais */}
          <div className="grid grid-cols-2 gap-4">
            {/* Cliente */}
            <div className="col-span-2 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-quatrelati-blue-100 dark:bg-quatrelati-blue-900/30 rounded-lg">
                  <User className="w-5 h-5 text-quatrelati-blue-600 dark:text-quatrelati-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cliente</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{dados.cliente_nome}</p>
                </div>
              </div>
            </div>

            {/* Data do Pedido */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Data Pedido</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formatDate(dados.data_pedido)}</p>
                </div>
              </div>
            </div>

            {/* Data de Entrega */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Data Entrega</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {dados.data_entrega ? formatDate(dados.data_entrega) : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* NF */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <FileCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Nota Fiscal</p>
                  <p className={`font-medium ${dados.nf ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                    {dados.nf || 'Não informada'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Produtos */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Produtos
              </h4>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl overflow-hidden">
              {dados.itens && dados.itens.length > 0 ? (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {dados.itens.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                          <IconeProduto nome={item.produto_nome} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{item.produto_nome}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatNumber(item.quantidade_caixas)} cx · {formatNumber(item.peso_kg)} kg · R$ {parseFloat(item.preco_unitario).toFixed(2)}/kg
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white tabular-nums">
                        {formatCurrency(item.subtotal)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  {dados.produto_nome ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                          <IconeProduto nome={dados.produto_nome} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{dados.produto_nome}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatNumber(dados.quantidade_caixas)} cx · {formatNumber(dados.peso_kg)} kg
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white tabular-nums">
                        {formatCurrency(dados.total)}
                      </p>
                    </div>
                  ) : (
                    'Nenhum produto'
                  )}
                </div>
              )}

              {/* Total */}
              <div className="p-4 bg-quatrelati-gold-50 dark:bg-quatrelati-gold-900/20 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {formatNumber(dados.peso_kg)} kg em {formatNumber(dados.quantidade_caixas)} caixas
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total</p>
                    <p className="text-xl font-bold text-quatrelati-gold-600">{formatCurrency(dados.total)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Horário de Recebimento */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Horário de Recebimento
              </h4>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              {horario ? (
                <div className="space-y-4">
                  {/* Dias da semana - grid centralizado */}
                  <div className="flex justify-center gap-2">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => {
                      const diaSelecionado = horario.dias?.includes(dia.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
                      return (
                        <div
                          key={dia}
                          className={`w-10 h-10 flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
                            diaSelecionado
                              ? 'bg-quatrelati-gold-500 text-white dark:bg-quatrelati-gold-500 dark:text-gray-900 shadow-sm'
                              : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                          }`}
                        >
                          {dia}
                        </div>
                      );
                    })}
                  </div>

                  {/* Horário - centralizado com destaque */}
                  <div className="flex items-center justify-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm">
                      <Clock className="w-4 h-4 text-quatrelati-gold-500" />
                      <span className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">
                        {horario.inicio || '08:00'}
                      </span>
                      <span className="text-gray-400 mx-1">às</span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">
                        {horario.fim || '18:00'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">Não informado</p>
              )}
            </div>
          </div>

          {/* Descarga/Pallet */}
          <div className={`p-4 rounded-xl ${dados.preco_descarga_pallet && parseFloat(dados.preco_descarga_pallet) > 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">Descarga/Pallet</p>
              <p className={`font-semibold ${dados.preco_descarga_pallet && parseFloat(dados.preco_descarga_pallet) > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                {dados.preco_descarga_pallet && parseFloat(dados.preco_descarga_pallet) > 0 ? formatCurrency(dados.preco_descarga_pallet) : 'Não informado'}
              </p>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Observações
            </h4>
            <div className={`p-4 rounded-xl ${dados.observacoes ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
              <p className={dados.observacoes ? 'text-gray-700 dark:text-gray-300 italic' : 'text-sm text-gray-500 dark:text-gray-400 italic'}>
                {dados.observacoes || 'Nenhuma observação'}
              </p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
