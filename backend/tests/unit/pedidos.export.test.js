// =====================================================
// Testes Unitários - Pedidos Export Routes
// =====================================================

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock do pdfExportService
jest.mock('../../src/services/pdfExportService', () => ({
    exportarPedidosPDF: jest.fn((res, data) => {
        res.setHeader('Content-Type', 'application/pdf');
        res.send(Buffer.from('PDF content'));
    }),
    exportarPedidosExcel: jest.fn((res, data) => {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(Buffer.from('Excel content'));
    }),
    exportarPedidoIndividualPDF: jest.fn((res, data) => {
        res.setHeader('Content-Type', 'application/pdf');
        res.send(Buffer.from('Individual PDF'));
    })
}));

const { exportarPedidosPDF, exportarPedidosExcel, exportarPedidoIndividualPDF } = require('../../src/services/pdfExportService');

describe('Pedidos Export Routes', () => {
    let app;
    let mockPool;
    let adminToken;
    let vendedorToken;

    const generateToken = (payload) => {
        return jwt.sign(payload, process.env.JWT_SECRET || 'test-jwt-secret', { expiresIn: '1h' });
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockPool = {
            query: jest.fn()
        };

        app = express();
        app.use(express.json());

        // Mock auth middleware
        app.use((req, res, next) => {
            const authHeader = req.headers.authorization;
            if (authHeader) {
                try {
                    const token = authHeader.replace('Bearer ', '');
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-jwt-secret');
                    req.userId = decoded.id;
                    req.userEmail = decoded.email;
                    req.userNivel = decoded.nivel;
                } catch (e) {
                    return res.status(401).json({ error: 'Token inválido' });
                }
            } else {
                return res.status(401).json({ error: 'Token não fornecido' });
            }
            next();
        });

        app.use((req, res, next) => {
            req.db = mockPool;
            next();
        });

        const pedidosRoutes = require('../../src/routes/pedidos');
        app.use('/api/pedidos', pedidosRoutes);

        adminToken = generateToken({ id: 1, email: 'admin@bureau-it.com', nivel: 'admin' });
        vendedorToken = generateToken({ id: 2, email: 'vendedor@bureau-it.com', nivel: 'vendedor' });

        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('GET /api/pedidos/exportar/pdf', () => {
        it('deve exportar PDF para admin', async () => {
            // Mock verificação de nível
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });

            // Mock pedidos
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, cliente_nome: 'Cliente 1', total: 100 }],
                rowCount: 1
            });

            // Mock totais
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    peso_pendente: 100,
                    unidades_pendente: 10,
                    valor_pendente: 1000,
                    pedidos_pendentes: 5,
                    peso_entregue: 50,
                    unidades_entregue: 5,
                    valor_entregue: 500,
                    pedidos_entregues: 2
                }],
                rowCount: 1
            });

            // Mock itens
            mockPool.query.mockResolvedValueOnce({
                rows: [{ pedido_id: 1, produto_nome: 'Produto 1', quantidade_caixas: 10 }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/pedidos/exportar/pdf?mes=1&ano=2026')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(exportarPedidosPDF).toHaveBeenCalled();
        });

        it('deve exportar PDF com filtro de vendedor_id para admin', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });

            // Mock buscar nome vendedor
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nome: 'Vendedor Específico' }],
                rowCount: 1
            });

            // Mock pedidos
            mockPool.query.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });

            // Mock totais
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    peso_pendente: 0, unidades_pendente: 0, valor_pendente: 0, pedidos_pendentes: 0,
                    peso_entregue: 0, unidades_entregue: 0, valor_entregue: 0, pedidos_entregues: 0
                }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/pedidos/exportar/pdf?vendedor_id=3')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve forçar vendedor_id para vendedor sem permissão', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'vendedor', pode_visualizar_todos: false }],
                rowCount: 1
            });

            // Mock buscar nome vendedor
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nome: 'Vendedor' }],
                rowCount: 1
            });

            // Mock pedidos (apenas do vendedor)
            mockPool.query.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });

            // Mock totais
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    peso_pendente: 0, unidades_pendente: 0, valor_pendente: 0, pedidos_pendentes: 0,
                    peso_entregue: 0, unidades_entregue: 0, valor_entregue: 0, pedidos_entregues: 0
                }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/pedidos/exportar/pdf')
                .set('Authorization', `Bearer ${vendedorToken}`);

            expect(response.status).toBe(200);
            // Verificar que a query usou o ID do vendedor logado
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('created_by'),
                expect.arrayContaining([2]) // ID do vendedor
            );
        });

        it('deve aplicar todos os filtros', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });

            mockPool.query.mockResolvedValueOnce({
                rows: [{ nome: 'Vendedor' }],
                rowCount: 1
            });

            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    peso_pendente: 0, unidades_pendente: 0, valor_pendente: 0, pedidos_pendentes: 0,
                    peso_entregue: 0, unidades_entregue: 0, valor_entregue: 0, pedidos_entregues: 0
                }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/pedidos/exportar/pdf?mes=1&ano=2026&cliente_id=1&produto_id=1&status=entregue&vendedor_id=1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve exportar PDF com filtro de ano apenas', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });

            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    peso_pendente: 0, unidades_pendente: 0, valor_pendente: 0, pedidos_pendentes: 0,
                    peso_entregue: 0, unidades_entregue: 0, valor_entregue: 0, pedidos_entregues: 0
                }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/pedidos/exportar/pdf?ano=2026')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve retornar 500 em caso de erro', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/pedidos/exportar/pdf')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/pedidos/exportar/excel', () => {
        it('deve exportar Excel', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });

            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, cliente_nome: 'Cliente 1' }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/pedidos/exportar/excel')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(exportarPedidosExcel).toHaveBeenCalled();
        });

        it('deve exportar Excel com filtro de mes e ano', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });

            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, cliente_nome: 'Cliente 1' }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/pedidos/exportar/excel?mes=1&ano=2026')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve exportar Excel com filtro de ano apenas', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });

            mockPool.query.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });

            const response = await request(app)
                .get('/api/pedidos/exportar/excel?ano=2026')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve exportar Excel com filtro de cliente_id', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });

            mockPool.query.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });

            const response = await request(app)
                .get('/api/pedidos/exportar/excel?cliente_id=1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve exportar Excel com filtro de produto_id', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });

            mockPool.query.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });

            const response = await request(app)
                .get('/api/pedidos/exportar/excel?produto_id=1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve exportar Excel com status pendente', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });

            mockPool.query.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });

            const response = await request(app)
                .get('/api/pedidos/exportar/excel?status=pendente')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve exportar Excel com status entregue', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });

            mockPool.query.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });

            const response = await request(app)
                .get('/api/pedidos/exportar/excel?status=entregue')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve exportar Excel com filtro de vendedor_id', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'admin', pode_visualizar_todos: true }],
                rowCount: 1
            });

            mockPool.query.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });

            const response = await request(app)
                .get('/api/pedidos/exportar/excel?vendedor_id=2')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
        });

        it('deve forçar vendedor_id para vendedor sem permissão no Excel', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ nivel: 'vendedor', pode_visualizar_todos: false }],
                rowCount: 1
            });

            mockPool.query.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });

            const response = await request(app)
                .get('/api/pedidos/exportar/excel')
                .set('Authorization', `Bearer ${vendedorToken}`);

            expect(response.status).toBe(200);
        });

        it('deve retornar 500 em caso de erro', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/pedidos/exportar/excel')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/pedidos/:id/pdf', () => {
        it('deve exportar PDF individual', async () => {
            // Mock pedido
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    cliente_nome: 'Cliente',
                    total: 100,
                    created_by: 1
                }],
                rowCount: 1
            });

            // Mock itens
            mockPool.query.mockResolvedValueOnce({
                rows: [{ produto_nome: 'Produto 1', quantidade_caixas: 10 }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/pedidos/1/pdf')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(exportarPedidoIndividualPDF).toHaveBeenCalled();
        });

        it('deve retornar 404 para pedido inexistente', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [],
                rowCount: 0
            });

            const response = await request(app)
                .get('/api/pedidos/999/pdf')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });

        it('deve retornar 500 em caso de erro', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/pedidos/1/pdf')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(500);
        });
    });
});
