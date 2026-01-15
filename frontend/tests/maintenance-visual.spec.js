const { test } = require('@playwright/test');

test('screenshot página manutenção', async ({ page }) => {
  await page.goto('file:///Users/dcambria/scripts/quatrelati/frontend/public/maintenance.html');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screenshots/maintenance-page.png', fullPage: true });

  // Hover no logo
  await page.hover('.bureau-logo');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/screenshots/maintenance-page-hover.png', fullPage: true });

  console.log('Screenshots salvos');
});
