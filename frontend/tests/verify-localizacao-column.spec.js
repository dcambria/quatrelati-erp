// Teste rápido para verificar coluna de Localização
const { test, expect } = require('@playwright/test');
const { TEST_USER } = require('./test-config');

const PROD_URL = 'https://erp.laticinioquatrelati.com.br';

test('deve exibir coluna de Localização separada na tabela', async ({ page }) => {
  // Login
  await page.goto(`${PROD_URL}/login`);
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(clientes)?$/, { timeout: 20000 });

  // Ir para clientes
  if (!page.url().includes('/clientes')) {
    await page.goto(`${PROD_URL}/clientes`);
  }
  await page.waitForLoadState('networkidle');

  // Verificar cabeçalho da coluna Localização
  const headerLocalizacao = await page.locator('th:has-text("Localização")').count();
  console.log('Coluna Localização no cabeçalho:', headerLocalizacao);

  // Verificar que há botões de localização na tabela (células separadas)
  const botoesLocalizacao = await page.locator('td button:has(svg)').all();
  console.log('Botões de localização nas células:', botoesLocalizacao.length);

  // Screenshot
  await page.screenshot({ path: 'tests/screenshots/coluna-localizacao-prod.png', fullPage: true });

  // Verificar que a coluna existe
  expect(headerLocalizacao).toBe(1);
});
