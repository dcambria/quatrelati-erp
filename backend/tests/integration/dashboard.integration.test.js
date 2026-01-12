// =====================================================
// Testes de Integração - Dashboard Routes
// =====================================================

const request = require('supertest');
const { createTestApp, createMockPool, generateTestToken, testData } = require('../testHelper');

const dashboardRoutes = require('../../src/routes/dashboard');

describe('Dashboard Routes Integration', () => {
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
                    req.userNivel = decoded.nivel;
                } catch (e) {
                    return res.status(401).json({ error: 'Token inválido' });
                }
            } else {
                return res.status(401).json({ error: 'Token não fornecido' });
            }
            next();
        });

        app.use('/api/dashboard', dashboardRoutes);

        adminToken = generateTestToken({ id: 1, nivel: 'admin', pode_visualizar_todos: true });
        userToken = generateTestToken({ id: 2, nivel: 'vendedor', pode_visualizar_todos: false });
    });

    describe('GET /api/dashboard/resumo', () => {
        it('deve retornar resumo do mês para admin', async () => {
            // Mock para verificar nível
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            // Mock para resumo atual
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    total_pedidos: 50,
                    valor_total: 50000,
                    peso_total: 5250,
                    total_caixas: 500,
                    entregues: 40,
                    pendentes: 10
                }],
                rowCount: 1
            });
            // Mock para mês anterior
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    total_pedidos: 45,
                    valor_total: 45000,
                    peso_total: 4725
                }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/dashboard/resumo')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('resumo');
            expect(response.body).toHaveProperty('comparativo');
            expect(response.body.resumo).toHaveProperty('total_pedidos');
            expect(response.body.resumo).toHaveProperty('valor_total');
        });

        it('deve filtrar por mês/ano', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total_pedidos: 0, valor_total: 0, peso_total: 0, total_caixas: 0, entregues: 0, pendentes: 0 }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total_pedidos: 0, valor_total: 0, peso_total: 0 }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/dashboard/resumo?mes=6&ano=2025')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.mes).toBe(6);
            expect(response.body.ano).toBe(2025);
        });

        it('deve filtrar por vendedor para vendedor sem permissão global', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'vendedor', pode_visualizar_todos: false }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total_pedidos: 10, valor_total: 10000, peso_total: 1050, total_caixas: 100, entregues: 8, pendentes: 2 }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total_pedidos: 8, valor_total: 8000, peso_total: 840 }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/dashboard/resumo')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
        });
    });

    describe('GET /api/dashboard/stats', () => {
        it('deve retornar estatísticas gerais', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    total_clientes: 100,
                    total_produtos: 20,
                    total_pedidos: 1000,
                    faturamento_total: 500000,
                    peso_total_vendido: 52500
                }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/dashboard/stats')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('stats');
            expect(response.body.stats).toHaveProperty('total_clientes');
            expect(response.body.stats).toHaveProperty('total_produtos');
        });
    });

    describe('GET /api/dashboard/top-clientes', () => {
        it('deve retornar top 5 clientes', async () => {
            // Mock para verificar nível
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            // Mock para top clientes
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    { id: 1, nome: 'Cliente 1', total_pedidos: 50, valor_total: 50000, peso_total: 5250 },
                    { id: 2, nome: 'Cliente 2', total_pedidos: 40, valor_total: 40000, peso_total: 4200 },
                    { id: 3, nome: 'Cliente 3', total_pedidos: 30, valor_total: 30000, peso_total: 3150 }
                ],
                rowCount: 3
            });

            const response = await request(app)
                .get('/api/dashboard/top-clientes')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('clientes');
            expect(Array.isArray(response.body.clientes)).toBe(true);
        });

        it('deve filtrar por mês/ano', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .get('/api/dashboard/top-clientes?mes=1&ano=2026')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });
    });

    describe('GET /api/dashboard/top-produtos', () => {
        it('deve retornar top 5 produtos', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    { id: 1, nome: 'Produto 1', total_pedidos: 100, total_caixas: 1000, peso_total: 10500, valor_total: 100000 },
                    { id: 2, nome: 'Produto 2', total_pedidos: 80, total_caixas: 800, peso_total: 8400, valor_total: 80000 }
                ],
                rowCount: 2
            });

            const response = await request(app)
                .get('/api/dashboard/top-produtos')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('produtos');
            expect(Array.isArray(response.body.produtos)).toBe(true);
        });
    });

    describe('GET /api/dashboard/evolucao', () => {
        it('deve retornar evolução mensal', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    { ano: 2025, mes: 11, total_pedidos: 40, valor_total: 40000, peso_total: 4200, entregues: 35 },
                    { ano: 2025, mes: 12, total_pedidos: 50, valor_total: 50000, peso_total: 5250, entregues: 45 },
                    { ano: 2026, mes: 1, total_pedidos: 55, valor_total: 55000, peso_total: 5775, entregues: 50 }
                ],
                rowCount: 3
            });

            const response = await request(app)
                .get('/api/dashboard/evolucao')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('evolucao');
            expect(Array.isArray(response.body.evolucao)).toBe(true);
        });
    });

    describe('GET /api/dashboard/proximas-entregas', () => {
        it('deve retornar próximas entregas', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    numero_pedido: 'PED-2026-001',
                    data_entrega: '2026-01-15',
                    cliente_nome: 'Cliente Teste',
                    produto_nome: 'Produto Teste',
                    quantidade_caixas: 10
                }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/dashboard/proximas-entregas')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('entregas');
            expect(Array.isArray(response.body.entregas)).toBe(true);
        });
    });

    describe('GET /api/dashboard/entregas-atrasadas', () => {
        it('deve retornar entregas atrasadas', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    numero_pedido: 'PED-2025-100',
                    data_entrega: '2025-12-01',
                    cliente_nome: 'Cliente Atrasado',
                    produto_nome: 'Produto Teste',
                    dias_atraso: 42
                }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/dashboard/entregas-atrasadas')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('atrasados');
            expect(Array.isArray(response.body.atrasados)).toBe(true);
        });
    });

    describe('GET /api/dashboard/empresa', () => {
        it('deve retornar dashboard da empresa para admin', async () => {
            // Mock para verificar nível
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin' }],
                rowCount: 1
            });
            // Mock para resumo geral
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    total_pedidos: 100,
                    valor_total: 100000,
                    peso_total: 10500,
                    total_caixas: 1000,
                    entregues: 90,
                    pendentes: 10
                }],
                rowCount: 1
            });
            // Mock para breakdown por vendedor
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    { vendedor_id: 1, vendedor_nome: 'Vendedor 1', total_pedidos: 50, valor_total: 50000 },
                    { vendedor_id: 2, vendedor_nome: 'Vendedor 2', total_pedidos: 50, valor_total: 50000 }
                ],
                rowCount: 2
            });
            // Mock para top clientes
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, nome: 'Top Cliente', vendedor_nome: 'Vendedor 1', total_pedidos: 20, valor_total: 20000 }],
                rowCount: 1
            });
            // Mock para por status
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    { entregue: true, total: 90, valor: 90000 },
                    { entregue: false, total: 10, valor: 10000 }
                ],
                rowCount: 2
            });

            const response = await request(app)
                .get('/api/dashboard/empresa')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('resumo');
            expect(response.body).toHaveProperty('porVendedor');
            expect(response.body).toHaveProperty('topClientes');
            expect(response.body).toHaveProperty('porStatus');
        });

        it('deve rejeitar acesso por vendedor', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'vendedor' }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/dashboard/empresa')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
        });
    });

    describe('GET /api/dashboard/vendedores', () => {
        it('deve retornar lista de vendedores para admin', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    { id: 1, nome: 'Vendedor 1', email: 'vendedor1@test.com', nivel: 'vendedor' },
                    { id: 2, nome: 'Vendedor 2', email: 'vendedor2@test.com', nivel: 'vendedor' }
                ],
                rowCount: 2
            });

            const response = await request(app)
                .get('/api/dashboard/vendedores')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('vendedores');
            expect(Array.isArray(response.body.vendedores)).toBe(true);
        });

        it('deve rejeitar acesso por vendedor sem permissão', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'vendedor', pode_visualizar_todos: false }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/dashboard/vendedores')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
        });

        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/dashboard/vendedores')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/dashboard/resumo - erros adicionais', () => {
        it('deve filtrar por vendedor_id como admin', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total_pedidos: 10, valor_total: 10000, peso_total: 1050, total_caixas: 100, entregues: 8, pendentes: 2 }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total_pedidos: 8, valor_total: 8000, peso_total: 840 }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/dashboard/resumo?vendedor_id=5')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/dashboard/resumo')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/dashboard/stats - erros adicionais', () => {
        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/dashboard/stats')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/dashboard/top-clientes - erros adicionais', () => {
        it('deve filtrar por vendedor para vendedor sem permissão', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'vendedor', pode_visualizar_todos: false }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .get('/api/dashboard/top-clientes')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
        });

        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/dashboard/top-clientes')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/dashboard/top-produtos - erros adicionais', () => {
        it('deve filtrar por mês/ano', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .get('/api/dashboard/top-produtos?mes=1&ano=2026')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve filtrar por vendedor para vendedor sem permissão', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'vendedor', pode_visualizar_todos: false }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .get('/api/dashboard/top-produtos')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
        });

        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/dashboard/top-produtos')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/dashboard/evolucao - erros adicionais', () => {
        it('deve filtrar por vendedor para vendedor sem permissão', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'vendedor', pode_visualizar_todos: false }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .get('/api/dashboard/evolucao')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
        });

        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/dashboard/evolucao')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/dashboard/proximas-entregas - erros adicionais', () => {
        it('deve filtrar por vendedor para vendedor sem permissão', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'vendedor', pode_visualizar_todos: false }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .get('/api/dashboard/proximas-entregas')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
        });

        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/dashboard/proximas-entregas')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/dashboard/entregas-atrasadas - erros adicionais', () => {
        it('deve filtrar por vendedor para vendedor sem permissão', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'vendedor', pode_visualizar_todos: false }],
                rowCount: 1
            });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .get('/api/dashboard/entregas-atrasadas')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
        });

        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/dashboard/entregas-atrasadas')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/dashboard/empresa - erros adicionais', () => {
        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/dashboard/empresa')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/dashboard/resumo - filtro vendedor_id por admin', () => {
        it('deve permitir admin filtrar por vendedor_id específico', async () => {
            // Mock verificação de nível (admin)
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });

            // Mock resumo do mês atual
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    total_pedidos: '5',
                    valor_total: '1000',
                    peso_total: '500',
                    total_caixas: '100',
                    entregues: '3',
                    pendentes: '2'
                }],
                rowCount: 1
            });

            // Mock resumo do mês anterior
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    total_pedidos: '4',
                    valor_total: '800',
                    peso_total: '400'
                }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/dashboard/resumo?vendedor_id=3')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.resumo).toHaveProperty('total_pedidos');
        });
    });
});
