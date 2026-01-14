// =====================================================
// Modal de Formulário de Pedido
// v1.4.0 - Corrige horário de recebimento e botão salvar
// =====================================================

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import { formatCurrency, calcularTotalPedido } from '../utils';
import { horarioSchema, precoPositivoSchema, mascaraHorario } from '../../../lib/validations';

const pedidoSchema = z.object({
  data_pedido: z.string().min(1, 'Data é obrigatória'),
  cliente_id: z.string().min(1, 'Cliente é obrigatório'),
  data_entrega: z.string().optional(),
  nf: z.string().optional(),
  observacoes: z.string().optional(),
  preco_descarga_pallet: precoPositivoSchema,
  horario_recebimento: horarioSchema,
}).refine((data) => {
  // Se data_entrega foi preenchida, deve ser >= data_pedido
  if (data.data_entrega && data.data_pedido) {
    return new Date(data.data_entrega) >= new Date(data.data_pedido);
  }
  return true;
}, {
  message: 'Data de entrega deve ser igual ou posterior à data do pedido',
  path: ['data_entrega'],
});

export default function PedidoFormModal({
  isOpen,
  onClose,
  editingPedido,
  clientes,
  produtos,
  usuarios,
  canEdit,
  onSave,
  carregarPedidoCompleto,
}) {
  const [saving, setSaving] = useState(false);
  const [itens, setItens] = useState([{ produto_id: '', quantidade_caixas: '', preco_unitario: '' }]);
  const [vendedorSelecionado, setVendedorSelecionado] = useState('');

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

  // Carregar dados do pedido ao abrir para edição
  useEffect(() => {
    if (isOpen) {
      if (editingPedido) {
        carregarDadosEdicao();
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingPedido]);

  const carregarDadosEdicao = async () => {
    if (!editingPedido) return;

    setVendedorSelecionado(editingPedido.created_by?.toString() || '');
    reset({
      data_pedido: editingPedido.data_pedido?.split('T')[0] || '',
      cliente_id: editingPedido.cliente_id?.toString() || '',
      data_entrega: editingPedido.data_entrega?.split('T')[0] || '',
      nf: editingPedido.nf || '',
      observacoes: editingPedido.observacoes || '',
      preco_descarga_pallet: editingPedido.preco_descarga_pallet?.toString() || '',
      horario_recebimento: editingPedido.horario_recebimento || '',
    });

    // Carregar itens do pedido
    try {
      const pedidoData = await carregarPedidoCompleto(editingPedido.id);
      if (pedidoData?.itens?.length > 0) {
        setItens(pedidoData.itens.map(item => ({
          produto_id: item.produto_id?.toString() || '',
          quantidade_caixas: item.quantidade_caixas?.toString() || '',
          preco_unitario: item.preco_unitario?.toString() || '',
        })));
        if (pedidoData.created_by) {
          setVendedorSelecionado(pedidoData.created_by.toString());
        }
      } else if (editingPedido.itens?.length > 0) {
        setItens(editingPedido.itens.map(item => ({
          produto_id: item.produto_id?.toString() || '',
          quantidade_caixas: item.quantidade_caixas?.toString() || '',
          preco_unitario: item.preco_unitario?.toString() || '',
        })));
      } else {
        setItens([{
          produto_id: editingPedido.produto_id?.toString() || '',
          quantidade_caixas: editingPedido.quantidade_caixas?.toString() || '',
          preco_unitario: editingPedido.preco_unitario?.toString() || '',
        }]);
      }
    } catch (error) {
      // Fallback para itens do pedido da lista
      if (editingPedido.itens?.length > 0) {
        setItens(editingPedido.itens.map(item => ({
          produto_id: item.produto_id?.toString() || '',
          quantidade_caixas: item.quantidade_caixas?.toString() || '',
          preco_unitario: item.preco_unitario?.toString() || '',
        })));
      } else {
        setItens([{
          produto_id: editingPedido.produto_id?.toString() || '',
          quantidade_caixas: editingPedido.quantidade_caixas?.toString() || '',
          preco_unitario: editingPedido.preco_unitario?.toString() || '',
        }]);
      }
    }
  };

  const resetForm = () => {
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
  };

  const fecharModal = () => {
    resetForm();
    onClose();
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

      await onSave(payload, editingPedido?.id);
      fecharModal();
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
      toast.error(error.message || 'Erro ao salvar pedido');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
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
            <Input
              label="Horário de Recebimento"
              placeholder="Ex: 08:00 às 17:00"
              error={errors.horario_recebimento?.message}
              {...register('horario_recebimento', {
                onChange: (e) => {
                  const masked = mascaraHorario(e.target.value);
                  e.target.value = masked;
                }
              })}
            />
            <Input
              label="Preço Descarga Pallet (R$)"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              error={errors.preco_descarga_pallet?.message}
              {...register('preco_descarga_pallet')}
            />
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
              {formatCurrency(calcularTotalPedido(itens, produtos))}
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
  );
}
