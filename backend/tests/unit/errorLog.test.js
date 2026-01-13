// =====================================================
// Testes Unitários - Error Log Middleware
// =====================================================

const { logError, errorLogMiddleware, globalErrorHandler } = require('../../src/middleware/errorLog');

describe('Error Log Middleware', () => {
    let mockDb;
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        mockDb = {
            query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
        };
        mockReq = {
            db: mockDb,
            userId: 1,
            originalUrl: '/api/test',
            method: 'POST',
            body: { name: 'Test' },
            ip: '127.0.0.1',
            get: jest.fn().mockReturnValue('Mozilla/5.0'),
            connection: { remoteAddress: '127.0.0.1' }
        };
        mockRes = {
            statusCode: 200,
            json: jest.fn()
        };
        mockNext = jest.fn();
    });

    describe('logError', () => {
        it('deve registrar erro no banco', async () => {
            await logError(mockDb, {
                userId: 1,
                userNome: 'Test User',
                userNivel: 'admin',
                errorType: 'validation',
                errorMessage: 'Campo inválido',
                endpoint: '/api/test',
                method: 'POST',
                requestBody: { name: 'Test' },
                validationErrors: [{ field: 'email', message: 'Email inválido' }],
                stackTrace: null,
                ipAddress: '127.0.0.1',
                userAgent: 'Mozilla/5.0'
            });

            expect(mockDb.query).toHaveBeenCalledTimes(1);
            expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO error_logs'),
                expect.any(Array)
            );
        });

        it('deve sanitizar dados sensíveis do body', async () => {
            await logError(mockDb, {
                userId: 1,
                userNome: 'Test User',
                userNivel: 'admin',
                errorType: 'validation',
                errorMessage: 'Erro',
                endpoint: '/api/auth/login',
                method: 'POST',
                requestBody: { email: 'test@bureau-it.com', senha: 'secret123', password: 'secret456' },
                validationErrors: null,
                stackTrace: null,
                ipAddress: '127.0.0.1',
                userAgent: 'Mozilla/5.0'
            });

            const callArgs = mockDb.query.mock.calls[0][1];
            const loggedBody = JSON.parse(callArgs[7]);
            expect(loggedBody.senha).toBe('[REDACTED]');
            expect(loggedBody.password).toBe('[REDACTED]');
            expect(loggedBody.email).toBe('test@bureau-it.com');
        });

        it('deve lidar com erro ao salvar log', async () => {
            mockDb.query.mockRejectedValueOnce(new Error('DB Error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await logError(mockDb, {
                userId: 1,
                errorType: 'test',
                errorMessage: 'Test error'
            });

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('deve lidar com body null', async () => {
            await logError(mockDb, {
                userId: 1,
                errorType: 'test',
                errorMessage: 'Test error',
                requestBody: null
            });

            expect(mockDb.query).toHaveBeenCalled();
        });

        it('deve lidar com body não-objeto', async () => {
            await logError(mockDb, {
                userId: 1,
                errorType: 'test',
                errorMessage: 'Test error',
                requestBody: 'string body'
            });

            expect(mockDb.query).toHaveBeenCalled();
        });
    });

    describe('errorLogMiddleware', () => {
        it('deve sobrescrever res.json', async () => {
            const middleware = errorLogMiddleware();
            const originalJson = mockRes.json;

            await middleware(mockReq, mockRes, mockNext);

            expect(mockRes.json).not.toBe(originalJson);
            expect(mockNext).toHaveBeenCalled();
        });

        it('deve logar erros 400', async () => {
            const middleware = errorLogMiddleware();
            await middleware(mockReq, mockRes, mockNext);

            mockRes.statusCode = 400;
            await mockRes.json({ error: 'Dados inválidos', details: [{ field: 'email' }] });

            expect(mockDb.query).toHaveBeenCalled();
        });

        it('deve logar erros 401', async () => {
            const middleware = errorLogMiddleware();
            await middleware(mockReq, mockRes, mockNext);

            mockRes.statusCode = 401;
            await mockRes.json({ error: 'Não autorizado' });

            expect(mockDb.query).toHaveBeenCalled();
        });

        it('deve logar erros 403', async () => {
            const middleware = errorLogMiddleware();
            await middleware(mockReq, mockRes, mockNext);

            mockRes.statusCode = 403;
            await mockRes.json({ error: 'Acesso negado' });

            expect(mockDb.query).toHaveBeenCalled();
        });

        it('deve logar erros 404', async () => {
            const middleware = errorLogMiddleware();
            await middleware(mockReq, mockRes, mockNext);

            mockRes.statusCode = 404;
            await mockRes.json({ error: 'Não encontrado' });

            expect(mockDb.query).toHaveBeenCalled();
        });

        it('deve logar erros 500', async () => {
            const middleware = errorLogMiddleware();
            await middleware(mockReq, mockRes, mockNext);

            mockRes.statusCode = 500;
            await mockRes.json({ error: 'Erro interno' });

            expect(mockDb.query).toHaveBeenCalled();
        });

        it('não deve logar respostas 200', async () => {
            const middleware = errorLogMiddleware();
            await middleware(mockReq, mockRes, mockNext);

            mockRes.statusCode = 200;
            await mockRes.json({ success: true });

            // Query para buscar usuário não deve acontecer para sucesso
            expect(mockDb.query).not.toHaveBeenCalled();
        });

        it('deve buscar dados do usuário quando autenticado', async () => {
            mockDb.query
                .mockResolvedValueOnce({ rows: [{ nome: 'Test User', nivel: 'admin' }] })
                .mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const middleware = errorLogMiddleware();
            await middleware(mockReq, mockRes, mockNext);

            mockRes.statusCode = 400;
            await mockRes.json({ error: 'Erro' });

            expect(mockDb.query).toHaveBeenCalledTimes(2);
        });

        it('deve lidar quando usuário não existe', async () => {
            mockDb.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const middleware = errorLogMiddleware();
            await middleware(mockReq, mockRes, mockNext);

            mockRes.statusCode = 400;
            await mockRes.json({ error: 'Erro' });

            expect(mockDb.query).toHaveBeenCalled();
        });

        it('deve continuar se erro ao buscar usuário', async () => {
            mockDb.query
                .mockRejectedValueOnce(new Error('DB Error'))
                .mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const middleware = errorLogMiddleware();
            await middleware(mockReq, mockRes, mockNext);

            mockRes.statusCode = 400;
            await mockRes.json({ error: 'Erro' });

            expect(mockDb.query).toHaveBeenCalled();
        });

        it('deve não logar body em requisições GET', async () => {
            mockReq.method = 'GET';
            mockDb.query
                .mockResolvedValueOnce({ rows: [{ nome: 'User', nivel: 'admin' }] })
                .mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const middleware = errorLogMiddleware();
            await middleware(mockReq, mockRes, mockNext);

            mockRes.statusCode = 400;
            await mockRes.json({ error: 'Erro' });

            const insertCall = mockDb.query.mock.calls.find(call =>
                call[0].includes('INSERT INTO error_logs')
            );
            expect(insertCall[1][7]).toBeNull();
        });

        it('deve lidar com erro no middleware', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            mockDb.query.mockImplementation(() => {
                throw new Error('Unexpected error');
            });

            const middleware = errorLogMiddleware();
            await middleware(mockReq, mockRes, mockNext);

            mockRes.statusCode = 400;
            await mockRes.json({ error: 'Erro' });

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('deve extrair message quando error não existe', async () => {
            mockDb.query
                .mockResolvedValueOnce({ rows: [{ nome: 'User', nivel: 'admin' }] })
                .mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const middleware = errorLogMiddleware();
            await middleware(mockReq, mockRes, mockNext);

            mockRes.statusCode = 400;
            await mockRes.json({ message: 'Mensagem de erro' });

            expect(mockDb.query).toHaveBeenCalled();
        });
    });

    describe('globalErrorHandler', () => {
        it('deve logar erro não tratado', async () => {
            const err = new Error('Erro não tratado');
            err.stack = 'Error stack trace';
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            mockRes.status = jest.fn().mockReturnThis();

            globalErrorHandler(err, mockReq, mockRes, mockNext);

            expect(consoleSpy).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(500);
            consoleSpy.mockRestore();
        });

        it('deve retornar 500 com mensagem genérica', () => {
            const err = new Error('Erro interno');
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            mockRes.status = jest.fn().mockReturnThis();

            globalErrorHandler(err, mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Erro interno do servidor' });
            consoleSpy.mockRestore();
        });

        it('deve lidar quando req.db não existe', () => {
            const err = new Error('Erro');
            delete mockReq.db;
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            mockRes.status = jest.fn().mockReturnThis();

            globalErrorHandler(err, mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            consoleSpy.mockRestore();
        });

        it('deve usar err.message quando disponível', () => {
            const err = new Error('Mensagem específica');
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            mockRes.status = jest.fn().mockReturnThis();

            globalErrorHandler(err, mockReq, mockRes, mockNext);

            expect(mockDb.query).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('deve lidar com erro sem mensagem', () => {
            const err = {};
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            mockRes.status = jest.fn().mockReturnThis();

            globalErrorHandler(err, mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            consoleSpy.mockRestore();
        });

        it('deve lidar com falha ao logar erro', async () => {
            const err = new Error('Erro');
            mockDb.query.mockRejectedValueOnce(new Error('DB Error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            mockRes.status = jest.fn().mockReturnThis();

            globalErrorHandler(err, mockReq, mockRes, mockNext);

            // Aguardar promise resolver
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});
