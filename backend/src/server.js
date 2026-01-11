// =====================================================
// Sistema de Gestão de Pedidos - Laticínio Quatrelati
// Backend API Server v1.2.0
// =====================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Pool } = require('pg');

// Importar rotas
const authRoutes = require('./routes/auth');
const pedidosRoutes = require('./routes/pedidos');
const clientesRoutes = require('./routes/clientes');
const produtosRoutes = require('./routes/produtos');
const usuariosRoutes = require('./routes/usuarios');
const dashboardRoutes = require('./routes/dashboard');
const uploadRoutes = require('./routes/upload');
const logsRoutes = require('./routes/logs');
const configuracoesRoutes = require('./routes/configuracoes');

// Importar utilitários
const seedPasswords = require('./utils/seedPasswords');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração do pool de conexão PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Middleware para disponibilizar o pool em todas as rotas
app.use((req, res, next) => {
    req.db = pool;
    next();
});

// Middlewares de segurança e parsing
app.use(helmet());

// Configurar CORS - suporta múltiplas origens separadas por vírgula
const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:3002'];

app.use(cors({
    origin: corsOrigins,
    credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Quatrelati API',
        version: '1.2.0'
    });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/configuracoes', configuracoesRoutes);

// Middleware de tratamento de erros 404
app.use((req, res, next) => {
    res.status(404).json({
        error: 'Rota não encontrada',
        path: req.path
    });
});

// Middleware de tratamento de erros gerais
app.use((err, req, res, next) => {
    console.error('Erro:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Erro interno do servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Iniciar servidor
app.listen(PORT, async () => {
    console.log('=====================================================');
    console.log('  Sistema de Gestão de Pedidos - Laticínio Quatrelati');
    console.log('  API Server v1.2.0');
    console.log('=====================================================');
    console.log(`  Servidor rodando em http://localhost:${PORT}`);
    console.log(`  Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log('=====================================================');

    // Executar seed de senhas na inicialização
    await seedPasswords(pool);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM recebido. Encerrando conexões...');
    await pool.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT recebido. Encerrando conexões...');
    await pool.end();
    process.exit(0);
});

module.exports = app;
