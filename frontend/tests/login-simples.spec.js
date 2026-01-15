const { test, expect } = require('@playwright/test');
const { TEST_USER } = require('./test-config');

const PROD_URL = 'https://erp.laticinioquatrelati.com.br';

test('login deve funcionar', async ({ page }) => {
  await page.goto(`${PROD_URL}/login`);

  // Preencher
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);

  // Escutar resposta da API
  const [response] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/auth/login'), { timeout: 30000 }).catch(() => null),
    page.click('button[type="submit"]')
  ]);

  if (response) {
    console.log('Resposta da API:', response.status());
    const json = await response.json().catch(() => ({}));
    console.log('JSON:', JSON.stringify(json).slice(0, 200));
  } else {
    console.log('Nenhuma resposta da API capturada');
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/screenshots/login-resultado.png' });

  console.log('URL final:', page.url());
});
