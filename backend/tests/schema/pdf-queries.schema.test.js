// =====================================================
// Testes de Schema - Validação de Queries PDF
// v1.0.0 - Testa queries contra schema real do PostgreSQL
// =====================================================
//
// IMPORTANTE: Este teste roda contra o banco de dados REAL
// para validar que as queries SQL usam colunas existentes.
//
// Para rodar: npm run test:schema
// Requer: DATABASE_URL configurado ou Docker rodando
// =====================================================

const { Pool } = require('pg');

describe('PDF Export Queries - Schema Validation', () => {
    let pool;

    beforeAll(async () => {
        // Conectar ao banco real (Docker ou local)
        // Porta 5434 é mapeada do Docker para o host
        const connectionString = process.env.DATABASE_URL ||
            'postgres://quatrelati:quatrelati2026@localhost:5434/quatrelati_pedidos';

        pool = new Pool({ connectionString });

        // Verificar conexão
        try {
            await pool.query('SELECT 1');
        } catch (error) {
            console.error('Erro ao conectar ao banco:', error.message);
            console.error('Certifique-se que o Docker está rodando: docker-compose up -d');
            throw error;
        }
    });

    afterAll(async () => {
        if (pool) {
            await pool.end();
        }
    });

    describe('Query do PDF Individual (/:id/pdf)', () => {
        it('deve executar a query sem erros de coluna inexistente', async () => {
            // Query extraída de pedidos.js - GET /:id/pdf
            // IMPORTANTE: Esta query deve corresponder EXATAMENTE à query em pedidos.js
            const query = `
                SELECT p.*,
                    c.nome as cliente_nome,
                    COALESCE(c.razao_social, c.nome) as cliente_razao_social,
                    c.cnpj_cpf as cliente_cnpj,
                    c.telefone as cliente_telefone,
                    c.email as cliente_email,
                    c.endereco as cliente_endereco,
                    COALESCE(c.endereco_entrega, c.endereco) as cliente_endereco_entrega,
                    c.cidade as cliente_cidade,
                    c.estado as cliente_estado,
                    c.cep as cliente_cep,
                    c.contato_nome as cliente_contato,
                    c.observacoes as cliente_observacoes,
                    u.nome as vendedor_nome,
                    u.telefone as vendedor_telefone,
                    u.email as vendedor_email
                FROM pedidos p
                LEFT JOIN clientes c ON p.cliente_id = c.id
                LEFT JOIN usuarios u ON p.created_by = u.id
                WHERE p.id = $1
            `;

            // Executar com ID que não existe - não importa o resultado,
            // queremos validar que a query é válida sintaticamente
            const result = await pool.query(query, [999999]);

            // Se chegou aqui, a query é válida
            expect(result).toBeDefined();
            expect(result.rows).toBeDefined();
        });

        it('deve validar que todas as colunas referenciadas existem', async () => {
            // Verificar colunas da tabela clientes
            const clientesSchema = await pool.query(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'clientes'
            `);
            const clientesCols = clientesSchema.rows.map(r => r.column_name);

            // Todas as colunas que a query do PDF usa da tabela clientes
            const colunasUsadas = [
                'nome', 'razao_social', 'cnpj_cpf', 'telefone', 'email',
                'endereco', 'endereco_entrega', 'cidade', 'estado', 'cep',
                'contato_nome', 'observacoes'
            ];

            for (const col of colunasUsadas) {
                expect(clientesCols).toContain(col);
            }
        });
    });

    describe('Query do PDF Lista (/exportar/pdf)', () => {
        it('deve executar a query de listagem sem erros', async () => {
            // Query simplificada de pedidos.js - GET /exportar/pdf
            const query = `
                SELECT
                    p.id,
                    p.numero_pedido,
                    p.data_pedido,
                    p.data_entrega,
                    p.nf,
                    p.quantidade_caixas,
                    p.peso_kg,
                    p.preco_unitario,
                    p.total,
                    p.entregue,
                    p.observacoes,
                    c.nome as cliente_nome,
                    u.nome as vendedor_nome
                FROM pedidos p
                LEFT JOIN clientes c ON p.cliente_id = c.id
                LEFT JOIN usuarios u ON p.created_by = u.id
                LIMIT 1
            `;

            const result = await pool.query(query);
            expect(result).toBeDefined();
        });
    });

    describe('Query de Itens do Pedido', () => {
        it('deve executar a query de itens sem erros', async () => {
            const query = `
                SELECT pi.*, pr.nome as produto_nome, pr.peso_caixa_kg
                FROM pedido_itens pi
                LEFT JOIN produtos pr ON pi.produto_id = pr.id
                WHERE pi.pedido_id = $1
                ORDER BY pi.id
            `;

            const result = await pool.query(query, [999999]);
            expect(result).toBeDefined();
        });
    });

    describe('Schema da tabela clientes', () => {
        it('deve ter as colunas essenciais', async () => {
            const result = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'clientes'
                ORDER BY ordinal_position
            `);

            const colunas = result.rows.map(r => r.column_name);

            // Colunas obrigatórias
            expect(colunas).toContain('id');
            expect(colunas).toContain('nome');
            expect(colunas).toContain('cnpj_cpf');
            expect(colunas).toContain('telefone');
            expect(colunas).toContain('email');
            expect(colunas).toContain('endereco');
        });

        it('deve ter as colunas estendidas para PDF e formulário', async () => {
            const result = await pool.query(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'clientes'
            `);

            const colunas = result.rows.map(r => r.column_name);

            // Colunas adicionais usadas no PDF e formulário de clientes
            const colunasExtendidas = [
                'razao_social',
                'endereco_entrega',
                'cidade',
                'estado',
                'cep',
                'contato_nome',
                'logo_url'
            ];

            for (const col of colunasExtendidas) {
                expect(colunas).toContain(col);
            }
        });
    });

    describe('Schema da tabela pedidos', () => {
        it('deve ter as colunas usadas no PDF', async () => {
            const result = await pool.query(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'pedidos'
            `);

            const colunas = result.rows.map(r => r.column_name);

            const colunasNecessarias = [
                'id', 'numero_pedido', 'data_pedido', 'data_entrega',
                'cliente_id', 'quantidade_caixas', 'peso_kg',
                'preco_unitario', 'total', 'entregue', 'nf', 'observacoes'
            ];

            for (const col of colunasNecessarias) {
                expect(colunas).toContain(col);
            }
        });
    });

    describe('Schema da tabela usuarios', () => {
        it('deve ter as colunas usadas no PDF', async () => {
            const result = await pool.query(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'usuarios'
            `);

            const colunas = result.rows.map(r => r.column_name);

            expect(colunas).toContain('nome');
            expect(colunas).toContain('telefone');
            expect(colunas).toContain('email');
        });
    });
});
