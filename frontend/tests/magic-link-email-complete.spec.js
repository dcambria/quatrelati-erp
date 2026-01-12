// =====================================================
// Teste Completo de Magic Link com Email
// v1.3.0 - Usar helpers compartilhados
// =====================================================
const { test, expect } = require('@playwright/test');
const { BASE_URL, API_URL, TEST_USER } = require('./helpers');

test.describe.serial('Magic Link Email', () => {
  test('fluxo completo magic link via API', async ({ page, request }) => {
    console.log('\n=== TESTE MAGIC LINK COM EMAIL ===\n');

    console.log('1. Solicitando magic link via API...');
    const response = await request.post(`${API_URL}/api/auth/forgot-password`, {
      data: { email: TEST_USER.email },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    console.log('Resposta:', data.message);
    console.log('DevLink:', data.devLink ? 'presente' : 'ausente');

    expect(data.message || data.devLink).toBeDefined();

    if (data.devLink) {
      console.log('2. Usando magic link para fazer login...');
      const url = new URL(data.devLink);
      const token = url.searchParams.get('token');
      console.log('   Token:', token.substring(0, 20) + '...');

      await page.goto(`${BASE_URL}/magic-link?token=${token}`);
      await page.waitForTimeout(3000);

      console.log('3. Verificando resultado...');
      const currentUrl = page.url();
      console.log('   URL final:', currentUrl);
    }

    console.log('\n=== TESTE CONCLUIDO ===\n');
  });
});
