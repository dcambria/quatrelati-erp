const { test } = require('@playwright/test');

test('screenshot maintenance produção', async ({ page }) => {
  await page.goto('https://erp.laticinioquatrelati.com.br/maintenance.html');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/screenshots/maintenance-prod.png', fullPage: true });
  console.log('Screenshot salvo');
});
