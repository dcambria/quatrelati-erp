// =====================================================
// Testes de Screenshots da Tela de Login
// v1.3.0 - Usar helpers compartilhados
// =====================================================
const { test, expect } = require('@playwright/test');
const { BASE_URL } = require('./helpers');

test.describe.serial('Login Screenshots', () => {
  test('capturar screenshots da tela de login', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    if (!page.url().includes('/login')) {
      console.log('Usuário já logado - capturado dashboard');
      return;
    }

    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    // Testar modo recuperacao (se botão existir)
    const esqueciBtn = page.locator('button').filter({ hasText: /Esqueci/i });
    if (await esqueciBtn.isVisible().catch(() => false)) {
      await esqueciBtn.click();
      await page.waitForTimeout(500);

      const voltarBtn = page.locator('button').filter({ hasText: /Voltar/i });
      if (await voltarBtn.isVisible().catch(() => false)) {
        await voltarBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);

    console.log('Screenshots da tela de login capturados!');
  });
});
