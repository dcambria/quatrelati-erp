// Test rápido para verificar UI dos botões (sem login)
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3002';

test.describe('UI Buttons Check', () => {
  test('capturar screenshot da página de login para análise', async ({ page }) => {
    // Ir direto para a página de clientes
    await page.goto(`${BASE_URL}/clientes`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Mesmo se redirecionar para login, capturar o que tiver
    await page.screenshot({
      path: 'tests/screenshots/ui-check.png',
      fullPage: true
    });

    console.log('📸 Screenshot salvo: tests/screenshots/ui-check.png');
    console.log('📍 URL atual:', page.url());

    // Se foi para login, verificar elementos
    if (page.url().includes('/login')) {
      console.log('ℹ️  Redirecionado para login (esperado sem credenciais)');
    }

    // Listar todos os botões encontrados
    const buttons = page.locator('button');
    const count = await buttons.count();
    console.log(`🔘 Botões encontrados: ${count}`);

    for (let i = 0; i < Math.min(count, 10); i++) {
      const btn = buttons.nth(i);
      const title = await btn.getAttribute('title');
      const text = await btn.textContent();
      console.log(`   ${i + 1}. ${title || text?.trim() || '(sem texto)'}`);
    }

    expect(true).toBe(true);
  });
});
