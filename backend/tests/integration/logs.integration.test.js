// =====================================================
// Testes de Integração - Logs Routes
// =====================================================

const request = require('supertest');
const { createTestApp, createMockPool, generateTestToken } = require('../testHelper');

const logsRoutes = require('../../src/routes/logs');

describe('Logs Routes Integration', () => {
    let app;
    let mockPool;
    let superadminToken;
    let adminToken;

    beforeEach(() => {
        mockPool = createMockPool();
        app = createTestApp(mockPool);

        // Routes use authMiddleware + superadminOnly internally
        app.use('/api/logs', logsRoutes);

        superadminToken = generateTestToken({ id: 1, nivel: 'superadmin' });
        adminToken = generateTestToken({ id: 2, nivel: 'admin' });
    });

    describe('GET /api/logs', () => {
        it('deve listar logs para superadmin', async () => {
            // Mock para lista de logs
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    user_id: 1,
                    user_nome: 'Admin',
                    action: 'criar',
                    entity: 'pedido',
                    created_at: new Date()
                }],
                rowCount: 1
            });
            // Mock para contagem total
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total: 1 }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/logs')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('logs');
            expect(response.body).toHaveProperty('pagination');
        });

        it('deve filtrar por user_id', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 });

            const response = await request(app)
                .get('/api/logs?user_id=1')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve filtrar por action', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 });

            const response = await request(app)
                .get('/api/logs?action=criar')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve filtrar por entity', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 });

            const response = await request(app)
                .get('/api/logs?entity=pedido')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve filtrar por data_inicio', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 });

            const response = await request(app)
                .get('/api/logs?data_inicio=2026-01-01')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve filtrar por data_fim', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 });

            const response = await request(app)
                .get('/api/logs?data_fim=2026-12-31')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve paginar resultados', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: 100 }], rowCount: 1 });

            const response = await request(app)
                .get('/api/logs?page=2&limit=10')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.pagination.page).toBe(2);
            expect(response.body.pagination.limit).toBe(10);
        });

        it('deve rejeitar acesso por admin', async () => {
            const response = await request(app)
                .get('/api/logs')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(403);
        });

        it('deve retornar 500 em caso de erro', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/logs')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/logs/usuarios', () => {
        it('deve listar usuários dos logs', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    { user_id: 1, user_nome: 'Admin', user_nivel: 'admin' },
                    { user_id: 2, user_nome: 'User', user_nivel: 'vendedor' }
                ],
                rowCount: 2
            });

            const response = await request(app)
                .get('/api/logs/usuarios')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('usuarios');
        });

        it('deve retornar 500 em caso de erro', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/logs/usuarios')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/logs/acoes', () => {
        it('deve listar ações distintas', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ action: 'criar' }, { action: 'atualizar' }, { action: 'excluir' }],
                rowCount: 3
            });

            const response = await request(app)
                .get('/api/logs/acoes')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('acoes');
            expect(response.body.acoes).toContain('criar');
        });

        it('deve retornar 500 em caso de erro', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/logs/acoes')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/logs/entidades', () => {
        it('deve listar entidades distintas', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ entity: 'pedido' }, { entity: 'cliente' }, { entity: 'produto' }],
                rowCount: 3
            });

            const response = await request(app)
                .get('/api/logs/entidades')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('entidades');
            expect(response.body.entidades).toContain('pedido');
        });

        it('deve retornar 500 em caso de erro', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/logs/entidades')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/logs/estatisticas', () => {
        it('deve retornar estatísticas dos logs', async () => {
            // Mock para total
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: 100 }], rowCount: 1 });
            // Mock para por usuário
            mockPool.query.mockResolvedValueOnce({
                rows: [{ user_nome: 'Admin', total: 50 }],
                rowCount: 1
            });
            // Mock para por ação
            mockPool.query.mockResolvedValueOnce({
                rows: [{ action: 'criar', total: 30 }],
                rowCount: 1
            });
            // Mock para por dia
            mockPool.query.mockResolvedValueOnce({
                rows: [{ data: '2026-01-15', total: 10 }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/logs/estatisticas')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('total');
            expect(response.body).toHaveProperty('porUsuario');
            expect(response.body).toHaveProperty('porAcao');
            expect(response.body).toHaveProperty('porDia');
        });

        it('deve aceitar parâmetro dias', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: 50 }], rowCount: 1 });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .get('/api/logs/estatisticas?dias=7')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve limitar dias entre 1 e 365', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            // Valor maior que 365 deve ser limitado a 365
            const response = await request(app)
                .get('/api/logs/estatisticas?dias=1000')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve retornar 500 em caso de erro', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/logs/estatisticas')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(500);
        });
    });
});
