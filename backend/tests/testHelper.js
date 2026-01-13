// =====================================================
// Test Helper - Setup para testes de integração
// =====================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Mock do pool de banco de dados
const createMockPool = () => {
    const mockResults = {
        rows: [],
        rowCount: 0
    };

    return {
        query: jest.fn().mockResolvedValue(mockResults),
        connect: jest.fn().mockResolvedValue({
            query: jest.fn().mockResolvedValue(mockResults),
            release: jest.fn()
        }),
        end: jest.fn().mockResolvedValue()
    };
};

// Criar app de teste
const createTestApp = (mockPool) => {
    const app = express();

    // Middleware para disponibilizar o pool mock
    app.use((req, res, next) => {
        req.db = mockPool || createMockPool();
        next();
    });

    // Middlewares básicos
    app.use(helmet());
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    return app;
};

// Gerar token JWT válido para testes
// Usa o mesmo secret definido em setup.js
const generateTestToken = (payload = {}) => {
    const jwt = require('jsonwebtoken');
    const defaultPayload = {
        id: 1,
        email: 'test@bureau-it.com',
        nivel: 'admin',
        ...payload
    };
    // Deve usar o mesmo secret de setup.js
    return jwt.sign(defaultPayload, 'test-jwt-secret-for-all-tests', {
        expiresIn: '1h'
    });
};

// Gerar refresh token JWT válido para testes
const generateTestRefreshToken = (payload = {}) => {
    const jwt = require('jsonwebtoken');
    const defaultPayload = {
        id: 1,
        type: 'refresh',
        ...payload
    };
    return jwt.sign(defaultPayload, 'test-refresh-secret-for-all-tests', {
        expiresIn: '7d'
    });
};

// Dados de teste
const testData = {
    users: [
        {
            id: 1,
            nome: 'Admin Test',
            email: 'admin@bureau-it.com',
            nivel: 'admin',
            ativo: true,
            pode_visualizar_todos: true,
            senha_hash: '$2a$10$test'
        },
        {
            id: 2,
            nome: 'User Test',
            email: 'user@bureau-it.com',
            nivel: 'user',
            ativo: true,
            pode_visualizar_todos: false,
            senha_hash: '$2a$10$test'
        }
    ],
    clientes: [
        {
            id: 1,
            nome: 'Cliente Teste',
            cnpj_cpf: '12345678901234',
            telefone: '11999999999',
            email: 'cliente@bureau-it.com',
            ativo: true
        }
    ],
    produtos: [
        {
            id: 1,
            nome: 'Produto Teste',
            descricao: 'Descrição teste',
            peso_caixa_kg: 10.5,
            preco_padrao: 100.00,
            ativo: true
        }
    ],
    pedidos: [
        {
            id: 1,
            numero_pedido: 'PED-2026-001',
            data_pedido: '2026-01-01',
            cliente_id: 1,
            produto_id: 1,
            quantidade_caixas: 10,
            peso_kg: 105,
            preco_unitario: 100.00,
            total: 1000.00,
            entregue: false
        }
    ]
};

module.exports = {
    createMockPool,
    createTestApp,
    generateTestToken,
    generateTestRefreshToken,
    testData
};
