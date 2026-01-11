const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3002';

test('capturar screenshots da tela de login', async ({ page }) => {
  // Navegar para login
  await page.goto(`${BASE_URL}/login`);
  await page.waitForTimeout(1500);

  // Desktop
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screenshots/login-desktop.png' });

  // Testar modo magic link
  await page.click('button:has-text("Magic Link")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screenshots/login-magic-link.png' });

  // Voltar ao login
  await page.click('button:has-text("Voltar ao login")');
  await page.waitForTimeout(500);

  // Mobile
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screenshots/login-mobile.png' });

  console.log('Screenshots da tela de login capturados!');
});
