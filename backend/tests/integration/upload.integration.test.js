// =====================================================
// Testes de Integração - Upload Routes
// =====================================================

const request = require('supertest');
const express = require('express');
const { generateTestToken } = require('../testHelper');

// Mock S3 client
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn().mockImplementation(() => ({
        send: mockSend
    })),
    PutObjectCommand: jest.fn().mockImplementation((params) => params)
}));

jest.mock('@aws-sdk/credential-provider-ini', () => ({
    fromIni: jest.fn().mockReturnValue({})
}));

// Mock sharp
jest.mock('sharp', () => {
    const mockSharp = jest.fn().mockImplementation(() => ({
        webp: jest.fn().mockReturnThis(),
        resize: jest.fn().mockReturnThis(),
        metadata: jest.fn().mockResolvedValue({ width: 800, height: 600 }),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('webp-image-data'))
    }));
    return mockSharp;
});

describe('Upload Routes Integration', () => {
    let app;
    let adminToken;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSend.mockResolvedValue({});

        // Suppress console output
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});

        // Reimport upload routes after mocking
        jest.resetModules();
        const uploadRoutes = require('../../src/routes/upload');

        app = express();
        app.use(express.json());

        // Mock db middleware
        app.use((req, res, next) => {
            req.db = { query: jest.fn() };
            next();
        });

        app.use('/api/upload', uploadRoutes);

        adminToken = generateTestToken({ id: 1, nivel: 'admin' });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('POST /api/upload/image', () => {
        it('deve fazer upload de imagem com sucesso', async () => {
            const response = await request(app)
                .post('/api/upload/image')
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('image', Buffer.from('fake-image-data'), {
                    filename: 'test.jpg',
                    contentType: 'image/jpeg'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('url');
            expect(response.body).toHaveProperty('key');
            expect(response.body.message).toBe('Upload realizado com sucesso');
        });

        it('deve rejeitar requisição sem arquivo', async () => {
            const response = await request(app)
                .post('/api/upload/image')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Nenhum arquivo enviado');
        });

        it('deve rejeitar requisição sem autenticação', async () => {
            const response = await request(app)
                .post('/api/upload/image')
                .attach('image', Buffer.from('fake-image'), {
                    filename: 'test.jpg',
                    contentType: 'image/jpeg'
                });

            expect(response.status).toBe(401);
        });

        it('deve rejeitar tipo de arquivo não permitido', async () => {
            const response = await request(app)
                .post('/api/upload/image')
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('image', Buffer.from('fake-file'), {
                    filename: 'test.txt',
                    contentType: 'text/plain'
                });

            expect(response.status).toBe(500);
        });

        it('deve retornar 500 em caso de erro no S3', async () => {
            mockSend.mockRejectedValueOnce(new Error('S3 Error'));

            const response = await request(app)
                .post('/api/upload/image')
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('image', Buffer.from('fake-image-data'), {
                    filename: 'test.jpg',
                    contentType: 'image/jpeg'
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Erro ao fazer upload da imagem');
        });
    });

    describe('POST /api/upload/logo', () => {
        it('deve fazer upload de logo com sucesso', async () => {
            const response = await request(app)
                .post('/api/upload/logo')
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('logo', Buffer.from('fake-logo-data'), {
                    filename: 'logo.png',
                    contentType: 'image/png'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('url');
            expect(response.body).toHaveProperty('key');
            expect(response.body.message).toBe('Logo enviada com sucesso');
        });

        it('deve rejeitar requisição sem arquivo', async () => {
            const response = await request(app)
                .post('/api/upload/logo')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Nenhum arquivo enviado');
        });

        it('deve retornar 500 em caso de erro no S3', async () => {
            mockSend.mockRejectedValueOnce(new Error('S3 Error'));

            const response = await request(app)
                .post('/api/upload/logo')
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('logo', Buffer.from('fake-logo-data'), {
                    filename: 'logo.png',
                    contentType: 'image/png'
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Erro ao fazer upload da logo');
        });
    });
});
