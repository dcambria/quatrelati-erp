// =====================================================
// Testes de Fluxo de Magic Link
// v1.1.0 - Habilitar testes de magic link
// =====================================================
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

test('fluxo completo de magic link', async ({ page, request }) => {
  test.setTimeout(60000);

  // 1. Ir para a tela de login
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/screenshots/magic-1-login.png' });

  // 2. Clicar em "Esqueci minha senha" (novo fluxo de recuperacao)
  await page.click('button:has-text("Esqueci minha senha")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screenshots/magic-2-recovery.png' });

  // 3. Verificar que estamos na tela de recuperacao
  await expect(page.locator('text=Recuperar senha')).toBeVisible();

  // 4. Buscar o magic link via API diretamente (em dev retorna o link)
  const response = await request.post(`${API_URL}/api/auth/forgot-password`, {
    data: { email: 'daniel.cambria@bureau-it.com' }
  });

  const data = await response.json();
  console.log('Resposta do forgot-password:', JSON.stringify(data, null, 2));

  // Verificar se temos o devLink
  expect(data.devLink).toBeDefined();
  console.log('Magic Link:', data.devLink);

  // 5. Extrair o token do link
  const url = new URL(data.devLink);
  const token = url.searchParams.get('token');
  console.log('Token:', token);

  // 6. Navegar para a pagina de magic-link com o token (corrigir URL base)
  await page.goto(`${BASE_URL}/magic-link?token=${token}`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'tests/screenshots/magic-4-validating.png' });

  // 7. Aguardar validacao e redirecionamento
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/screenshots/magic-5-success.png' });

  // 8. Verificar se foi redirecionado para o dashboard ou login
  const currentUrl = page.url();
  const isOnDashboardOrLogin = !currentUrl.includes('magic-link');
  expect(isOnDashboardOrLogin).toBeTruthy();

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/screenshots/magic-6-result.png' });

  console.log('Fluxo de Magic Link completado com sucesso!');
});

test('magic link invalido deve mostrar erro', async ({ page }) => {
  // Navegar com token invalido
  await page.goto(`${BASE_URL}/magic-link?token=token-invalido-12345`);
  await page.waitForTimeout(2000);

  // Verificar mensagem de erro (usar heading para evitar duplicatas)
  await expect(page.locator('h2:has-text("Link invalido")')).toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: 'tests/screenshots/magic-error.png' });

  console.log('Teste de token invalido passou!');
});
