// =====================================================
// Configuração de Testes - Playwright
// v1.1.0 - Suporte a CI/CD com variáveis de ambiente
// =====================================================

// Tentar carregar .env.local (silencioso se não existir)
try {
  require('dotenv').config({ path: '.env.local' });
} catch {
  // Ignorar se dotenv não carregar
}

const BASE_URL = process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || '',
  password: process.env.TEST_USER_PASSWORD || '',
};

// Verificar se está rodando em CI
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

// Validar credenciais (não fatal em CI - testes podem ser skipped)
function validateCredentials() {
  if (!TEST_USER.email || !TEST_USER.password) {
    if (isCI) {
      console.warn('⚠️ Credenciais de teste não configuradas - alguns testes serão skipped');
    } else {
      console.error('❌ Credenciais de teste não configuradas!');
      console.error('   Configure TEST_USER_EMAIL e TEST_USER_PASSWORD no .env.local');
    }
    return false;
  }
  return true;
}

// Verificar se credenciais estão disponíveis
const hasCredentials = !!(TEST_USER.email && TEST_USER.password);

module.exports = {
  BASE_URL,
  TEST_USER,
  validateCredentials,
  hasCredentials,
  isCI,
};
