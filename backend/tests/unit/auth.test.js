// =====================================================
// Testes Unitários - Middleware de Autenticação
// =====================================================

const jwt = require('jsonwebtoken');

// Configurar variável de ambiente antes de importar o middleware
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';

describe('Auth Middleware', () => {
    let authMiddleware;
    let authorize;
    let superadminOnly;
    let adminOnly;
    let req;
    let res;
    let next;

    beforeEach(() => {
        // Reimportar o módulo a cada teste para garantir estado limpo
        jest.resetModules();
        process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';

        const auth = require('../../src/middleware/auth');
        authMiddleware = auth.authMiddleware;
        authorize = auth.authorize;
        superadminOnly = auth.superadminOnly;
        adminOnly = auth.adminOnly;

        req = {
            headers: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    describe('authMiddleware', () => {
        it('deve rejeitar requisição sem header Authorization', () => {
            authMiddleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Token não fornecido' });
            expect(next).not.toHaveBeenCalled();
        });

        it('deve rejeitar token malformado (sem Bearer)', () => {
            req.headers.authorization = 'invalid-token';

            authMiddleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Token malformado' });
        });

        it('deve rejeitar token com scheme errado', () => {
            req.headers.authorization = 'Basic token123';

            authMiddleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Token malformado' });
        });

        it('deve rejeitar token inválido', () => {
            req.headers.authorization = 'Bearer invalid-token';

            authMiddleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
        });

        it('deve rejeitar token expirado', () => {
            const expiredToken = jwt.sign(
                { id: 1, email: 'test@test.com', nivel: 'admin' },
                'test-jwt-secret-for-unit-tests',
                { expiresIn: '-1s' }
            );
            req.headers.authorization = `Bearer ${expiredToken}`;

            authMiddleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Token expirado' });
        });

        it('deve aceitar token válido e popular req', () => {
            const validToken = jwt.sign(
                { id: 1, email: 'test@test.com', nivel: 'admin' },
                'test-jwt-secret-for-unit-tests',
                { expiresIn: '1h' }
            );
            req.headers.authorization = `Bearer ${validToken}`;

            authMiddleware(req, res, next);

            expect(req.userId).toBe(1);
            expect(req.userEmail).toBe('test@test.com');
            expect(req.userNivel).toBe('admin');
            expect(next).toHaveBeenCalled();
        });
    });

    describe('authorize', () => {
        it('deve rejeitar sem nível de usuário', () => {
            const middleware = authorize('admin');

            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ error: 'Acesso negado' });
        });

        it('deve rejeitar nível não autorizado', () => {
            req.userNivel = 'vendedor';
            const middleware = authorize('admin', 'superadmin');

            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Você não tem permissão para acessar este recurso'
            });
        });

        it('deve aceitar nível autorizado', () => {
            req.userNivel = 'admin';
            const middleware = authorize('admin', 'superadmin');

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('deve aceitar qualquer nível do array', () => {
            req.userNivel = 'superadmin';
            const middleware = authorize('admin', 'superadmin');

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });
    });

    describe('superadminOnly', () => {
        it('deve aceitar superadmin', () => {
            req.userNivel = 'superadmin';

            superadminOnly(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('deve rejeitar admin', () => {
            req.userNivel = 'admin';

            superadminOnly(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('deve rejeitar vendedor', () => {
            req.userNivel = 'vendedor';

            superadminOnly(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('adminOnly', () => {
        it('deve aceitar superadmin', () => {
            req.userNivel = 'superadmin';

            adminOnly(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('deve aceitar admin', () => {
            req.userNivel = 'admin';

            adminOnly(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('deve rejeitar vendedor', () => {
            req.userNivel = 'vendedor';

            adminOnly(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
        });
    });
});
