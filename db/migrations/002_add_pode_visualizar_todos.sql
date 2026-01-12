-- Migração 002: Adicionar coluna pode_visualizar_todos na tabela usuarios
-- Permite controle granular de quais usuários podem ver todos os pedidos

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS pode_visualizar_todos BOOLEAN DEFAULT FALSE;

-- Usuários admin e superadmin devem ter esta permissão por padrão
UPDATE usuarios SET pode_visualizar_todos = TRUE WHERE nivel IN ('admin', 'superadmin');
