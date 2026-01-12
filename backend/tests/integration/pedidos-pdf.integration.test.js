// =====================================================
// Testes de Integração - Pedidos PDF Export (Error Cases)
// =====================================================

const request = require('supertest');
const { createTestApp, createMockPool, generateTestToken } = require('../testHelper');

// Simple mock for PDFDocument
jest.mock('pdfkit', () => {
    return jest.fn().mockImplementation(() => ({
        pipe: jest.fn().mockReturnThis(),
        page: { width: 842, height: 595 },
        addPage: jest.fn().mockReturnThis(),
        image: jest.fn().mockReturnThis(),
        fillColor: jest.fn().mockReturnThis(),
        strokeColor: jest.fn().mockReturnThis(),
        fontSize: jest.fn().mockReturnThis(),
        font: jest.fn().mockReturnThis(),
        text: jest.fn().mockReturnThis(),
        rect: jest.fn().mockReturnThis(),
        fill: jest.fn().mockReturnThis(),
        stroke: jest.fn().mockReturnThis(),
        moveTo: jest.fn().mockReturnThis(),
        lineTo: jest.fn().mockReturnThis(),
        moveDown: jest.fn().mockReturnThis(),
        end: jest.fn(),
        on: jest.fn().mockReturnThis(),
        y: 100,
        x: 40,
        switchToPage: jest.fn().mockReturnThis(),
        bufferedPageRange: jest.fn().mockReturnValue({ start: 0, count: 1 })
    }));
});

// Mock date-fns
jest.mock('date-fns', () => ({
    format: jest.fn(() => '12/01/2026 10:00'),
    parseISO: jest.fn((date) => new Date(date))
}));

const pedidosRoutes = require('../../src/routes/pedidos');

describe('Pedidos PDF Export Integration', () => {
    let app;
    let mockPool;
    let adminToken;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPool = createMockPool();
        app = createTestApp(mockPool);
        app.use('/api/pedidos', pedidosRoutes);

        adminToken = generateTestToken({ id: 1, nivel: 'admin', pode_visualizar_todos: true });

        // Suppress console output
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('GET /api/pedidos/exportar/pdf', () => {
        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/pedidos/exportar/pdf')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/pedidos/:id/pdf', () => {
        it('deve retornar 404 para pedido não encontrado', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .get('/api/pedidos/999/pdf')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });

        it('deve retornar 500 em caso de erro no banco', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/pedidos/1/pdf')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });
});
