// =====================================================
// Testes Responsivos
// v1.1.0 - Corrigir seletores de login
// =====================================================
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test('capturar screenshots responsivos', async ({ page }) => {
  test.setTimeout(60000);

  // Login
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"]', 'daniel.cambria@bureau-it.com');
  await page.fill('input[type="password"]', 'srxwdjedi');
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Desktop expandido
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screenshots/desktop-expanded.png' });

  // Clicar em recolher
  await page.click('button:has-text("Recolher")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screenshots/desktop-collapsed.png' });

  // Tablet
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screenshots/tablet.png' });

  // Mobile
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screenshots/mobile-closed.png' });

  // Abrir menu mobile
  await page.click('button:has(svg.lucide-menu)');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screenshots/mobile-open.png' });

  console.log('Screenshots capturados com sucesso!');
});
