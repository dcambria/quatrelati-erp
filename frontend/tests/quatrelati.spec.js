// =====================================================
// Testes E2E - Quatrelati
// v1.3.0 - Usar helpers compartilhados
// =====================================================
// @ts-check
const { test, expect } = require('@playwright/test');
const { login, BASE_URL, API_URL, TEST_USER } = require('./helpers');

// Helper para fazer login via API e configurar localStorage
async function setupAuth(page) {
  try {
    const loginResponse = await page.request.post(`${API_URL}/api/auth/login`, {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password,
      },
      timeout: 10000,
    });

    if (!loginResponse.ok()) {
      return false;
    }

    const loginData = await loginResponse.json();

    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate((tokens) => {
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }, loginData);

    return true;
  } catch {
    return false;
  }
}

test.describe.serial('Quatrelati - Sistema de Gestao de Pedidos', () => {
  test.describe.serial('Pagina de Login', () => {
    test('deve exibir a pagina de login corretamente', async ({ page }) => {
      await page.context().clearCookies();

      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      if (!page.url().includes('/login')) {
        return;
      }

      const emailInput = page.locator('input[type="email"]');
      const hasEmail = await emailInput.isVisible().catch(() => false);
      expect(hasEmail).toBeTruthy();
    });

    test('deve mostrar erro com credenciais invalidas', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      if (!page.url().includes('/login')) {
        return;
      }

      const emailInput = page.locator('input[type="email"]');
      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill('email@invalido.com');
        await page.locator('input[type="password"]').fill('senhaerrada');
        await page.locator('button[type="submit"]').click();
        await page.waitForTimeout(3000);
      }

      const url = page.url();
      expect(url).toContain('/login');
    });

    test('deve preencher formulario de login', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      if (!page.url().includes('/login')) {
        return;
      }

      const emailInput = page.locator('input[type="email"]');
      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill(TEST_USER.email);
        await page.locator('input[type="password"]').fill(TEST_USER.password);
        await expect(emailInput).toHaveValue(TEST_USER.email);
      }
    });
  });

  test.describe.serial('Dashboard', () => {
    test('deve redirecionar para dashboard apos autenticacao', async ({ page }) => {
      await login(page);
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/login');
    });
  });

  test.describe.serial('Pedidos', () => {
    test('deve carregar pagina de pedidos', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/pedidos`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const isOnPedidos = page.url().includes('/pedidos');
      const hasTable = await page.locator('table').isVisible().catch(() => false);

      expect(isOnPedidos || hasTable).toBeTruthy();
    });
  });

  test.describe.serial('Clientes', () => {
    test('deve carregar pagina de clientes', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/clientes`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const url = page.url();
      const isOnClientes = url.includes('/clientes');
      expect(isOnClientes).toBeTruthy();
    });
  });

  test.describe.serial('Produtos', () => {
    test('deve carregar pagina de produtos', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/produtos`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const isOnProdutos = page.url().includes('/produtos');
      expect(isOnProdutos).toBeTruthy();
    });
  });

  test.describe.serial('API Tests', () => {
    async function loginAPI(request) {
      const response = await request.post(`${API_URL}/api/auth/login`, {
        data: {
          email: TEST_USER.email,
          password: TEST_USER.password,
        },
        timeout: 10000,
      });
      return response;
    }

    test('API health check deve estar funcionando', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/health`, { timeout: 5000 });
      expect(response.ok()).toBeTruthy();
    });

    test('API de login deve validar credenciais', async ({ request }) => {
      const response = await request.post(`${API_URL}/api/auth/login`, {
        data: {
          email: 'teste@invalido.com',
          password: 'senhaerrada',
        },
        timeout: 10000,
      });

      expect(response.status()).toBe(401);
    });

    test('API de login deve retornar tokens', async ({ request }) => {
      const response = await loginAPI(request);

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.accessToken).toBeTruthy();
      expect(data.refreshToken).toBeTruthy();
      expect(data.user.email).toBe(TEST_USER.email);
    });

    test('API de pedidos deve retornar lista', async ({ request }) => {
      const loginResponse = await loginAPI(request);
      expect(loginResponse.ok()).toBeTruthy();
      const { accessToken } = await loginResponse.json();

      const response = await request.get(`${API_URL}/api/pedidos`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000,
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.pedidos).toBeDefined();
    });

    test('API de clientes deve retornar lista', async ({ request }) => {
      const loginResponse = await loginAPI(request);
      expect(loginResponse.ok()).toBeTruthy();
      const { accessToken } = await loginResponse.json();

      const response = await request.get(`${API_URL}/api/clientes`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000,
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.clientes).toBeDefined();
    });

    test('API de produtos deve retornar lista', async ({ request }) => {
      const loginResponse = await loginAPI(request);
      expect(loginResponse.ok()).toBeTruthy();
      const { accessToken } = await loginResponse.json();

      const response = await request.get(`${API_URL}/api/produtos`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000,
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.produtos).toBeDefined();
    });

    test('API de dashboard deve retornar resumo', async ({ request }) => {
      const loginResponse = await loginAPI(request);
      expect(loginResponse.ok()).toBeTruthy();
      const { accessToken } = await loginResponse.json();

      const response = await request.get(`${API_URL}/api/dashboard/resumo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000,
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.resumo).toBeDefined();
    });
  });
});
