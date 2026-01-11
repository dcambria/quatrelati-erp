-- =====================================================
-- Migração: Adicionar campos razao_social e entrega
-- Data: 2026-01-10
-- =====================================================

-- Adicionar razao_social ao cliente
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS razao_social VARCHAR(250);

-- Adicionar campos de entrega ao pedido
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS preco_descarga_pallet DECIMAL(10,2);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS horario_recebimento VARCHAR(100);

-- Comentários
COMMENT ON COLUMN clientes.razao_social IS 'Razão social completa do cliente';
COMMENT ON COLUMN pedidos.preco_descarga_pallet IS 'Preço a pagar por descarregar pallet (R$)';
COMMENT ON COLUMN pedidos.horario_recebimento IS 'Horário de recebimento do cliente';
