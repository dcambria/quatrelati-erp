// =====================================================
// Teste Completo de Magic Link com Email (Ethereal)
// v1.1.0 - Habilitar teste com verificação de email
// =====================================================
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

test('fluxo completo magic link com email', async ({ page, request, context }) => {
  test.setTimeout(60000);
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

  // Se não tiver emailPreview (ambiente sem Ethereal), pular parte do email
  const hasEmailPreview = !!data.emailPreview;

  // 2. Abrir preview do email no Ethereal (se disponível)
  if (hasEmailPreview) {
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
  } else {
    console.log('2. Email preview não disponível (ambiente sem Ethereal) - pulando verificação de email');
  }

  // 3. Usar o magic link para fazer login
  console.log('3. Usando magic link para fazer login...');
  const url = new URL(data.devLink);
  const token = url.searchParams.get('token');
  console.log('   Token:', token.substring(0, 20) + '...');

  // Usar BASE_URL ao inves do URL do devLink (que pode ter porta errada)
  await page.goto(`${BASE_URL}/magic-link?token=${token}`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/screenshots/email-2-validating.png' });

  // 4. Aguardar validacao e redirecionamento
  console.log('4. Aguardando validacao...');
  await page.waitForTimeout(3000);

  // 5. Verificar se saiu da pagina de magic-link
  console.log('5. Verificando resultado do magic link...');
  const currentUrl = page.url();
  const isProcessed = !currentUrl.includes('magic-link');
  expect(isProcessed).toBeTruthy();

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/screenshots/email-3-result.png' });

  console.log('\n=== TESTE CONCLUIDO COM SUCESSO! ===');
  console.log('Magic link processado corretamente.');
  console.log('====================================\n');
});
