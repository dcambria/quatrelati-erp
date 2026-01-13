// =====================================================
// Configuração de Testes - Playwright
// v1.0.0 - Credenciais via variáveis de ambiente
// =====================================================

require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3002';

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || '',
  password: process.env.TEST_USER_PASSWORD || '',
};

// Validar se as credenciais estão configuradas
function validateCredentials() {
  if (!TEST_USER.email || !TEST_USER.password) {
    console.error('❌ Credenciais de teste não configuradas!');
    console.error('   Configure TEST_USER_EMAIL e TEST_USER_PASSWORD no .env.local');
    process.exit(1);
  }
}

module.exports = {
  BASE_URL,
  TEST_USER,
  validateCredentials,
};
