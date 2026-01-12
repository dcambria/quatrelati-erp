// =====================================================
// Helpers compartilhados para testes Playwright
// v1.1.0 - Melhorar resiliência do irParaPedidos
// =====================================================

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

const TEST_USER = {
  email: 'daniel.cambria@bureau-it.com',
  password: 'srxwdjedi',
};

/**
 * Aguardar servidor estar pronto
 */
async function waitForServer(page, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await page.goto(`${BASE_URL}/login`, {
        timeout: 30000,
        waitUntil: 'domcontentloaded',
      });
      if (response && response.ok()) {
        await page.waitForTimeout(1000);
        return true;
      }
    } catch {
      console.log(`Tentativa ${i + 1}/${maxRetries} - aguardando servidor...`);
      await page.waitForTimeout(3000);
    }
  }
  return false;
}

/**
 * Login robusto com tratamento de estados
 */
async function login(page) {
  // Garantir servidor pronto
  await waitForServer(page);

  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Se já logado, retorna
  if (!page.url().includes('/login')) {
    return true;
  }

  // Aguardar form de login
  const emailInput = page.locator('input[type="email"]');
  try {
    await emailInput.waitFor({ state: 'visible', timeout: 20000 });
  } catch {
    // Se não encontrar, verifica se já está logado
    if (!page.url().includes('/login')) {
      return true;
    }
    throw new Error('Campo de email não encontrado');
  }

  await emailInput.fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();

  // Aguardar redirecionamento
  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Navegar para página de pedidos
 */
async function irParaPedidos(page) {
  await page.goto(`${BASE_URL}/pedidos`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Tentar aguardar tabela ou qualquer conteúdo visível
  try {
    await page.waitForSelector('table', {
      state: 'visible',
      timeout: 30000,
    });
  } catch {
    // Fallback: aguardar qualquer elemento main ou div visível
    await page.waitForTimeout(2000);
  }
}

/**
 * Navegar para qualquer rota autenticada
 */
async function navegarPara(page, rota) {
  await page.goto(`${BASE_URL}${rota}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

/**
 * Verificar se há pedidos na tabela
 */
async function hasPedidos(page) {
  const rows = page.locator('table tbody tr');
  const count = await rows.count().catch(() => 0);
  return count > 0;
}

/**
 * Obter primeiro pedido da tabela
 */
async function getPrimeiroPedido(page) {
  const row = page.locator('table tbody tr').first();
  const isVisible = await row.isVisible().catch(() => false);
  return isVisible ? row : null;
}

module.exports = {
  BASE_URL,
  API_URL,
  TEST_USER,
  waitForServer,
  login,
  irParaPedidos,
  navegarPara,
  hasPedidos,
  getPrimeiroPedido,
};
