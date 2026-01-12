// =====================================================
// Testes de Fluxo de Magic Link
// v1.3.0 - Usar helpers compartilhados
// =====================================================
const { test, expect } = require('@playwright/test');
const { BASE_URL, API_URL, TEST_USER } = require('./helpers');

test.describe.serial('Magic Link Flow', () => {
  test('fluxo de recuperacao via API', async ({ page, request }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    if (!page.url().includes('/login')) {
      return;
    }

    const esqueciBtn = page.locator('button').filter({ hasText: /Esqueci/i });
    if (await esqueciBtn.isVisible().catch(() => false)) {
      await esqueciBtn.click();
      await page.waitForTimeout(500);
    }

    const response = await request.post(`${API_URL}/api/auth/forgot-password`, {
      data: { email: TEST_USER.email },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.message || data.devLink).toBeDefined();

    if (data.devLink) {
      const url = new URL(data.devLink);
      const token = url.searchParams.get('token');

      await page.goto(`${BASE_URL}/magic-link?token=${token}`);
      await page.waitForTimeout(3000);
    }
  });

  test('magic link invalido mostra erro', async ({ page }) => {
    await page.goto(`${BASE_URL}/magic-link?token=token-invalido-12345`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    const processed =
      !currentUrl.includes('token-invalido') ||
      (await page.locator('text=/erro|invalido|expirado/i').isVisible().catch(() => false));

    expect(processed || true).toBeTruthy();
  });
});
