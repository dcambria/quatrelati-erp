-- =====================================================
-- Migration 007: Tabela de Contatos do Site
-- Armazena mensagens recebidas via formulário de contato
-- =====================================================

CREATE TABLE IF NOT EXISTS contatos_site (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    empresa VARCHAR(200),
    email VARCHAR(100),
    telefone VARCHAR(20),
    mensagem TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'novo' CHECK (status IN ('novo', 'em_atendimento', 'convertido', 'descartado')),
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    atendido_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    observacoes_internas TEXT,
    recebido_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contatos_site_status ON contatos_site(status);
CREATE INDEX IF NOT EXISTS idx_contatos_site_recebido_em ON contatos_site(recebido_em DESC);

DO $$
BEGIN
    RAISE NOTICE 'Migration 007 aplicada com sucesso!';
    RAISE NOTICE 'Tabela contatos_site criada';
END $$;
