const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

test.skip('fluxo completo magic link com email', async ({ page, request, context }) => {
  console.log('\n=== TESTE MAGIC LINK COM EMAIL ===\n');

  // 1. Solicitar magic link via API (simula envio de email)
  console.log('1. Solicitando magic link via API...');
  const response = await request.post(`${API_URL}/api/auth/forgot-password`, {
    data: { email: 'daniel.cambria@bureau-it.com' }
  });
  const data = await response.json();

  console.log('\n--- RESPOSTA DA API ---');
  console.log('Mensagem:', data.message);
  console.log('Magic Link:', data.devLink);
  console.log('Email Preview:', data.emailPreview);
  console.log('------------------------\n');

  // Verificar se temos os dados necessarios
  expect(data.devLink).toBeDefined();
  expect(data.emailPreview).toBeDefined();

  // 2. Abrir preview do email no Ethereal
  console.log('2. Abrindo preview do email no Ethereal...');
  const emailPage = await context.newPage();
  await emailPage.goto(data.emailPreview);
  await emailPage.waitForTimeout(2000);
  await emailPage.screenshot({ path: 'tests/screenshots/email-1-ethereal.png', fullPage: true });

  // Verificar conteudo do email
  const emailContent = await emailPage.content();
  expect(emailContent).toContain('Quatrelati');
  console.log('   Email recebido no Ethereal!');
  await emailPage.close();

  // 3. Usar o magic link para fazer login
  console.log('3. Usando magic link para fazer login...');
  const url = new URL(data.devLink);
  const token = url.searchParams.get('token');
  console.log('   Token:', token.substring(0, 20) + '...');

  await page.goto(`${BASE_URL}/magic-link?token=${token}`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/screenshots/email-2-validating.png' });

  // 4. Aguardar validacao e redirecionamento
  console.log('4. Aguardando validacao...');
  await page.waitForTimeout(3000);

  // 5. Verificar se foi redirecionado para o dashboard
  console.log('5. Verificando redirecionamento para dashboard...');
  await page.waitForURL('**/', { timeout: 10000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/screenshots/email-3-dashboard.png' });

  // 6. Verificar se esta logado
  console.log('6. Verificando se usuario esta logado...');
  const userName = await page.locator('text=Daniel Cambria').first();
  await expect(userName).toBeVisible({ timeout: 5000 });

  console.log('\n=== TESTE CONCLUIDO COM SUCESSO! ===');
  console.log('O email foi enviado para Ethereal e o magic link funcionou corretamente.');
  console.log('====================================\n');
});
