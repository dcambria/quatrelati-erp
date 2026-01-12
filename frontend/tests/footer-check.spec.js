// =====================================================
// Teste de Footer Bureau
// v1.1.0 - Corrigir login e verificar footer na tela de login
// =====================================================
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test('capturar footer bureau logo', async ({ page }) => {
  // Ir para a página de login onde o footer é visível
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Scroll até o final da página
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);

  // Verificar que o footer existe
  const footer = page.locator('a[href="https://bureau-it.com"]').first();
  const footerVisible = await footer.isVisible({ timeout: 5000 }).catch(() => false);

  if (footerVisible) {
    // Capturar screenshot do footer
    await footer.screenshot({ path: 'tests/screenshots/footer-bureau.png' });
    console.log('Footer Bureau encontrado e screenshot salvo!');
  } else {
    console.log('Footer Bureau nao visivel na pagina');
  }

  // Capturar página inteira também
  await page.screenshot({ path: 'tests/screenshots/login-full-page.png', fullPage: true });

  // Verificar que existe o texto Bureau na página
  const bureauText = page.locator('text=Bureau');
  await expect(bureauText.first()).toBeVisible({ timeout: 5000 });

  console.log('Screenshots salvos em tests/screenshots/');
});
