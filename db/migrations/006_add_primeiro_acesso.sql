-- =====================================================
-- Migration 006: Campo de Primeiro Acesso
-- Marca se é o primeiro login do usuário
-- =====================================================

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS primeiro_acesso BOOLEAN DEFAULT true;

-- Marcar usuários existentes como já tendo acessado
UPDATE usuarios SET primeiro_acesso = false WHERE primeiro_acesso IS NULL;

-- Verificação
DO $$
BEGIN
    RAISE NOTICE 'Migration 006 aplicada com sucesso!';
    RAISE NOTICE 'Campo primeiro_acesso adicionado à tabela usuarios';
END $$;
