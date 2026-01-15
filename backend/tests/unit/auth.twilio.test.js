// =====================================================
// Testes Unitários - Auth Twilio WhatsApp
// =====================================================

const request = require('supertest');
const express = require('express');

// Mock do Twilio antes de importar o módulo
const mockTwilioCreate = jest.fn();
jest.mock('twilio', () => {
    return jest.fn(() => ({
        messages: {
            create: mockTwilioCreate
        }
    }));
});

describe('Auth Routes - Twilio WhatsApp', () => {
    let app;
    let mockDb;
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();

        // Configurar variáveis de ambiente
        process.env = {
            ...originalEnv,
            JWT_SECRET: 'test-jwt-secret',
            JWT_REFRESH_SECRET: 'test-refresh-secret',
            TWILIO_ACCOUNT_SID: 'test-sid',
            TWILIO_AUTH_TOKEN: 'test-token',
            TWILIO_WHATSAPP_FROM: 'whatsapp:+14155238886',
            NODE_ENV: 'test'
        };

        mockDb = {
            query: jest.fn()
        };

        app = express();
        app.use(express.json());
        app.use((req, res, next) => {
            req.db = mockDb;
            next();
        });

        // Importar rotas após configurar mocks
        const authRoutes = require('../../src/routes/auth');
        app.use('/api/auth', authRoutes);

        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.restoreAllMocks();
    });

    describe('POST /api/auth/forgot-password-whatsapp', () => {
        it('deve enviar código via Twilio com sucesso', async () => {
            // Mock: usuário encontrado
            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    nome: 'João Silva',
                    email: 'joao@bureau-it.com',
                    telefone: '+55 11 99999-9999'
                }],
                rowCount: 1
            });

            // Mock: inserir magic link
            mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            // Mock: Twilio sucesso
            mockTwilioCreate.mockResolvedValueOnce({ sid: 'SM123456' });

            const response = await request(app)
                .post('/api/auth/forgot-password-whatsapp')
                .send({ phone: '11999999999' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('WhatsApp');
            expect(response.body.email).toBe('joao@bureau-it.com');
        });

        it('deve retornar erro quando Twilio falha', async () => {
            // Mock: usuário encontrado
            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    nome: 'João Silva',
                    email: 'joao@bureau-it.com',
                    telefone: '+5511999999999'
                }],
                rowCount: 1
            });

            // Mock: inserir magic link
            mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            // Mock: Twilio erro
            mockTwilioCreate.mockRejectedValueOnce(new Error('Twilio API Error'));

            const response = await request(app)
                .post('/api/auth/forgot-password-whatsapp')
                .send({ phone: '11999999999' });

            expect(response.status).toBe(500);
            expect(response.body.error).toContain('WhatsApp');
        });

        it('deve formatar telefone sem + corretamente', async () => {
            // Mock: usuário com telefone sem +
            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    nome: 'Maria',
                    email: 'maria@bureau-it.com',
                    telefone: '5511988887777' // Sem +
                }],
                rowCount: 1
            });

            mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
            mockTwilioCreate.mockResolvedValueOnce({ sid: 'SM789' });

            const response = await request(app)
                .post('/api/auth/forgot-password-whatsapp')
                .send({ phone: '988887777' });

            expect(response.status).toBe(200);
            // Verificar que Twilio foi chamado com telefone formatado com whatsapp:+
            expect(mockTwilioCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: expect.stringMatching(/^whatsapp:\+/)
                })
            );
        });

        it('deve retornar 500 em caso de erro geral', async () => {
            // Mock: erro no banco
            mockDb.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .post('/api/auth/forgot-password-whatsapp')
                .send({ phone: '11999999999' });

            expect(response.status).toBe(500);
            expect(response.body.error).toContain('processar');
        });
    });
});

describe('Auth Routes - Twilio não configurado', () => {
    let app;
    let mockDb;
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();

        // Sem credenciais Twilio
        process.env = {
            ...originalEnv,
            JWT_SECRET: 'test-jwt-secret',
            JWT_REFRESH_SECRET: 'test-refresh-secret',
            TWILIO_ACCOUNT_SID: '',
            TWILIO_AUTH_TOKEN: '',
            NODE_ENV: 'development'
        };

        mockDb = {
            query: jest.fn()
        };

        app = express();
        app.use(express.json());
        app.use((req, res, next) => {
            req.db = mockDb;
            next();
        });

        // Re-mock twilio para retornar null client
        jest.mock('twilio', () => {
            return jest.fn(() => {
                throw new Error('Invalid credentials');
            });
        });

        const authRoutes = require('../../src/routes/auth');
        app.use('/api/auth', authRoutes);

        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.restoreAllMocks();
    });

    it('deve retornar código em modo desenvolvimento quando Twilio não configurado', async () => {
        // Mock: usuário encontrado
        mockDb.query.mockResolvedValueOnce({
            rows: [{
                id: 1,
                nome: 'Test User',
                email: 'test@bureau-it.com',
                telefone: '+5511999999999'
            }],
            rowCount: 1
        });

        // Mock: inserir magic link
        mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

        const response = await request(app)
            .post('/api/auth/forgot-password-whatsapp')
            .send({ phone: '11999999999' });

        // Quando Twilio não está configurado, retorna 503
        expect(response.status).toBe(503);
        expect(response.body.error).toContain('WhatsApp não está disponível');
    });
});
