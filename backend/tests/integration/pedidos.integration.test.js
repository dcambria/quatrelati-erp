// =====================================================
// Testes de Integração - Pedidos Routes
// =====================================================

const request = require('supertest');
const { createTestApp, createMockPool, generateTestToken } = require('../testHelper');

const pedidosRoutes = require('../../src/routes/pedidos');

describe('Pedidos Routes Integration', () => {
    let app;
    let mockPool;
    let adminToken;
    let userToken;

    beforeEach(() => {
        mockPool = createMockPool();
        app = createTestApp(mockPool);

        // Montar rotas (usam authMiddleware internamente)
        app.use('/api/pedidos', pedidosRoutes);

        adminToken = generateTestToken({ id: 1, nivel: 'admin', pode_visualizar_todos: true });
        userToken = generateTestToken({ id: 2, nivel: 'vendedor', pode_visualizar_todos: false });
    });

    describe('GET /api/pedidos', () => {
        it('deve listar pedidos para admin', async () => {
            // Mock para verificar nível do usuário
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            // Mock para lista de pedidos
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    numero_pedido: 'PED-2026-001',
                    data_pedido: '2026-01-01',
                    cliente_nome: 'Cliente Teste',
                    produto_nome: 'Produto Teste',
                    quantidade_caixas: 10,
                    peso_kg: 105,
                    total: 1000.00,
                    entregue: false
                }],
                rowCount: 1
            });
            // Mock para contagem total
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total: 1 }],
                rowCount: 1
            });
            // Mock para totais
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total_pedidos: 1000, total_caixas: 10, total_peso: 105 }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/pedidos')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('pedidos');
            expect(Array.isArray(response.body.pedidos)).toBe(true);
        });

        it('deve filtrar por mês/ano', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 });
            mockPool.query.mockResolvedValueOnce({ rows: [{}], rowCount: 1 });

            const response = await request(app)
                .get('/api/pedidos?mes=1&ano=2026')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve filtrar por cliente', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 });
            mockPool.query.mockResolvedValueOnce({ rows: [{}], rowCount: 1 });

            const response = await request(app)
                .get('/api/pedidos?cliente_id=1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve filtrar por status de entrega', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 });
            mockPool.query.mockResolvedValueOnce({ rows: [{}], rowCount: 1 });

            const response = await request(app)
                .get('/api/pedidos?status=entregue')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve paginar resultados', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: 100 }], rowCount: 1 });
            mockPool.query.mockResolvedValueOnce({ rows: [{}], rowCount: 1 });

            const response = await request(app)
                .get('/api/pedidos?page=2&limit=10')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('pagination');
        });

        it('deve rejeitar requisição sem autenticação', async () => {
            const response = await request(app)
                .get('/api/pedidos');

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/pedidos/:id', () => {
        it('deve retornar pedido específico', async () => {
            // Mock for SELECT pedido with JOINs
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    numero_pedido: 'PED-2026-001',
                    data_pedido: '2026-01-01',
                    cliente_id: 1,
                    cliente_nome: 'Cliente Teste',
                    produto_id: 1,
                    produto_nome: 'Produto Teste',
                    quantidade_caixas: 10,
                    peso_kg: 105,
                    preco_unitario: 100,
                    total: 1000,
                    entregue: false
                }],
                rowCount: 1
            });
            // Mock for SELECT pedido_itens
            mockPool.query.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });

            const response = await request(app)
                .get('/api/pedidos/1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            // Route returns { pedido: { id: ... } }
            expect(response.body).toHaveProperty('pedido');
            expect(response.body.pedido).toHaveProperty('id', 1);
        });

        it('deve retornar 404 para pedido inexistente', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .get('/api/pedidos/999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('POST /api/pedidos', () => {
        it('deve criar novo pedido', async () => {
            // POST /api/pedidos uses db.connect() for transaction
            // The route expects { data_pedido, cliente_id, itens: [...] }
            const mockClient = {
                query: jest.fn(),
                release: jest.fn()
            };
            mockPool.connect.mockResolvedValueOnce(mockClient);

            // Transaction queries (via client.query):
            // 1. BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            // 2. SELECT ultimo numero do mês
            mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            // 3. SELECT produto info
            mockClient.query.mockResolvedValueOnce({
                rows: [{ peso_caixa_kg: 10.5, preco_padrao: 100.00 }],
                rowCount: 1
            });
            // 4. INSERT pedido
            mockClient.query.mockResolvedValueOnce({
                rows: [{ id: 1, numero_pedido: '260101' }],
                rowCount: 1
            });
            // 5. INSERT pedido_item
            mockClient.query.mockResolvedValueOnce({
                rows: [{ id: 1 }],
                rowCount: 1
            });
            // 6. COMMIT
            mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            // After COMMIT, uses req.db.query (mockPool.query):
            // 7. SELECT pedidoCompleto with JOIN
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    numero_pedido: '260101',
                    cliente_nome: 'Cliente Teste'
                }],
                rowCount: 1
            });
            // 8. SELECT itens do pedido
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    pedido_id: 1,
                    produto_id: 1,
                    quantidade_caixas: 10,
                    produto_nome: 'Produto Teste'
                }],
                rowCount: 1
            });

            const response = await request(app)
                .post('/api/pedidos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    data_pedido: '2026-01-15',
                    cliente_id: 1,
                    itens: [{
                        produto_id: 1,
                        quantidade_caixas: 10,
                        preco_unitario: 100
                    }]
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('pedido');
        });

        it('deve validar campos obrigatórios', async () => {
            const response = await request(app)
                .post('/api/pedidos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});

            expect(response.status).toBe(400);
        });

        it('deve rejeitar pedido sem itens', async () => {
            const response = await request(app)
                .post('/api/pedidos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    data_pedido: '2026-01-15',
                    cliente_id: 1,
                    itens: []
                });

            expect(response.status).toBe(400);
        });
    });

    describe('PUT /api/pedidos/:id', () => {
        it('deve atualizar pedido existente', async () => {
            // Mock para verificar se pedido existe
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, numero_pedido: 'PED-2026-001' }],
                rowCount: 1
            });
            // Mock para obter preço do produto
            mockPool.query.mockResolvedValueOnce({
                rows: [{ preco_padrao: 100, peso_caixa_kg: 10.5 }],
                rowCount: 1
            });
            // Mock para atualizar
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1 }],
                rowCount: 1
            });

            const response = await request(app)
                .put('/api/pedidos/1')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    quantidade_caixas: 20,
                    observacoes: 'Atualizado'
                });

            expect(response.status).toBe(200);
        });

        it('deve retornar 404 para pedido inexistente', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .put('/api/pedidos/999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ quantidade_caixas: 20 });

            expect(response.status).toBe(404);
        });
    });

    describe('DELETE /api/pedidos/:id', () => {
        it('deve excluir pedido existente', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1 }],
                rowCount: 1
            });

            const response = await request(app)
                .delete('/api/pedidos/1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve retornar 404 para pedido inexistente', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .delete('/api/pedidos/999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('PATCH /api/pedidos/:id/entregar', () => {
        it('deve marcar pedido como entregue', async () => {
            // UPDATE pedidos RETURNING *
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, entregue: true, data_entrega_real: '2026-01-15', numero_pedido: '260101' }],
                rowCount: 1
            });
            // activityLogMiddleware: SELECT user for logging
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nome: 'Admin', nivel: 'admin' }],
                rowCount: 1
            });
            // activityLogMiddleware: INSERT into activity_logs
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await request(app)
                .patch('/api/pedidos/1/entregar')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ data_entrega_real: '2026-01-15' });

            expect(response.status).toBe(200);
            // Route returns { message: '...', pedido: { entregue: true } }
            expect(response.body).toHaveProperty('pedido');
            expect(response.body.pedido).toHaveProperty('entregue', true);
        });

        it('deve retornar 404 para pedido inexistente', async () => {
            // UPDATE returns empty (not found)
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .patch('/api/pedidos/999/entregar')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({}); // Route expects body for destructuring

            expect(response.status).toBe(404);
        });
    });

    describe('PATCH /api/pedidos/:id/reverter-entrega', () => {
        it('deve reverter status de entrega', async () => {
            // UPDATE pedidos RETURNING *
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, entregue: false, data_entrega_real: null, numero_pedido: '260101' }],
                rowCount: 1
            });
            // activityLogMiddleware: SELECT user for logging
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nome: 'Admin', nivel: 'admin' }],
                rowCount: 1
            });
            // activityLogMiddleware: INSERT into activity_logs
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await request(app)
                .patch('/api/pedidos/1/reverter-entrega')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            // Route returns { message: '...', pedido: { entregue: false } }
            expect(response.body).toHaveProperty('pedido');
            expect(response.body.pedido).toHaveProperty('entregue', false);
        });

        it('deve retornar 404 para pedido inexistente', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .patch('/api/pedidos/999/reverter-entrega')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('GET /api/pedidos - filtros adicionais', () => {
        it('deve filtrar por ano sem mês', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 });
            mockPool.query.mockResolvedValueOnce({ rows: [{}], rowCount: 1 });

            const response = await request(app)
                .get('/api/pedidos?ano=2026')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve filtrar por produto', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 });
            mockPool.query.mockResolvedValueOnce({ rows: [{}], rowCount: 1 });

            const response = await request(app)
                .get('/api/pedidos?produto_id=1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve filtrar por vendedor quando admin', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total_kg: 0, total_valor: 0, total_caixas: 0 }], rowCount: 1 });

            const response = await request(app)
                .get('/api/pedidos?vendedor_id=2')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve restringir pedidos para vendedor sem permissão', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'vendedor', pode_visualizar_todos: false }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 });
            mockPool.query.mockResolvedValueOnce({ rows: [{}], rowCount: 1 });

            const response = await request(app)
                .get('/api/pedidos')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
        });

        it('deve retornar 500 em caso de erro', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/pedidos')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/pedidos/:id - erros', () => {
        it('deve retornar 500 em caso de erro', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/pedidos/1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('POST /api/pedidos - erros', () => {
        it('deve retornar 500 em caso de erro no banco', async () => {
            const mockClient = {
                query: jest.fn(),
                release: jest.fn()
            };
            mockPool.connect.mockResolvedValueOnce(mockClient);

            // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // SELECT ultimo numero - throws error
            mockClient.query.mockRejectedValueOnce(new Error('DB Error'));
            // ROLLBACK
            mockClient.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .post('/api/pedidos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    data_pedido: '2026-01-15',
                    cliente_id: 1,
                    itens: [{
                        produto_id: 1,
                        quantidade_caixas: 10,
                        preco_unitario: 100
                    }]
                });

            expect(response.status).toBe(500);
        });

        it('deve retornar 400 para produto não encontrado', async () => {
            const mockClient = {
                query: jest.fn(),
                release: jest.fn()
            };
            mockPool.connect.mockResolvedValueOnce(mockClient);

            // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // SELECT ultimo numero
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // SELECT produto - not found
            mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            // ROLLBACK
            mockClient.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .post('/api/pedidos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    data_pedido: '2026-01-15',
                    cliente_id: 1,
                    itens: [{
                        produto_id: 999,
                        quantidade_caixas: 10,
                        preco_unitario: 100
                    }]
                });

            expect(response.status).toBe(400);
        });
    });

    describe('PUT /api/pedidos/:id - com itens', () => {
        it('deve atualizar pedido com itens usando transação', async () => {
            const mockClient = {
                query: jest.fn(),
                release: jest.fn()
            };
            mockPool.connect.mockResolvedValueOnce(mockClient);

            // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // SELECT pedido exists
            mockClient.query.mockResolvedValueOnce({
                rows: [{ id: 1 }],
                rowCount: 1
            });
            // SELECT produto
            mockClient.query.mockResolvedValueOnce({
                rows: [{ peso_caixa_kg: 10.5 }],
                rowCount: 1
            });
            // UPDATE pedido
            mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
            // DELETE itens antigos
            mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
            // INSERT novo item
            mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
            // COMMIT
            mockClient.query.mockResolvedValueOnce({ rows: [] });

            // SELECT pedido completo
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, cliente_nome: 'Cliente' }],
                rowCount: 1
            });
            // SELECT itens
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, produto_nome: 'Produto' }],
                rowCount: 1
            });
            // activityLogMiddleware
            mockPool.query.mockResolvedValueOnce({ rows: [{ nome: 'Admin', nivel: 'admin' }] });
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .put('/api/pedidos/1')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    data_pedido: '2026-01-15',
                    cliente_id: 1,
                    itens: [{
                        produto_id: 1,
                        quantidade_caixas: 20,
                        preco_unitario: 100
                    }]
                });

            expect(response.status).toBe(200);
        });

        it('deve retornar 404 se pedido não existe na atualização com itens', async () => {
            const mockClient = {
                query: jest.fn(),
                release: jest.fn()
            };
            mockPool.connect.mockResolvedValueOnce(mockClient);

            // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // SELECT pedido - not found
            mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            // ROLLBACK
            mockClient.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .put('/api/pedidos/999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    data_pedido: '2026-01-15',
                    cliente_id: 1,
                    itens: [{
                        produto_id: 1,
                        quantidade_caixas: 20,
                        preco_unitario: 100
                    }]
                });

            expect(response.status).toBe(404);
        });

        it('deve retornar 400 se produto não existe na atualização', async () => {
            const mockClient = {
                query: jest.fn(),
                release: jest.fn()
            };
            mockPool.connect.mockResolvedValueOnce(mockClient);

            // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // SELECT pedido - exists
            mockClient.query.mockResolvedValueOnce({
                rows: [{ id: 1 }],
                rowCount: 1
            });
            // SELECT produto - not found
            mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            // ROLLBACK
            mockClient.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .put('/api/pedidos/1')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    data_pedido: '2026-01-15',
                    cliente_id: 1,
                    itens: [{
                        produto_id: 999,
                        quantidade_caixas: 20,
                        preco_unitario: 100
                    }]
                });

            expect(response.status).toBe(400);
        });
    });

    describe('DELETE /api/pedidos/:id - erros', () => {
        it('deve retornar 500 em caso de erro', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .delete('/api/pedidos/1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('PATCH /api/pedidos/:id/entregar - erros', () => {
        it('deve retornar 500 em caso de erro', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .patch('/api/pedidos/1/entregar')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});

            expect(response.status).toBe(500);
        });
    });

    describe('PATCH /api/pedidos/:id/reverter-entrega - erros', () => {
        it('deve retornar 500 em caso de erro', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .patch('/api/pedidos/1/reverter-entrega')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('POST /api/pedidos - número sequencial existente', () => {
        it('deve incrementar número quando já existe pedido no mês', async () => {
            const mockClient = {
                query: jest.fn(),
                release: jest.fn()
            };
            mockPool.connect.mockResolvedValueOnce(mockClient);

            // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // SELECT ultimo numero - retorna pedido existente
            mockClient.query.mockResolvedValueOnce({
                rows: [{ numero_pedido: '26010105' }],
                rowCount: 1
            });
            // SELECT produto
            mockClient.query.mockResolvedValueOnce({
                rows: [{ peso_caixa_kg: 10.5, preco_padrao: 100 }],
                rowCount: 1
            });
            // INSERT pedido
            mockClient.query.mockResolvedValueOnce({
                rows: [{ id: 2, numero_pedido: '26010106' }],
                rowCount: 1
            });
            // INSERT item
            mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
            // COMMIT
            mockClient.query.mockResolvedValueOnce({ rows: [] });

            // SELECT pedido completo
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 2, numero_pedido: '26010106', cliente_nome: 'Cliente' }],
                rowCount: 1
            });
            // SELECT itens
            mockPool.query.mockResolvedValueOnce({
                rows: [{ produto_nome: 'Produto' }],
                rowCount: 1
            });

            const response = await request(app)
                .post('/api/pedidos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    data_pedido: '2026-01-15',
                    cliente_id: 1,
                    itens: [{
                        produto_id: 1,
                        quantidade_caixas: 10,
                        preco_unitario: 100
                    }]
                });

            expect(response.status).toBe(201);
        });

        it('deve retornar 400 para número de pedido duplicado', async () => {
            const mockClient = {
                query: jest.fn(),
                release: jest.fn()
            };
            mockPool.connect.mockResolvedValueOnce(mockClient);

            // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // SELECT ultimo numero
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // SELECT produto
            mockClient.query.mockResolvedValueOnce({
                rows: [{ peso_caixa_kg: 10.5, preco_padrao: 100 }],
                rowCount: 1
            });
            // INSERT pedido - duplicate key error
            const error = new Error('duplicate key');
            error.code = '23505';
            mockClient.query.mockRejectedValueOnce(error);
            // ROLLBACK
            mockClient.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .post('/api/pedidos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    data_pedido: '2026-01-15',
                    cliente_id: 1,
                    itens: [{
                        produto_id: 1,
                        quantidade_caixas: 10,
                        preco_unitario: 100
                    }]
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Número de pedido já existe');
        });
    });

    describe('PUT /api/pedidos/:id - erros de transação', () => {
        it('deve retornar 500 em erro durante transação com itens', async () => {
            const mockClient = {
                query: jest.fn(),
                release: jest.fn()
            };
            mockPool.connect.mockResolvedValueOnce(mockClient);

            // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // SELECT pedido
            mockClient.query.mockResolvedValueOnce({
                rows: [{ id: 1 }],
                rowCount: 1
            });
            // SELECT produto
            mockClient.query.mockResolvedValueOnce({
                rows: [{ peso_caixa_kg: 10.5 }],
                rowCount: 1
            });
            // UPDATE pedido - error
            mockClient.query.mockRejectedValueOnce(new Error('DB Error'));
            // ROLLBACK
            mockClient.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .put('/api/pedidos/1')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    data_pedido: '2026-01-15',
                    cliente_id: 1,
                    itens: [{
                        produto_id: 1,
                        quantidade_caixas: 20,
                        preco_unitario: 100
                    }]
                });

            expect(response.status).toBe(500);
        });

        it('deve retornar 500 em erro na atualização simples', async () => {
            // Pedido existe mas erro ao atualizar
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, numero_pedido: '260101' }],
                rowCount: 1
            });
            // UPDATE throws error
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .put('/api/pedidos/1')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    observacoes: 'Apenas observação'
                });

            expect(response.status).toBe(500);
        });

        it('deve retornar erro ao buscar pedido atualizado', async () => {
            const mockClient = {
                query: jest.fn(),
                release: jest.fn()
            };
            mockPool.connect.mockResolvedValueOnce(mockClient);

            // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // SELECT pedido
            mockClient.query.mockResolvedValueOnce({
                rows: [{ id: 1 }],
                rowCount: 1
            });
            // SELECT produto
            mockClient.query.mockResolvedValueOnce({
                rows: [{ peso_caixa_kg: 10.5 }],
                rowCount: 1
            });
            // UPDATE pedido
            mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
            // DELETE itens
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // INSERT item
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // COMMIT
            mockClient.query.mockResolvedValueOnce({ rows: [] });

            // SELECT pedido completo - error
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .put('/api/pedidos/1')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    data_pedido: '2026-01-15',
                    cliente_id: 1,
                    itens: [{
                        produto_id: 1,
                        quantidade_caixas: 20,
                        preco_unitario: 100
                    }]
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toContain('erro ao buscar');
        });
    });
});
