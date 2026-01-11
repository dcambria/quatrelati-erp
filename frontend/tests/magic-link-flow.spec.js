const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

test.skip('fluxo completo de magic link', async ({ page, request }) => {
  // 1. Ir para a tela de login
  await page.goto(`${BASE_URL}/login`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/screenshots/magic-1-login.png' });

  // 2. Clicar em "Entrar com Magic Link"
  await page.click('button:has-text("Magic Link")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screenshots/magic-2-form.png' });

  // 3. Preencher email e enviar
  await page.fill('input[type="email"]', 'daniel.cambria@bureau-it.com');
  await page.click('button:has-text("Enviar link")');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/screenshots/magic-3-sent.png' });

  // 4. Buscar o magic link via API (em dev retorna o link)
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

  // 6. Navegar para a pagina de magic-link com o token
  await page.goto(`${BASE_URL}/magic-link?token=${token}`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'tests/screenshots/magic-4-validating.png' });

  // 7. Aguardar validacao e redirecionamento
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/screenshots/magic-5-success.png' });

  // 8. Verificar se foi redirecionado para o dashboard
  await page.waitForURL('**/', { timeout: 10000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/screenshots/magic-6-dashboard.png' });

  // 9. Verificar se esta logado (deve mostrar o nome do usuario)
  const userElement = await page.locator('text=Daniel Cambria').first();
  await expect(userElement).toBeVisible({ timeout: 5000 });

  console.log('Fluxo de Magic Link completado com sucesso!');
});

test.skip('magic link invalido deve mostrar erro', async ({ page }) => {
  // Navegar com token invalido
  await page.goto(`${BASE_URL}/magic-link?token=token-invalido-12345`);
  await page.waitForTimeout(2000);

  // Verificar mensagem de erro (usar heading para evitar duplicatas)
  await expect(page.locator('h2:has-text("Link invalido")')).toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: 'tests/screenshots/magic-error.png' });

  console.log('Teste de token invalido passou!');
});
