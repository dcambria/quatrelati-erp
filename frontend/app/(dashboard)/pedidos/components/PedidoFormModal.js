// =====================================================
// Modal de Formulário de Pedido
// v1.9.0 - Mini agenda inline + foto vendedor
// =====================================================

'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, User, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import Gravatar from '../../../components/ui/Gravatar';
import HorarioRecebimentoPicker from '../../../components/ui/HorarioRecebimentoPicker';
import { formatCurrency, calcularTotalPedido } from '../utils';
import { precoPositivoSchema } from '../../../lib/validations';

const pedidoSchema = z.object({
  data_pedido: z.string().min(1, 'Data é obrigatória'),
  cliente_id: z.string().min(1, 'Cliente é obrigatório'),
  data_entrega: z.string().optional(),
  nf: z.string().optional(),
  observacoes: z.string().optional(),
  preco_descarga_pallet: precoPositivoSchema,
  horario_recebimento: z.string().optional(),
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
  currentUser,
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
    control,
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
    // Seleciona o usuário atual como vendedor padrão ao criar novo pedido
    setVendedorSelecionado(currentUser?.id?.toString() || '');
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

  // Encontrar vendedor selecionado
  const vendedorSelecionadoObj = usuarios.find(u => u.id === parseInt(vendedorSelecionado));

  const footerButtons = (
    <div className="flex items-center justify-between">
      {/* Vendedor com foto no footer (apenas edição) */}
      <div className="flex items-center gap-2">
        {editingPedido && canEdit && (
          <div className="flex items-center gap-2">
            {vendedorSelecionadoObj && (
              <Gravatar
                email={vendedorSelecionadoObj.email}
                name={vendedorSelecionadoObj.nome}
                size={28}
                className="ring-2 ring-gray-200 dark:ring-gray-600"
              />
            )}
            <div className="relative">
              <select
                value={vendedorSelecionado}
                onChange={(e) => setVendedorSelecionado(e.target.value)}
                className="appearance-none bg-transparent text-sm text-gray-600 dark:text-gray-400 focus:outline-none cursor-pointer hover:text-gray-900 dark:hover:text-white pr-5"
              >
                <option value="">Vendedor...</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="ghost" type="button" onClick={fecharModal}>
          Cancelar
        </Button>
        <Button type="submit" form="pedido-form" loading={saving}>
          {editingPedido ? 'Salvar' : 'Criar Pedido'}
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={fecharModal}
      title={editingPedido ? 'Editar Pedido' : 'Novo Pedido'}
      size="lg"
      footer={footerButtons}
    >
      <form id="pedido-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-1">
        {/* Seção: Dados do Pedido */}
        <div className="space-y-4">
          {/* Cliente */}
          <Select
            label="Cliente"
            error={errors.cliente_id?.message}
            options={clientes.map(c => ({ value: c.id, label: c.nome }))}
            {...register('cliente_id')}
          />

          {/* Datas e NF em linha */}
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Data Pedido"
              type="date"
              error={errors.data_pedido?.message}
              {...register('data_pedido')}
            />
            <Input
              label="Data Entrega"
              type="date"
              error={errors.data_entrega?.message}
              {...register('data_entrega')}
            />
            <Input
              label="N.F."
              placeholder="Opcional"
              {...register('nf')}
            />
          </div>
        </div>

        {/* Seção: Produtos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Produtos
            </h4>
            <button
              type="button"
              onClick={adicionarItem}
              className="text-xs text-quatrelati-blue-600 hover:text-quatrelati-blue-700 dark:text-quatrelati-gold-400 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Adicionar
            </button>
          </div>

          <div className="space-y-2 max-h-[180px] overflow-y-auto">
            {itens.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <select
                  value={item.produto_id}
                  onChange={(e) => atualizarItem(index, 'produto_id', e.target.value)}
                  className="input-glass text-sm flex-1"
                >
                  <option value="">Selecione o produto</option>
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
                  placeholder="Qtd"
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
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-end pt-2">
            <div className="bg-quatrelati-gold-50 dark:bg-quatrelati-gold-900/20 px-4 py-2 rounded-xl">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total: </span>
              <span className="text-lg font-bold text-quatrelati-gold-600">
                {formatCurrency(calcularTotalPedido(itens, produtos))}
              </span>
            </div>
          </div>
        </div>

        {/* Seção: Entrega */}
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Entrega
            </h4>
            <div className="w-32">
              <Input
                label=""
                type="number"
                step="0.01"
                min="0"
                placeholder="Descarga R$"
                error={errors.preco_descarga_pallet?.message}
                {...register('preco_descarga_pallet')}
              />
            </div>
          </div>

          <Controller
            name="horario_recebimento"
            control={control}
            render={({ field }) => (
              <HorarioRecebimentoPicker
                value={field.value}
                onChange={field.onChange}
                error={errors.horario_recebimento?.message}
                label=""
              />
            )}
          />
        </div>

        {/* Observações */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Observações
          </label>
          <textarea
            placeholder="Observações do pedido (opcional)"
            className="input-glass w-full resize-none"
            rows={2}
            {...register('observacoes')}
          />
        </div>
      </form>
    </Modal>
  );
}
