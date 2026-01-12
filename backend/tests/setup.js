// =====================================================
// Jest Setup - Configuração Global para Testes
// =====================================================

// Definir variáveis de ambiente antes de qualquer teste
process.env.JWT_SECRET = 'test-jwt-secret-for-all-tests';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-all-tests';
process.env.NODE_ENV = 'test';
