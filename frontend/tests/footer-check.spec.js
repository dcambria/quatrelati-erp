const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

test('capturar footer bureau logo', async ({ page }) => {
  // Login via API primeiro
  const loginResponse = await page.request.post(`${API_URL}/api/auth/login`, {
    data: {
      email: 'daniel.cambria@bureau-it.com',
      senha: 'srxwdjedi'
    }
  });

  const loginData = await loginResponse.json();

  // Ir para a página e salvar token
  await page.goto(`${BASE_URL}/login`);
  await page.evaluate((token) => {
    localStorage.setItem('token', token);
  }, loginData.token);

  // Ir para pedidos
  await page.goto(`${BASE_URL}/pedidos`);
  await page.waitForTimeout(3000);

  // Scroll até o final da página
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);

  // Capturar screenshot do footer
  const footer = page.locator('a[href="https://bureau-it.com"]');
  await footer.screenshot({ path: 'tests/screenshots/footer-bureau.png' });

  // Capturar página inteira também
  await page.screenshot({ path: 'tests/screenshots/full-page.png', fullPage: true });

  console.log('Screenshots salvos em tests/screenshots/');
});
