// Test de debug para página de clientes
const { test, expect } = require('@playwright/test');
const { BASE_URL, TEST_USER, validateCredentials } = require('./test-config');

validateCredentials();

test.describe('Debug Clientes', () => {
  test('verificar página de clientes e botões', async ({ page }) => {
    // Capturar erros do console
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    if (page.url().includes('/login')) {
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
    }

    await page.waitForTimeout(2000);
    console.log('✅ Login OK, URL:', page.url());

    // Ir para clientes
    await page.goto(`${BASE_URL}/clientes`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Screenshot inicial
    await page.screenshot({
      path: 'tests/screenshots/clientes-debug.png',
      fullPage: true
    });

    console.log('📸 Screenshot: clientes-debug.png');

    // Verificar se há clientes
    const clientesCount = await page.locator('.glass-card').count();
    console.log(`📊 Cards encontrados: ${clientesCount}`);

    // Verificar erros
    if (errors.length > 0) {
      console.log('❌ ERROS DO CONSOLE:');
      errors.forEach(e => console.log('  -', e));
    } else {
      console.log('✅ Sem erros no console');
    }

    // Verificar botão do mapa
    const toggleMap = page.locator('button[title="Exibir mapa"]');
    const mapExists = await toggleMap.count();
    console.log(`🗺️ Botão Mapa existe: ${mapExists > 0 ? 'SIM' : 'NÃO'}`);

    // Verificar botão de proximidade
    const btnProximidade = page.locator('button[title="Ordenar por proximidade da sua localização"]');
    const proximidadeExists = await btnProximidade.count();
    console.log(`📍 Botão Proximidade existe: ${proximidadeExists > 0 ? 'SIM' : 'NÃO'}`);

    // Clicar no mapa se existir
    if (mapExists > 0) {
      await toggleMap.click();
      await page.waitForTimeout(3000);
      await page.screenshot({
        path: 'tests/screenshots/clientes-mapa.png',
        fullPage: true
      });
      console.log('📸 Screenshot: clientes-mapa.png');
    }

    // Fechar mapa e tirar screenshot dos botões
    const closeMap = page.locator('button[title="Ocultar mapa"]');
    if (await closeMap.count() > 0) {
      await closeMap.click();
      await page.waitForTimeout(500);
    }

    // Screenshot focado na área dos botões
    const searchCard = page.locator('.glass-card').first();
    if (await searchCard.count() > 0) {
      await searchCard.screenshot({
        path: 'tests/screenshots/clientes-botoes.png'
      });
      console.log('📸 Screenshot: clientes-botoes.png');
    }

    expect(errors.length).toBe(0);
  });
});
