-- =====================================================
-- Migration 005: Campos de endereço completo
-- Adiciona número, complemento e endereço de entrega
-- =====================================================

-- Campos para endereço principal
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS numero VARCHAR(20);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS complemento VARCHAR(100);

-- Campos para endereço de entrega
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cep_entrega VARCHAR(10);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS numero_entrega VARCHAR(20);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS complemento_entrega VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cidade_entrega VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS estado_entrega VARCHAR(2);

-- Verificação
DO $$
BEGIN
    RAISE NOTICE 'Migration 005 aplicada com sucesso!';
    RAISE NOTICE 'Novos campos adicionados à tabela clientes:';
    RAISE NOTICE '  - numero, complemento';
    RAISE NOTICE '  - cep_entrega, numero_entrega, complemento_entrega';
    RAISE NOTICE '  - cidade_entrega, estado_entrega';
END $$;
