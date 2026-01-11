// Setup para testes

// Timeout maior para operações de banco
jest.setTimeout(30000);

// Mock de variáveis de ambiente
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.NODE_ENV = 'test';
