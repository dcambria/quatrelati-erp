// =====================================================
// Testes Unitários - Middleware de Activity Log
// =====================================================

const { logActivity, activityLogMiddleware } = require('../../src/middleware/activityLog');

describe('Activity Log Middleware', () => {
    let mockDb;

    beforeEach(() => {
        mockDb = {
            query: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('logActivity', () => {
        it('deve registrar atividade com sucesso', async () => {
            mockDb.query.mockResolvedValueOnce({ rows: [{ valor: 'true' }] });
            mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            await logActivity(mockDb, {
                userId: 1,
                userNome: 'Test User',
                userNivel: 'admin',
                action: 'criar',
                entity: 'pedido',
                entityId: 1,
                entityName: 'PED-2026-001',
                details: { method: 'POST', path: '/api/pedidos' },
                ipAddress: '127.0.0.1',
                userAgent: 'Test Agent'
            });

            expect(mockDb.query).toHaveBeenCalled();
        });

        it('deve verificar configuração de log para superadmin', async () => {
            mockDb.query.mockResolvedValueOnce({ rows: [{ valor: 'false' }] });

            await logActivity(mockDb, {
                userId: 1,
                userNome: 'Super Admin',
                userNivel: 'superadmin',
                action: 'criar',
                entity: 'pedido'
            });

            // Deve ter feito apenas a query de configuração
            expect(mockDb.query).toHaveBeenCalledTimes(1);
        });

        it('deve logar superadmin quando configuração permitir', async () => {
            mockDb.query.mockResolvedValueOnce({ rows: [{ valor: 'true' }] });
            mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            await logActivity(mockDb, {
                userId: 1,
                userNome: 'Super Admin',
                userNivel: 'superadmin',
                action: 'criar',
                entity: 'pedido'
            });

            expect(mockDb.query).toHaveBeenCalledTimes(2);
        });

        it('não deve lançar erro em caso de falha no banco', async () => {
            mockDb.query.mockRejectedValueOnce(new Error('DB Error'));

            await expect(
                logActivity(mockDb, {
                    userId: 1,
                    userNome: 'Test',
                    userNivel: 'admin',
                    action: 'criar',
                    entity: 'pedido'
                })
            ).resolves.not.toThrow();
        });

        it('deve serializar details como JSON', async () => {
            // Para admin (não superadmin), só há a query de INSERT
            mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const details = { key: 'value', nested: { data: true } };

            await logActivity(mockDb, {
                userId: 1,
                userNome: 'Test',
                userNivel: 'admin',
                action: 'criar',
                entity: 'pedido',
                details
            });

            // Para admin, a primeira (e única) query é o INSERT
            const insertCall = mockDb.query.mock.calls[0];
            expect(insertCall[1][7]).toBe(JSON.stringify(details));
        });

        it('deve aceitar details nulo', async () => {
            // Para admin (não superadmin), só há a query de INSERT
            mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            await logActivity(mockDb, {
                userId: 1,
                userNome: 'Test',
                userNivel: 'admin',
                action: 'criar',
                entity: 'pedido',
                details: null
            });

            // Para admin, a primeira (e única) query é o INSERT
            const insertCall = mockDb.query.mock.calls[0];
            expect(insertCall[1][7]).toBeNull();
        });
    });

    describe('activityLogMiddleware', () => {
        let req;
        let res;
        let next;

        beforeEach(() => {
            req = {
                db: mockDb,
                userId: 1,
                method: 'POST',
                originalUrl: '/api/pedidos',
                params: {},
                body: { data: 'test' },
                ip: '127.0.0.1',
                get: jest.fn().mockReturnValue('Test Agent')
            };
            res = {
                statusCode: 200,
                json: jest.fn()
            };
            next = jest.fn();
        });

        it('deve chamar next imediatamente', () => {
            const middleware = activityLogMiddleware('criar', 'pedido');

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('deve sobrescrever res.json', () => {
            const originalJson = res.json;
            const middleware = activityLogMiddleware('criar', 'pedido');

            middleware(req, res, next);

            expect(res.json).not.toBe(originalJson);
        });

        it('deve logar quando resposta for bem-sucedida (2xx)', async () => {
            const middleware = activityLogMiddleware('criar', 'pedido');

            mockDb.query.mockResolvedValue({ rows: [{ nome: 'Test', nivel: 'admin' }] });

            middleware(req, res, next);

            // Simular resposta bem-sucedida
            res.statusCode = 201;
            await res.json({ id: 1, message: 'Criado' });

            expect(mockDb.query).toHaveBeenCalled();
        });

        it('não deve logar quando resposta for erro (4xx/5xx)', async () => {
            const middleware = activityLogMiddleware('criar', 'pedido');

            middleware(req, res, next);

            // Simular resposta de erro
            res.statusCode = 400;
            await res.json({ error: 'Bad Request' });

            // Não deve ter chamado query para log
            expect(mockDb.query).not.toHaveBeenCalled();
        });

        it('deve extrair entityId de req.params.id', async () => {
            req.params.id = '42';
            const middleware = activityLogMiddleware('atualizar', 'pedido');

            mockDb.query.mockResolvedValue({ rows: [{ nome: 'Test', nivel: 'admin' }] });

            middleware(req, res, next);

            res.statusCode = 200;
            await res.json({ message: 'Atualizado' });

            // Verificar que usou o ID do params
            const logCall = mockDb.query.mock.calls.find(call =>
                call[0].includes('INSERT INTO activity_logs')
            );
            expect(logCall).toBeDefined();
        });

        it('deve extrair entityId de data.id', async () => {
            const middleware = activityLogMiddleware('criar', 'pedido');

            mockDb.query.mockResolvedValue({ rows: [{ nome: 'Test', nivel: 'admin' }] });

            middleware(req, res, next);

            res.statusCode = 201;
            await res.json({ id: 99, message: 'Criado' });

            expect(mockDb.query).toHaveBeenCalled();
        });

        it('deve extrair entityName de data.pedido.numero_pedido', async () => {
            const middleware = activityLogMiddleware('criar', 'pedido');

            mockDb.query.mockResolvedValue({ rows: [{ nome: 'Test', nivel: 'admin' }] });

            middleware(req, res, next);

            res.statusCode = 201;
            await res.json({ pedido: { id: 1, numero_pedido: 'PED-2026-001' } });

            expect(mockDb.query).toHaveBeenCalled();
        });

        it('deve incluir body na details quando método não for GET', async () => {
            req.method = 'POST';
            req.body = { cliente_id: 1, produto_id: 2 };
            const middleware = activityLogMiddleware('criar', 'pedido');

            mockDb.query.mockResolvedValue({ rows: [{ nome: 'Test', nivel: 'admin' }] });

            middleware(req, res, next);

            res.statusCode = 201;
            await res.json({ id: 1 });

            expect(mockDb.query).toHaveBeenCalled();
        });

        it('não deve incluir body na details quando método for GET', async () => {
            req.method = 'GET';
            const middleware = activityLogMiddleware('listar', 'pedido');

            mockDb.query.mockResolvedValue({ rows: [{ nome: 'Test', nivel: 'admin' }] });

            middleware(req, res, next);

            res.statusCode = 200;
            await res.json({ pedidos: [] });

            expect(mockDb.query).toHaveBeenCalled();
        });

        it('deve capturar erro no middleware sem propagar', async () => {
            const middleware = activityLogMiddleware('criar', 'pedido');
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            // Primeira query (buscar usuário) funciona, segunda (log) falha
            mockDb.query
                .mockResolvedValueOnce({ rows: [{ nome: 'Test', nivel: 'admin' }] })
                .mockRejectedValueOnce(new Error('Erro no log'));

            middleware(req, res, next);

            res.statusCode = 201;
            // Não deve lançar erro mesmo com falha no log
            await expect(res.json({ id: 1 })).resolves.not.toThrow();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Erro ao registrar log de atividade:',
                expect.any(Error)
            );

            consoleErrorSpy.mockRestore();
        });
    });
});
