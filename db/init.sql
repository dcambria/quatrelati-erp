-- =====================================================
-- Sistema de Gestão de Pedidos - Laticínio Quatrelati
-- Schema Inicial + Seeds
-- =====================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELAS
-- =====================================================

-- Usuários
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    nivel VARCHAR(20) DEFAULT 'user' CHECK (nivel IN ('superadmin', 'admin', 'user')),
    ativo BOOLEAN DEFAULT true,
    pode_visualizar_todos BOOLEAN DEFAULT false,
    primeiro_acesso BOOLEAN DEFAULT true,
    telefone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clientes
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    razao_social VARCHAR(200),
    cnpj_cpf VARCHAR(20),
    telefone VARCHAR(20),
    email VARCHAR(100),
    endereco TEXT,
    numero VARCHAR(20),
    complemento VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    endereco_entrega TEXT,
    numero_entrega VARCHAR(20),
    complemento_entrega VARCHAR(100),
    cidade_entrega VARCHAR(100),
    estado_entrega VARCHAR(2),
    cep_entrega VARCHAR(10),
    contato_nome VARCHAR(100),
    observacoes TEXT,
    logo_url VARCHAR(500),
    ativo BOOLEAN DEFAULT true,
    created_by INTEGER,
    vendedor_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Produtos
CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    peso_caixa_kg DECIMAL(10,3) NOT NULL,
    preco_padrao DECIMAL(10,2),
    ativo BOOLEAN DEFAULT true,
    imagem_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pedidos
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    data_pedido DATE NOT NULL,
    cliente_id INTEGER REFERENCES clientes(id),
    numero_pedido VARCHAR(20) UNIQUE NOT NULL,
    nf VARCHAR(20),
    data_entrega DATE,
    data_entrega_real DATE,
    produto_id INTEGER REFERENCES produtos(id),
    quantidade_caixas INTEGER NOT NULL,
    peso_kg DECIMAL(12,3) NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    total DECIMAL(14,2) NOT NULL,
    entregue BOOLEAN DEFAULT false,
    observacoes TEXT,
    created_by INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Itens de Pedido (múltiplos produtos por pedido)
CREATE TABLE pedido_itens (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES produtos(id),
    quantidade_caixas INTEGER NOT NULL,
    peso_kg DECIMAL(12,3) NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(14,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh Tokens
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Configurações do Sistema
CREATE TABLE configuracoes (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    descricao TEXT,
    updated_by INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Logs de Atividade
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES usuarios(id),
    user_nome VARCHAR(100),
    user_nivel VARCHAR(20),
    action VARCHAR(50) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    entity_name VARCHAR(200),
    details JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Magic Links
CREATE TABLE IF NOT EXISTS magic_links (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX idx_pedidos_data ON pedidos(data_pedido);
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_entrega ON pedidos(data_entrega);
CREATE INDEX idx_pedidos_status ON pedidos(entregue);
CREATE INDEX idx_pedidos_mes ON pedidos(EXTRACT(YEAR FROM data_pedido), EXTRACT(MONTH FROM data_pedido));
CREATE INDEX idx_pedidos_numero ON pedidos(numero_pedido);
CREATE INDEX idx_clientes_nome ON clientes(nome);
CREATE INDEX idx_produtos_nome ON produtos(nome);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity, entity_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_magic_links_token ON magic_links(token);
CREATE INDEX idx_pedido_itens_pedido ON pedido_itens(pedido_id);
CREATE INDEX idx_pedido_itens_produto ON pedido_itens(produto_id);

-- =====================================================
-- FUNÇÕES E TRIGGERS
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON pedidos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEEDS - USUÁRIOS
-- =====================================================
-- Senha padrão: Quatrelati@2026
-- Hash gerado com bcryptjs (10 rounds)
-- Para gerar novo hash: node backend/src/utils/generateHash.js

INSERT INTO usuarios (nome, email, senha_hash, nivel, ativo, primeiro_acesso) VALUES
('Daniel Cambria', 'daniel.cambria@bureau-it.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'superadmin', true, false),
('Wilson', 'wilson@laticinioquatrelati.com.br', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', true, false);

-- =====================================================
-- SEEDS - PRODUTOS (Manteigas)
-- =====================================================

INSERT INTO produtos (nome, descricao, peso_caixa_kg, preco_padrao, ativo) VALUES
('Manteiga Comum Sem Sal - Bloco 5kg', 'Manteiga comum sem sal, embalagem bloco 5kg', 5.000, 19.00, true),
('Manteiga Comum Sem Sal - Bloco 20kg', 'Manteiga comum sem sal, embalagem bloco 20kg', 20.000, 19.00, true),
('Manteiga de Primeira Qualidade Sem Sal - Bloco 5kg', 'Manteiga primeira qualidade sem sal, bloco 5kg', 5.000, 20.00, true),
('Manteiga de Primeira Qualidade Sem Sal - Bloco 20kg', 'Manteiga primeira qualidade sem sal, bloco 20kg', 20.000, 20.00, true),
('Manteiga Extra Sem Sal - Bloco 5kg', 'Manteiga extra sem sal, embalagem bloco 5kg', 5.000, 21.00, true),
('Manteiga Extra Sem Sal - Bloco 20kg', 'Manteiga extra sem sal, embalagem bloco 20kg', 20.000, 21.00, true),
('Manteiga - Pote 200g', 'Manteiga em pote, embalagem 200g', 0.200, 25.00, true),
('Manteiga - Pote 500g', 'Manteiga em pote, embalagem 500g', 0.500, 23.00, true);

-- =====================================================
-- SEEDS - CLIENTES
-- =====================================================

INSERT INTO clientes (nome, ativo) VALUES
('GVINAH', true),
('DALLORA', true),
('RC FOODS', true),
('CASTELÃO', true),
('MR. BEY - MBF', true),
('MEGA G', true),
('ALLFOOD/YEMA', true),
('APETITO', true),
('MPA-PETITO', true),
('CARDAMONE', true),
('VINHAIS CARAPIC', true),
('VINHAIS JACOFER', true),
('VINHAIS PAULINIA', true),
('JCA FOODS', true),
('FERPEREZ', true),
('KING FOOD', true),
('WGC - AMERICAN BROWNIE', true),
('BIG ALIMENTOS', true),
('EMPORIO MEGA 100', true),
('STOQ ALIMENTOS', true),
('CANAA', true),
('FORMAGGIO', true),
('ME OLIV CALISSI - DFCQUEIJOS', true),
('DALLORA ENTREMINAS', true),
('APETITO FOODS', true);

-- =====================================================
-- SEEDS - PEDIDOS (Janeiro/2026)
-- =====================================================

-- GVINAH (cliente_id = 1)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-02', 1, '251241', NULL, '2026-01-10', 1, 1400, 7000.000, 19.00, 133000.00, false),
('2025-12-02', 1, '251242', NULL, '2026-02-01', 1, 1400, 7000.000, 19.00, 133000.00, false);

-- DALLORA (cliente_id = 2)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-02', 2, '251243', NULL, '2026-01-10', 2, 400, 8000.000, 19.00, 152000.00, false),
('2025-12-09', 2, '251244', NULL, '2026-01-15', 2, 400, 8000.000, 19.00, 152000.00, false),
('2025-12-16', 2, '251245', NULL, '2026-01-22', 2, 400, 8000.000, 19.00, 152000.00, false),
('2025-12-23', 2, '251246', NULL, '2026-01-29', 2, 400, 8000.000, 19.00, 152000.00, false);

-- RC FOODS (cliente_id = 3)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-05', 3, '251247', NULL, '2026-01-08', 1, 200, 1000.000, 20.00, 20000.00, false),
('2025-12-19', 3, '251248', NULL, '2026-01-20', 1, 200, 1000.000, 20.00, 20000.00, false);

-- CASTELÃO (cliente_id = 4)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-03', 4, '251249', NULL, '2026-01-06', 3, 300, 1500.000, 20.00, 30000.00, false),
('2025-12-17', 4, '251250', NULL, '2026-01-20', 3, 300, 1500.000, 20.00, 30000.00, false);

-- MR. BEY - MBF (cliente_id = 5)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-10', 5, '251251', NULL, '2026-01-13', 5, 150, 750.000, 21.00, 15750.00, false),
('2025-12-24', 5, '251252', NULL, '2026-01-27', 5, 150, 750.000, 21.00, 15750.00, false);

-- MEGA G (cliente_id = 6)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-06', 6, '251253', NULL, '2026-01-09', 2, 250, 5000.000, 19.00, 95000.00, false);

-- ALLFOOD/YEMA (cliente_id = 7)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-08', 7, '251254', NULL, '2026-01-11', 4, 180, 3600.000, 20.00, 72000.00, false),
('2025-12-22', 7, '251255', NULL, '2026-01-25', 4, 180, 3600.000, 20.00, 72000.00, false);

-- APETITO (cliente_id = 8)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-04', 8, '251256', NULL, '2026-01-07', 6, 100, 2000.000, 21.00, 42000.00, false),
('2025-12-18', 8, '251257', NULL, '2026-01-21', 6, 100, 2000.000, 21.00, 42000.00, false);

-- MPA-PETITO (cliente_id = 9)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-11', 9, '251258', NULL, '2026-01-14', 1, 80, 400.000, 19.00, 7600.00, false);

-- CARDAMONE (cliente_id = 10)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-07', 10, '251259', NULL, '2026-01-10', 3, 120, 600.000, 20.00, 12000.00, false),
('2025-12-21', 10, '251260', NULL, '2026-01-24', 3, 120, 600.000, 20.00, 12000.00, false);

-- VINHAIS CARAPIC (cliente_id = 11)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-12', 11, '251261', NULL, '2026-01-15', 2, 200, 4000.000, 19.00, 76000.00, false);

-- VINHAIS JACOFER (cliente_id = 12)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-13', 12, '251262', NULL, '2026-01-16', 2, 150, 3000.000, 19.00, 57000.00, false);

-- VINHAIS PAULINIA (cliente_id = 13)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-14', 13, '251263', NULL, '2026-01-17', 2, 180, 3600.000, 19.00, 68400.00, false);

-- JCA FOODS (cliente_id = 14)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-09', 14, '251264', NULL, '2026-01-12', 5, 90, 450.000, 21.00, 9450.00, false);

-- FERPEREZ (cliente_id = 15)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-15', 15, '251265', NULL, '2026-01-18', 1, 60, 300.000, 19.00, 5700.00, false);

-- KING FOOD (cliente_id = 16)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-16', 16, '251266', NULL, '2026-01-19', 4, 220, 4400.000, 20.00, 88000.00, false);

-- WGC - AMERICAN BROWNIE (cliente_id = 17)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-17', 17, '251267', NULL, '2026-01-20', 6, 80, 1600.000, 21.00, 33600.00, false);

-- BIG ALIMENTOS (cliente_id = 18)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-18', 18, '251268', NULL, '2026-01-21', 2, 300, 6000.000, 19.00, 114000.00, false);

-- EMPORIO MEGA 100 (cliente_id = 19)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-19', 19, '251269', NULL, '2026-01-22', 7, 500, 100.000, 25.00, 2500.00, false);

-- STOQ ALIMENTOS (cliente_id = 20)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-20', 20, '251270', NULL, '2026-01-23', 3, 160, 800.000, 20.00, 16000.00, false);

-- CANAA (cliente_id = 21)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-21', 21, '251271', NULL, '2026-01-24', 1, 240, 1200.000, 19.00, 22800.00, false);

-- FORMAGGIO (cliente_id = 22)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-22', 22, '251272', NULL, '2026-01-25', 8, 400, 200.000, 23.00, 4600.00, false);

-- ME OLIV CALISSI - DFCQUEIJOS (cliente_id = 23)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-23', 23, '251273', NULL, '2026-01-26', 5, 70, 350.000, 21.00, 7350.00, false);

-- DALLORA ENTREMINAS (cliente_id = 24)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-24', 24, '251274', NULL, '2026-01-27', 2, 350, 7000.000, 19.00, 133000.00, false);

-- APETITO FOODS (cliente_id = 25)
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-25', 25, '251275', NULL, '2026-01-28', 6, 130, 2600.000, 21.00, 54600.00, false);

-- Pedidos adicionais para completar dados de exemplo
INSERT INTO pedidos (data_pedido, cliente_id, numero_pedido, nf, data_entrega, produto_id, quantidade_caixas, peso_kg, preco_unitario, total, entregue) VALUES
('2025-12-26', 1, '251276', NULL, '2026-01-29', 1, 800, 4000.000, 19.00, 76000.00, false),
('2025-12-27', 3, '251277', NULL, '2026-01-30', 3, 150, 750.000, 20.00, 15000.00, false),
('2025-12-28', 6, '251278', NULL, '2026-01-31', 4, 200, 4000.000, 20.00, 80000.00, false),
('2025-12-29', 8, '251279', NULL, '2026-01-31', 5, 180, 900.000, 21.00, 18900.00, false),
('2025-12-30', 10, '251280', NULL, '2026-01-31', 1, 100, 500.000, 19.00, 9500.00, false);

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Contagem final
DO $$
DECLARE
    v_usuarios INTEGER;
    v_clientes INTEGER;
    v_produtos INTEGER;
    v_pedidos INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_usuarios FROM usuarios;
    SELECT COUNT(*) INTO v_clientes FROM clientes;
    SELECT COUNT(*) INTO v_produtos FROM produtos;
    SELECT COUNT(*) INTO v_pedidos FROM pedidos;

    RAISE NOTICE '====================================';
    RAISE NOTICE 'SEEDS CARREGADOS COM SUCESSO!';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Usuários: %', v_usuarios;
    RAISE NOTICE 'Clientes: %', v_clientes;
    RAISE NOTICE 'Produtos: %', v_produtos;
    RAISE NOTICE 'Pedidos: %', v_pedidos;
    RAISE NOTICE '====================================';
END $$;
