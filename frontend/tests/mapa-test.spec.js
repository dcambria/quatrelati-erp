// Teste E2E do Mapa de Clientes - Simples
const { test, expect } = require('@playwright/test');
const { TEST_USER } = require('./test-config');

const PROD_URL = 'https://erp.laticinioquatrelati.com.br';

test('mapa de clientes deve carregar', async ({ page }) => {
  test.setTimeout(120000);

  // Capturar erros de console
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Login
  console.log('Fazendo login...');
  await page.goto(`${PROD_URL}/login`);

  // Aguardar formulário carregar
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Preencher email
  const emailInput = page.locator('input[type="email"]');
  await emailInput.click();
  await emailInput.fill(TEST_USER.email);

  // Preencher senha
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.click();
  await passwordInput.fill(TEST_USER.password);

  // Screenshot antes de submeter
  await page.screenshot({ path: 'tests/screenshots/login-preenchido.png' });

  // Submeter
  await page.click('button[type="submit"]');

  // Aguardar resposta
  await page.waitForTimeout(5000);
  console.log('URL após login:', page.url());

  // Verificar se login foi bem sucedido
  if (page.url().includes('/login')) {
    // Screenshot para debug
    await page.screenshot({ path: 'tests/screenshots/login-falhou.png' });
    console.log('Login falhou - ainda na página de login');
  }

  // Ir para clientes
  await page.goto(`${PROD_URL}/clientes`);
  await page.waitForLoadState('networkidle');
  console.log('Página de clientes carregada');

  // Screenshot antes
  await page.screenshot({ path: 'tests/screenshots/antes-mapa.png', fullPage: true });

  // Clicar no botão Mapa
  console.log('Clicando no botão Mapa...');
  const mapaButton = page.locator('button:has-text("Mapa")');
  await expect(mapaButton).toBeVisible({ timeout: 10000 });
  await mapaButton.click();

  // Aguardar carregamento
  await page.waitForTimeout(5000);

  // Screenshot depois
  await page.screenshot({ path: 'tests/screenshots/depois-mapa.png', fullPage: true });

  // Verificar erro de aplicação
  const appError = page.locator('text=Application error');
  const hasAppError = await appError.isVisible().catch(() => false);

  if (hasAppError) {
    console.log('ERRO: Application error detectado!');
    console.log('Erros de console:', consoleErrors);
    throw new Error('Application error ao carregar o mapa');
  }

  // Verificar mapa Leaflet
  const mapContainer = page.locator('.leaflet-container');
  await expect(mapContainer).toBeVisible({ timeout: 15000 });

  console.log('Mapa carregado com sucesso!');

  // Screenshot final
  await page.screenshot({ path: 'tests/screenshots/mapa-ok.png', fullPage: true });
});
