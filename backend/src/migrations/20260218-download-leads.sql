-- Migration: Suporte a Download Leads
-- Data: 2026-02-18
-- Executar: psql $DATABASE_URL -f migrations/20260218-download-leads.sql

ALTER TABLE contatos_site
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(30) NOT NULL DEFAULT 'contato',
  ADD COLUMN IF NOT EXISTS token UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS email_confirmado_em TIMESTAMPTZ;

-- Index para lookup rápido por token (pixel/confirmação)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contatos_site_token
  ON contatos_site (token)
  WHERE token IS NOT NULL;

-- Index para filtrar por tipo
CREATE INDEX IF NOT EXISTS idx_contatos_site_tipo
  ON contatos_site (tipo);
