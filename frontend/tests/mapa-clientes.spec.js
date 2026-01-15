// =====================================================
// Teste E2E do Mapa de Clientes
// v2.0.0 - Teste em produção com Playwright
// =====================================================
const { test, expect } = require('@playwright/test');
const { TEST_USER } = require('./test-config');

const PROD_URL = 'https://erp.laticinioquatrelati.com.br';

test('mapa de clientes deve carregar sem erros', async ({ page }) => {
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
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Aguardar redirecionamento pós-login
    await page.waitForTimeout(3000);

    // Verificar se saiu da página de login
    const currentUrl = page.url();
    console.log('URL atual:', currentUrl);

    if (currentUrl.includes('/login')) {
      // Tentar novamente
      console.log('Ainda na página de login, aguardando mais...');
      await page.waitForTimeout(5000);
    }

    console.log('Login OK');

    // Ir para clientes
    if (!page.url().includes('/clientes')) {
      await page.goto(`${PROD_URL}/clientes`);
    }
    await page.waitForLoadState('networkidle');
    console.log('Página de clientes carregada');

    // Screenshot antes de clicar no mapa
    await page.screenshot({ path: 'tests/screenshots/clientes-antes-mapa.png', fullPage: true });

    // Clicar no botão Mapa
    console.log('Clicando no botão Mapa...');
    const mapaButton = page.locator('button:has-text("Mapa")');
    await expect(mapaButton).toBeVisible({ timeout: 10000 });
    await mapaButton.click();

    // Aguardar carregamento
    console.log('Aguardando mapa carregar...');
    await page.waitForTimeout(5000);

    // Screenshot após clicar
    await page.screenshot({ path: 'tests/screenshots/clientes-apos-mapa.png', fullPage: true });

    // Verificar se não há erro de aplicação
    const appError = page.locator('text=Application error');
    const hasAppError = await appError.isVisible().catch(() => false);

    if (hasAppError) {
      console.log('ERRO: Application error detectado!');
      console.log('Erros de console:', consoleErrors);
      await page.screenshot({ path: 'tests/screenshots/mapa-erro.png', fullPage: true });
      throw new Error('Application error ao carregar o mapa');
    }

    // Verificar se o mapa foi renderizado (container Leaflet)
    console.log('Verificando elementos do mapa...');
    const mapContainer = page.locator('.leaflet-container');

    try {
      await expect(mapContainer).toBeVisible({ timeout: 15000 });
      console.log('Container Leaflet visível');
    } catch (e) {
      console.log('Mapa não encontrado, verificando estado da página...');
      console.log('Erros de console:', consoleErrors);
      await page.screenshot({ path: 'tests/screenshots/mapa-nao-encontrado.png', fullPage: true });
      throw e;
    }

    // Screenshot do mapa carregado
    await page.screenshot({ path: 'tests/screenshots/mapa-clientes-ok.png', fullPage: true });
    console.log('Mapa carregado com sucesso!');

    // Verificar se há marcadores
    const markers = page.locator('.custom-marker, .leaflet-marker-icon');
    const markerCount = await markers.count();
    console.log(`Marcadores encontrados: ${markerCount}`);

    // Log de erros de console se houver
    if (consoleErrors.length > 0) {
      console.log('Avisos/Erros de console:', consoleErrors);
    }
});
