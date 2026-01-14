-- Script para associar todos os clientes ao vendedor Wilson
-- Executar via: docker exec quatrelati-db psql -U quatrelati quatrelati_pedidos -f /scripts/associar-clientes-wilson.sql
-- Ou copiar e colar no pgAdmin/DBeaver

-- Verificar o ID do Wilson
SELECT id, nome, email FROM usuarios WHERE email = 'wilson@laticinioquatrelati.com.br';

-- Atualizar todos os clientes para serem do Wilson
UPDATE clientes
SET vendedor_id = (
    SELECT id FROM usuarios WHERE email = 'wilson@laticinioquatrelati.com.br'
)
WHERE vendedor_id IS NULL OR vendedor_id != (
    SELECT id FROM usuarios WHERE email = 'wilson@laticinioquatrelati.com.br'
);

-- Verificar resultado
SELECT
    COUNT(*) as total_clientes,
    COUNT(CASE WHEN vendedor_id = (SELECT id FROM usuarios WHERE email = 'wilson@laticinioquatrelati.com.br') THEN 1 END) as clientes_wilson
FROM clientes;
