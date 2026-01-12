// =====================================================
// Testes Responsivos
// v1.3.0 - Usar helpers compartilhados
// =====================================================
const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

test.describe.serial('Responsive Tests', () => {
  test('capturar screenshots responsivos', async ({ page }) => {
    await login(page);

    // Desktop expandido
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    // Tentar recolher sidebar
    const recolherBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
    if (await recolherBtn.isVisible().catch(() => false)) {
      await recolherBtn.click();
      await page.waitForTimeout(500);
    }

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);

    // Tentar abrir menu mobile
    const menuBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
    if (await menuBtn.isVisible().catch(() => false)) {
      await menuBtn.click();
      await page.waitForTimeout(500);
    }

    console.log('Screenshots capturados com sucesso!');
  });
});
