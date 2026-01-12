// =====================================================
// Testes de Integração - Produtos Routes
// =====================================================

const request = require('supertest');
const { createTestApp, createMockPool, generateTestToken, testData } = require('../testHelper');

const produtosRoutes = require('../../src/routes/produtos');

describe('Produtos Routes Integration', () => {
    let app;
    let mockPool;
    let adminToken;
    let userToken;

    beforeEach(() => {
        mockPool = createMockPool();
        app = createTestApp(mockPool);

        // Routes use their own authMiddleware internally
        app.use('/api/produtos', produtosRoutes);

        adminToken = generateTestToken({ id: 1, nivel: 'admin', pode_visualizar_todos: true });
        userToken = generateTestToken({ id: 2, nivel: 'vendedor', pode_visualizar_todos: false });
    });

    describe('GET /api/produtos', () => {
        it('deve listar todos os produtos', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    nome: 'Produto Teste',
                    descricao: 'Descrição teste',
                    peso_caixa_kg: 10.5,
                    preco_padrao: 100.00,
                    ativo: true,
                    total_pedidos: 10,
                    total_caixas_vendidas: 100,
                    valor_total_vendas: 10000.00
                }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/produtos')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('produtos');
            expect(Array.isArray(response.body.produtos)).toBe(true);
        });

        it('deve filtrar produtos por status ativo', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .get('/api/produtos?ativo=true')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve filtrar produtos por busca', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .get('/api/produtos?search=queijo')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve rejeitar requisição sem autenticação', async () => {
            const response = await request(app)
                .get('/api/produtos');

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/produtos/:id', () => {
        it('deve retornar produto específico', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    nome: 'Produto Teste',
                    descricao: 'Descrição teste',
                    peso_caixa_kg: 10.5,
                    preco_padrao: 100.00,
                    ativo: true,
                    total_pedidos: 10,
                    total_caixas_vendidas: 100,
                    peso_total_vendido: 1050,
                    valor_total_vendas: 10000.00
                }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/produtos/1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('produto');
            expect(response.body.produto).toHaveProperty('id', 1);
        });

        it('deve retornar 404 para produto inexistente', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .get('/api/produtos/999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('POST /api/produtos', () => {
        it('deve criar novo produto (admin)', async () => {
            // adminOnly uses req.userNivel from JWT (no DB query)
            // 1. INSERT produto
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    nome: 'Novo Produto',
                    descricao: 'Descrição',
                    peso_caixa_kg: 12.5,
                    preco_padrao: 150.00
                }],
                rowCount: 1
            });
            // 2. activityLogMiddleware: SELECT user for logging
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nome: 'Admin', nivel: 'admin' }],
                rowCount: 1
            });
            // 3. activityLogMiddleware: INSERT into activity_logs
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await request(app)
                .post('/api/produtos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nome: 'Novo Produto',
                    descricao: 'Descrição',
                    peso_caixa_kg: 12.5,
                    preco_padrao: 150.00
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('produto');
        });

        it('deve rejeitar criação por não-admin', async () => {
            // adminOnly rejects based on userNivel from JWT (no DB query)
            const response = await request(app)
                .post('/api/produtos')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    nome: 'Tentativa',
                    peso_caixa_kg: 10,
                    preco_padrao: 100
                });

            expect(response.status).toBe(403);
        });
    });

    describe('PUT /api/produtos/:id', () => {
        it('deve atualizar produto existente (admin)', async () => {
            // adminOnly uses req.userNivel from JWT (no DB query)
            // 1. UPDATE query
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    nome: 'Produto Atualizado',
                    peso_caixa_kg: 10.5,
                    preco_padrao: 200.00
                }],
                rowCount: 1
            });
            // 2. activityLogMiddleware: SELECT user for logging
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nome: 'Admin', nivel: 'admin' }],
                rowCount: 1
            });
            // 3. activityLogMiddleware: INSERT into activity_logs
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await request(app)
                .put('/api/produtos/1')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nome: 'Produto Atualizado',
                    peso_caixa_kg: 10.5,
                    preco_padrao: 200.00
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message');
        });

        it('deve retornar 404 para produto inexistente', async () => {
            // adminOnly uses req.userNivel from JWT (no DB query)
            // UPDATE returns empty (not found)
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .put('/api/produtos/999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ nome: 'Teste', peso_caixa_kg: 10 });

            expect(response.status).toBe(404);
        });

        it('deve rejeitar atualização por não-admin', async () => {
            // adminOnly rejects based on userNivel from JWT (no DB query)
            const response = await request(app)
                .put('/api/produtos/1')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ nome: 'Tentativa', peso_caixa_kg: 10 });

            expect(response.status).toBe(403);
        });
    });

    describe('DELETE /api/produtos/:id', () => {
        it('deve excluir produto sem pedidos (hard delete)', async () => {
            // adminOnly uses req.userNivel from JWT (no DB query)
            // 1. COUNT pedidos
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total: 0 }],
                rowCount: 1
            });
            // 2. DELETE produto
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, nome: 'Produto Excluído' }],
                rowCount: 1
            });
            // 3. activityLogMiddleware: SELECT user for logging
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nome: 'Admin', nivel: 'admin' }],
                rowCount: 1
            });
            // 4. activityLogMiddleware: INSERT into activity_logs
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await request(app)
                .delete('/api/produtos/1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toContain('excluído');
        });

        it('deve desativar produto com pedidos (soft delete)', async () => {
            // adminOnly uses req.userNivel from JWT (no DB query)
            // 1. COUNT pedidos (has pedidos)
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total: 5 }],
                rowCount: 1
            });
            // 2. UPDATE ativo=false (soft delete)
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, nome: 'Produto Desativado', ativo: false }],
                rowCount: 1
            });
            // 3. activityLogMiddleware: SELECT user for logging
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nome: 'Admin', nivel: 'admin' }],
                rowCount: 1
            });
            // 4. activityLogMiddleware: INSERT into activity_logs
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await request(app)
                .delete('/api/produtos/1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toContain('desativado');
        });

        it('deve retornar 404 para produto inexistente', async () => {
            // adminOnly uses req.userNivel from JWT (no DB query)
            // 1. COUNT pedidos
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total: 0 }],
                rowCount: 1
            });
            // 2. DELETE returns empty (not found)
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .delete('/api/produtos/999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });

        it('deve rejeitar exclusão por não-admin', async () => {
            // adminOnly rejects based on userNivel from JWT (no DB query)
            const response = await request(app)
                .delete('/api/produtos/1')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
        });

        it('deve retornar 404 para produto inexistente no soft delete', async () => {
            // 1. COUNT pedidos (has pedidos, so soft delete path)
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total: 5 }],
                rowCount: 1
            });
            // 2. UPDATE returns empty (product not found)
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .delete('/api/produtos/999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });

        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .delete('/api/produtos/1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/produtos - erros adicionais', () => {
        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/produtos')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/produtos/:id - erros adicionais', () => {
        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/produtos/1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('POST /api/produtos - erros adicionais', () => {
        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .post('/api/produtos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nome: 'Produto Teste',
                    peso_caixa_kg: 10,
                    preco_padrao: 100
                });

            expect(response.status).toBe(500);
        });
    });

    describe('PUT /api/produtos/:id - erros adicionais', () => {
        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .put('/api/produtos/1')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ nome: 'Teste', peso_caixa_kg: 10 });

            expect(response.status).toBe(500);
        });
    });
});
