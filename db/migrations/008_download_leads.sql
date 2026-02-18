-- Migration 008: Suporte a Download Leads
-- Data: 2026-02-18
-- Executar: psql $DATABASE_URL -f db/migrations/008_download_leads.sql

ALTER TABLE contatos_site
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(30) NOT NULL DEFAULT 'contato',
  ADD COLUMN IF NOT EXISTS token UUID,
  ADD COLUMN IF NOT EXISTS email_confirmado_em TIMESTAMPTZ;

-- Index para lookup rápido por token (pixel/confirmação)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contatos_site_token
  ON contatos_site (token)
  WHERE token IS NOT NULL;

-- Index para filtrar por tipo
CREATE INDEX IF NOT EXISTS idx_contatos_site_tipo
  ON contatos_site (tipo);

-- Estender CHECK constraint de status para incluir 'pendente' (usado por download leads)
ALTER TABLE contatos_site
  DROP CONSTRAINT IF EXISTS contatos_site_status_check;

ALTER TABLE contatos_site
  ADD CONSTRAINT contatos_site_status_check
    CHECK (status IN ('pendente', 'novo', 'em_atendimento', 'convertido', 'descartado'));

DO $$ BEGIN RAISE NOTICE 'Migration 008 aplicada: tipo/token/email_confirmado_em + status pendente'; END $$;
