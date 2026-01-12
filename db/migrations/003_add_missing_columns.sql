-- Migração 003: Adicionar colunas faltantes
-- Colunas adicionadas durante testes E2E

-- Tabela usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pode_visualizar_todos BOOLEAN DEFAULT FALSE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);

-- Tabela produtos
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS imagem_url VARCHAR(500);

-- Tabela clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES usuarios(id);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS vendedor_id INTEGER REFERENCES usuarios(id);

-- Atualizar permissões padrão
UPDATE usuarios SET pode_visualizar_todos = TRUE WHERE nivel IN ('admin', 'superadmin') AND pode_visualizar_todos IS NULL;
