// =====================================================
// Testes de Integração - Clientes Routes
// =====================================================

const request = require('supertest');
const { createTestApp, createMockPool, generateTestToken, testData } = require('../testHelper');

const clientesRoutes = require('../../src/routes/clientes');

describe('Clientes Routes Integration', () => {
    let app;
    let mockPool;
    let adminToken;
    let userToken;

    beforeEach(() => {
        mockPool = createMockPool();
        app = createTestApp(mockPool);

        // Mock do middleware de auth para testes
        app.use((req, res, next) => {
            const authHeader = req.headers.authorization;
            if (authHeader) {
                const jwt = require('jsonwebtoken');
                try {
                    const token = authHeader.replace('Bearer ', '');
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-jwt-secret');
                    req.user = decoded;
                    req.userId = decoded.id;
                } catch (e) {
                    return res.status(401).json({ error: 'Token inválido' });
                }
            } else {
                return res.status(401).json({ error: 'Token não fornecido' });
            }
            next();
        });

        app.use('/api/clientes', clientesRoutes);

        adminToken = generateTestToken({ id: 1, nivel: 'admin', pode_visualizar_todos: true });
        userToken = generateTestToken({ id: 2, nivel: 'vendedor', pode_visualizar_todos: false });
    });

    describe('GET /api/clientes', () => {
        it('deve listar clientes para admin', async () => {
            // Mock para verificar nível do usuário
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            // Mock para listar clientes
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    nome: 'Cliente Teste',
                    cnpj_cpf: '12345678901234',
                    telefone: '11999999999',
                    email: 'cliente@test.com',
                    ativo: true,
                    total_pedidos: 5,
                    valor_total_pedidos: 5000.00
                }],
                rowCount: 1
            });
            // Mock para contagem
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total: 1 }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/clientes')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('clientes');
            expect(Array.isArray(response.body.clientes)).toBe(true);
            expect(response.body).toHaveProperty('pagination');
        });

        it('deve filtrar clientes por status ativo', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 });

            const response = await request(app)
                .get('/api/clientes?ativo=true')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve filtrar clientes por busca', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 });

            const response = await request(app)
                .get('/api/clientes?search=teste')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve filtrar clientes por vendedor para vendedor sem permissão', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'vendedor', pode_visualizar_todos: false }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 });

            const response = await request(app)
                .get('/api/clientes')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
        });

        it('deve rejeitar requisição sem autenticação', async () => {
            const response = await request(app)
                .get('/api/clientes');

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/clientes/:id', () => {
        it('deve retornar cliente específico', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    nome: 'Cliente Teste',
                    cnpj_cpf: '12345678901234',
                    telefone: '11999999999',
                    email: 'cliente@test.com',
                    ativo: true,
                    total_pedidos: 5,
                    valor_total_pedidos: 5000.00,
                    vendedor_nome: 'Vendedor Teste'
                }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/clientes/1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('cliente');
            expect(response.body.cliente).toHaveProperty('id', 1);
        });

        it('deve retornar 404 para cliente inexistente', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .get('/api/clientes/999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('GET /api/clientes/:id/pedidos', () => {
        it('deve retornar histórico de pedidos do cliente', async () => {
            // Mock para verificar se cliente existe
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, nome: 'Cliente Teste' }],
                rowCount: 1
            });
            // Mock para pedidos
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    numero_pedido: 'PED-2026-001',
                    data_pedido: '2026-01-01',
                    total: 1000,
                    produto_nome: 'Produto Teste'
                }],
                rowCount: 1
            });
            // Mock para contagem
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total: 1 }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/clientes/1/pedidos')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('cliente');
            expect(response.body).toHaveProperty('pedidos');
            expect(response.body).toHaveProperty('pagination');
        });

        it('deve retornar 404 para cliente inexistente', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .get('/api/clientes/999/pedidos')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('POST /api/clientes', () => {
        it('deve criar novo cliente', async () => {
            // 1. Mock para verificar nível do usuário (route logic)
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin' }],
                rowCount: 1
            });
            // 2. Mock para INSERT cliente
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    nome: 'Novo Cliente',
                    telefone: '11988888888',
                    email: 'novo@cliente.com'
                }],
                rowCount: 1
            });
            // 3. Mock for activityLogMiddleware: SELECT user for logging
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nome: 'Admin', nivel: 'admin' }],
                rowCount: 1
            });
            // 4. Mock for activityLogMiddleware: INSERT into activity_logs
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await request(app)
                .post('/api/clientes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nome: 'Novo Cliente',
                    telefone: '11988888888',
                    email: 'novo@cliente.com'
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('cliente');
        });

        it('deve rejeitar CNPJ/CPF duplicado', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin' }],
                rowCount: 1
            });
            mockPool.query.mockRejectedValueOnce({ code: '23505' });

            const response = await request(app)
                .post('/api/clientes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nome: 'Cliente Duplicado',
                    cnpj_cpf: '12345678901234'
                });

            expect(response.status).toBe(400);
        });
    });

    describe('PUT /api/clientes/:id', () => {
        it('deve atualizar cliente existente (admin)', async () => {
            // Mock para verificar nível
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin' }],
                rowCount: 1
            });
            // Mock para buscar cliente atual
            mockPool.query.mockResolvedValueOnce({
                rows: [{ vendedor_id: 2 }],
                rowCount: 1
            });
            // Mock para atualizar
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    nome: 'Cliente Atualizado',
                    cnpj_cpf: '12345678901234'
                }],
                rowCount: 1
            });

            const response = await request(app)
                .put('/api/clientes/1')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nome: 'Cliente Atualizado',
                    observacoes: 'Atualizado via teste'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message');
        });

        it('deve rejeitar edição por vendedor não autorizado', async () => {
            // Mock para verificar nível
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'vendedor' }],
                rowCount: 1
            });
            // Mock para buscar cliente atual (pertence a outro vendedor)
            mockPool.query.mockResolvedValueOnce({
                rows: [{ vendedor_id: 99 }],
                rowCount: 1
            });

            const response = await request(app)
                .put('/api/clientes/1')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ nome: 'Tentativa' });

            expect(response.status).toBe(403);
        });

        it('deve retornar 404 para cliente inexistente', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin' }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .put('/api/clientes/999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ nome: 'Teste' });

            expect(response.status).toBe(404);
        });
    });

    describe('DELETE /api/clientes/:id', () => {
        it('deve excluir cliente sem pedidos (hard delete)', async () => {
            // Mock para verificar nível
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin' }],
                rowCount: 1
            });
            // Mock para buscar cliente
            mockPool.query.mockResolvedValueOnce({
                rows: [{ vendedor_id: 1 }],
                rowCount: 1
            });
            // Mock para verificar pedidos
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total: 0 }],
                rowCount: 1
            });
            // Mock para deletar
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, nome: 'Cliente Excluído' }],
                rowCount: 1
            });

            const response = await request(app)
                .delete('/api/clientes/1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toContain('excluído');
        });

        it('deve desativar cliente com pedidos (soft delete)', async () => {
            // Mock para verificar nível
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin' }],
                rowCount: 1
            });
            // Mock para buscar cliente
            mockPool.query.mockResolvedValueOnce({
                rows: [{ vendedor_id: 1 }],
                rowCount: 1
            });
            // Mock para verificar pedidos (tem pedidos)
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total: 5 }],
                rowCount: 1
            });
            // Mock para soft delete
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, nome: 'Cliente Desativado', ativo: false }],
                rowCount: 1
            });

            const response = await request(app)
                .delete('/api/clientes/1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toContain('desativado');
        });

        it('deve retornar 404 para cliente inexistente', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin' }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .delete('/api/clientes/999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });

        it('deve rejeitar exclusão por vendedor não autorizado', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'vendedor' }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({
                rows: [{ vendedor_id: 99 }],
                rowCount: 1
            });

            const response = await request(app)
                .delete('/api/clientes/1')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
        });

        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .delete('/api/clientes/1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/clientes - erros adicionais', () => {
        it('deve filtrar por vendedor_id como admin', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 });

            const response = await request(app)
                .get('/api/clientes?vendedor_id=5')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/clientes')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/clientes/:id - erros adicionais', () => {
        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/clientes/1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/clientes/:id/pedidos - erros adicionais', () => {
        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/clientes/1/pedidos')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('POST /api/clientes - erros adicionais', () => {
        it('deve retornar 500 em caso de erro não tratado', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin' }],
                rowCount: 1
            });
            mockPool.query.mockRejectedValueOnce(new Error('Unknown Error'));

            const response = await request(app)
                .post('/api/clientes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nome: 'Cliente Teste',
                    telefone: '11999999999'
                });

            expect(response.status).toBe(500);
        });
    });

    describe('PUT /api/clientes/:id - erros adicionais', () => {
        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .put('/api/clientes/1')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ nome: 'Teste' });

            expect(response.status).toBe(500);
        });
    });

    describe('POST /api/clientes - erro CNPJ duplicado', () => {
        it('deve retornar 400 quando CNPJ/CPF já existe (código 23505)', async () => {
            // Mock verificação de nível
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin' }],
                rowCount: 1
            });

            // Simular erro de constraint unique do PostgreSQL
            const duplicateError = new Error('duplicate key value violates unique constraint');
            duplicateError.code = '23505';
            mockPool.query.mockRejectedValueOnce(duplicateError);

            const response = await request(app)
                .post('/api/clientes')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nome: 'Cliente Duplicado',
                    cnpj_cpf: '529.982.247-25', // CPF válido
                    telefone: '(11) 99999-9999'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('CNPJ/CPF já cadastrado');
        });
    });
});
