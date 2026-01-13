// =====================================================
// Análise Visual do Sidebar
// v1.0.1 - Usar porta 3002
// =====================================================
const { test, expect } = require('@playwright/test');
const { BASE_URL, TEST_USER, validateCredentials } = require('./test-config');

validateCredentials();

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

test.describe('Sidebar Analysis', () => {
  test('analisar botão flutuante de recolher', async ({ page }) => {
    await loginDirect(page);

    // Desktop grande
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1500);

    // Screenshot do sidebar expandido
    await page.screenshot({
      path: 'tests/screenshots/sidebar-novo-expandido.png',
      fullPage: false
    });
    console.log('📸 Screenshot: sidebar-novo-expandido.png');

    // Localizar botão flutuante
    const toggleBtn = page.locator('aside button[title="Recolher menu"]');
    if (await toggleBtn.isVisible()) {
      console.log('✅ Botão flutuante encontrado');

      // Highlight do botão
      await toggleBtn.evaluate(el => {
        el.style.outline = '3px solid #22c55e';
        el.style.outlineOffset = '3px';
      });

      await page.screenshot({
        path: 'tests/screenshots/sidebar-novo-botao-highlight.png',
        fullPage: false
      });
      console.log('📸 Screenshot: sidebar-novo-botao-highlight.png');

      // Clicar para recolher
      await toggleBtn.click();
      await page.waitForTimeout(500);

      // Screenshot do sidebar recolhido
      await page.screenshot({
        path: 'tests/screenshots/sidebar-novo-recolhido.png',
        fullPage: false
      });
      console.log('📸 Screenshot: sidebar-novo-recolhido.png');

      // Verificar se botão mudou para expandir
      const expandBtn = page.locator('aside button[title="Expandir menu"]');
      if (await expandBtn.isVisible()) {
        console.log('✅ Botão de expandir na mesma posição');

        await expandBtn.evaluate(el => {
          el.style.outline = '3px solid #3b82f6';
          el.style.outlineOffset = '3px';
        });

        await page.screenshot({
          path: 'tests/screenshots/sidebar-novo-expandir-highlight.png',
          fullPage: false
        });
        console.log('📸 Screenshot: sidebar-novo-expandir-highlight.png');

        // Clicar para expandir novamente
        await expandBtn.click();
        await page.waitForTimeout(500);

        await page.screenshot({
          path: 'tests/screenshots/sidebar-novo-final.png',
          fullPage: false
        });
        console.log('📸 Screenshot: sidebar-novo-final.png');
      }
    } else {
      console.log('❌ Botão flutuante não encontrado');
    }

    console.log('\n✅ Análise concluída!');
  });
});
