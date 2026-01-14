// =====================================================
// Testes de Integração - Usuarios Routes
// =====================================================

const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createTestApp, createMockPool, generateTestToken, testData } = require('../testHelper');

// Mock do emailService - deve vir ANTES de importar as rotas
jest.mock('../../src/services/emailService', () => ({
    sendMagicLinkEmail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    sendPasswordResetEmail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    sendInviteEmail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
}));

const usuariosRoutes = require('../../src/routes/usuarios');

describe('Usuarios Routes Integration', () => {
    let app;
    let mockPool;
    let superadminToken;
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

        app.use('/api/usuarios', usuariosRoutes);

        superadminToken = generateTestToken({ id: 1, nivel: 'superadmin' });
        adminToken = generateTestToken({ id: 2, nivel: 'admin' });
        userToken = generateTestToken({ id: 3, nivel: 'vendedor' });
    });

    describe('GET /api/usuarios', () => {
        it('deve listar usuários para superadmin', async () => {
            // Mock para listar usuários
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    nome: 'Admin',
                    email: 'admin@bureau-it.com',
                    nivel: 'superadmin',
                    ativo: true
                }, {
                    id: 2,
                    nome: 'Vendedor',
                    email: 'vendedor@bureau-it.com',
                    nivel: 'vendedor',
                    ativo: true
                }],
                rowCount: 2
            });

            const response = await request(app)
                .get('/api/usuarios')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('usuarios');
            expect(Array.isArray(response.body.usuarios)).toBe(true);
        });

        it('deve filtrar usuários por status ativo', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .get('/api/usuarios?ativo=true')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve rejeitar acesso por admin (não superadmin)', async () => {
            const response = await request(app)
                .get('/api/usuarios')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(403);
        });

        it('deve rejeitar acesso por vendedor', async () => {
            const response = await request(app)
                .get('/api/usuarios')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
        });
    });

    describe('GET /api/usuarios/:id', () => {
        it('deve retornar usuário específico', async () => {
            // Apenas o mock para a query do route handler
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 2,
                    nome: 'Vendedor',
                    email: 'vendedor@bureau-it.com',
                    nivel: 'vendedor',
                    ativo: true
                }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/usuarios/2')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('usuario');
            expect(response.body.usuario).toHaveProperty('id', 2);
        });

        it('deve retornar 404 para usuário inexistente', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .get('/api/usuarios/999')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('POST /api/usuarios', () => {
        it('deve criar novo usuário', async () => {
            // Mock para verificar email existente
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            // Mock para inserir
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 3,
                    nome: 'Novo Usuário',
                    email: 'novo@bureau-it.com',
                    nivel: 'vendedor',
                    ativo: true
                }],
                rowCount: 1
            });

            const response = await request(app)
                .post('/api/usuarios')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    nome: 'Novo Usuário',
                    email: 'novo@bureau-it.com',
                    senha: 'Senha123!',
                    nivel: 'vendedor'
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('usuario');
        });

        it('deve rejeitar email duplicado', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1 }],
                rowCount: 1
            });

            const response = await request(app)
                .post('/api/usuarios')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    nome: 'Duplicado',
                    email: 'existente@bureau-it.com',
                    senha: 'Senha123!'
                });

            expect(response.status).toBe(400);
        });
    });

    describe('PUT /api/usuarios/:id', () => {
        it('deve atualizar usuário existente', async () => {
            // Mock para buscar usuário atual
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 2,
                    nome: 'Vendedor',
                    email: 'vendedor@bureau-it.com',
                    nivel: 'vendedor',
                    senha_hash: 'hash'
                }],
                rowCount: 1
            });
            // Mock para atualizar
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 2,
                    nome: 'Vendedor Atualizado',
                    email: 'vendedor@bureau-it.com',
                    nivel: 'vendedor'
                }],
                rowCount: 1
            });

            const response = await request(app)
                .put('/api/usuarios/2')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({ nome: 'Vendedor Atualizado' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message');
        });

        it('deve retornar 404 para usuário inexistente', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .put('/api/usuarios/999')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({ nome: 'Teste' });

            expect(response.status).toBe(404);
        });

        it('deve rejeitar desativação do próprio usuário', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, nome: 'Admin', email: 'admin@bureau-it.com', senha_hash: 'hash' }],
                rowCount: 1
            });

            const response = await request(app)
                .put('/api/usuarios/1')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({ ativo: false });

            expect(response.status).toBe(400);
        });
    });

    describe('DELETE /api/usuarios/:id', () => {
        it('deve excluir usuário sem pedidos (hard delete)', async () => {
            // Mock para buscar usuário
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 2, nome: 'Vendedor' }],
                rowCount: 1
            });
            // Mock para verificar pedidos
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total: 0 }],
                rowCount: 1
            });
            // Mock para deletar tokens
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            // Mock para deletar usuário
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 2, nome: 'Vendedor', email: 'vendedor@bureau-it.com' }],
                rowCount: 1
            });

            const response = await request(app)
                .delete('/api/usuarios/2')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toContain('excluído');
        });

        it('deve desativar usuário com pedidos (soft delete)', async () => {
            // Mock para buscar usuário
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 2, nome: 'Vendedor' }],
                rowCount: 1
            });
            // Mock para verificar pedidos (tem pedidos)
            mockPool.query.mockResolvedValueOnce({
                rows: [{ total: 5 }],
                rowCount: 1
            });
            // Mock para soft delete
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 2, nome: 'Vendedor', ativo: false }],
                rowCount: 1
            });
            // Mock para deletar tokens
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .delete('/api/usuarios/2')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toContain('desativado');
        });

        it('deve rejeitar exclusão do próprio usuário', async () => {
            const response = await request(app)
                .delete('/api/usuarios/1')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(400);
        });

        it('deve retornar 404 para usuário inexistente', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .delete('/api/usuarios/999')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('POST /api/usuarios/:id/invite', () => {
        it('deve enviar convite para usuário existente', async () => {
            // Mock para buscar usuário
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 2, nome: 'Vendedor', email: 'vendedor@bureau-it.com', ativo: true }],
                rowCount: 1
            });
            // Mock para inserir magic link
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await request(app)
                .post('/api/usuarios/2/invite')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message');
        });

        it('deve rejeitar convite para usuário inativo', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 2, nome: 'Vendedor', email: 'vendedor@bureau-it.com', ativo: false }],
                rowCount: 1
            });

            const response = await request(app)
                .post('/api/usuarios/2/invite')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(400);
        });

        it('deve retornar 404 para usuário inexistente', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .post('/api/usuarios/999/invite')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('POST /api/usuarios/invite', () => {
        it('deve criar usuário e enviar convite', async () => {
            // Mock para verificar email
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            // Mock para criar usuário
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 3, nome: 'Novo', email: 'novo@bureau-it.com', nivel: 'vendedor', ativo: true }],
                rowCount: 1
            });
            // Mock para inserir magic link
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await request(app)
                .post('/api/usuarios/invite')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    nome: 'Novo Usuário',
                    email: 'novo@bureau-it.com'
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('usuario');
        });

        it('deve rejeitar email duplicado', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1 }],
                rowCount: 1
            });

            const response = await request(app)
                .post('/api/usuarios/invite')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    nome: 'Duplicado',
                    email: 'existente@bureau-it.com'
                });

            expect(response.status).toBe(400);
        });

        it('deve validar nome', async () => {
            const response = await request(app)
                .post('/api/usuarios/invite')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    nome: 'A',
                    email: 'test@bureau-it.com'
                });

            expect(response.status).toBe(400);
        });

        it('deve validar email', async () => {
            const response = await request(app)
                .post('/api/usuarios/invite')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    nome: 'Teste',
                    email: 'invalido'
                });

            expect(response.status).toBe(400);
        });

        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .post('/api/usuarios/invite')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    nome: 'Novo Usuário',
                    email: 'novo@bureau-it.com'
                });

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/usuarios - erros adicionais', () => {
        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/usuarios')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/usuarios/:id - erros adicionais', () => {
        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/usuarios/1')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('POST /api/usuarios - erros adicionais', () => {
        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .post('/api/usuarios')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    nome: 'Novo Usuário',
                    email: 'novo@bureau-it.com',
                    senha: 'Senha123!'
                });

            expect(response.status).toBe(500);
        });
    });

    describe('PUT /api/usuarios/:id - erros adicionais', () => {
        it('deve rejeitar email duplicado na atualização', async () => {
            // Mock para buscar usuário atual
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 2,
                    nome: 'Vendedor',
                    email: 'vendedor@bureau-it.com',
                    nivel: 'vendedor',
                    senha_hash: 'hash'
                }],
                rowCount: 1
            });
            // Mock para verificar email existente (outro usuário já tem)
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 3 }],
                rowCount: 1
            });

            const response = await request(app)
                .put('/api/usuarios/2')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    nome: 'Vendedor',
                    email: 'outro@bureau-it.com'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Email já cadastrado');
        });

        it('deve atualizar senha', async () => {
            // Mock para buscar usuário atual
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 2,
                    nome: 'Vendedor',
                    email: 'vendedor@bureau-it.com',
                    nivel: 'vendedor',
                    senha_hash: 'hash'
                }],
                rowCount: 1
            });
            // Mock para atualizar
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 2,
                    nome: 'Vendedor',
                    email: 'vendedor@bureau-it.com',
                    nivel: 'vendedor'
                }],
                rowCount: 1
            });

            const response = await request(app)
                .put('/api/usuarios/2')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    nome: 'Vendedor',
                    senha: 'NovaSenha123!'
                });

            expect(response.status).toBe(200);
        });

        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .put('/api/usuarios/2')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({ nome: 'Teste' });

            expect(response.status).toBe(500);
        });
    });

    describe('DELETE /api/usuarios/:id - erros adicionais', () => {
        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .delete('/api/usuarios/2')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('POST /api/usuarios/:id/invite - erros adicionais', () => {
        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .post('/api/usuarios/2/invite')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(500);
        });
    });
});
