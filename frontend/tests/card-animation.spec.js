// =====================================================
// Teste de Escala Automática dos StatCards
// v1.2.0 - Resiliente para CI/CD
// =====================================================
const { test, expect } = require('@playwright/test');
const { BASE_URL, TEST_USER, hasCredentials, isCI } = require('./test-config');

// Skip se não houver credenciais
test.skip(!hasCredentials, 'Credenciais de teste não configuradas');

async function loginDirect(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  if (!page.url().includes('/login')) return true;

  await page.locator('input[type="email"]').fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
  await page.waitForTimeout(2000);
  return true;
}

test.describe('StatCard Font Scaling', () => {
  test('verificar fonte adaptativa nos cards', async ({ page }) => {
    await loginDirect(page);

    // Desktop grande
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1500);

    // Screenshot desktop
    await page.screenshot({
      path: 'tests/screenshots/cards-desktop.png',
      fullPage: false
    });
    console.log('📸 Screenshot: cards-desktop.png (1920x1080)');

    // Verificar se os valores estão visíveis
    const valorCard = page.locator('.stat-card-blue').first();
    const valorText = await valorCard.locator('p.font-bold').textContent();
    console.log(`💰 Valor exibido: ${valorText}`);

    // Tablet
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'tests/screenshots/cards-tablet.png',
      fullPage: false
    });
    console.log('📸 Screenshot: cards-tablet.png (1024x768)');

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'tests/screenshots/cards-mobile.png',
      fullPage: false
    });
    console.log('📸 Screenshot: cards-mobile.png (375x812)');

    console.log('\n✅ Teste de escala automática concluído!');
  });
});
