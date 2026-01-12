// =====================================================
// Teste E2E - Máscara CNPJ no formulário de Clientes
// =====================================================

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';

const TEST_USER = {
  email: 'daniel.cambria@bureau-it.com',
  password: 'srxwdjedi',
};

test.describe('Máscara CNPJ', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  });

  test('deve aplicar máscara ao digitar CNPJ', async ({ page }) => {
    // Ir para clientes
    await page.goto(`${BASE_URL}/clientes`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Clicar em Novo Cliente
    const btnNovo = page.locator('button').filter({ hasText: /Novo Cliente/i });
    await btnNovo.click();
    await page.waitForTimeout(500);

    // Screenshot do modal
    await page.screenshot({ path: 'tests/screenshots/cnpj-modal-aberto.png' });

    // Localizar campo CNPJ pelo label
    const cnpjInput = page.locator('input').filter({ has: page.locator('..').filter({ hasText: 'CNPJ' }) }).first();

    // Tentar localizar de outra forma se não encontrar
    const cnpjField = page.locator('input[placeholder="00.000.000/0000-00"]');

    // Digitar CNPJ sem formatação
    await cnpjField.fill('');
    await cnpjField.type('12345678000195', { delay: 50 });

    // Aguardar processamento
    await page.waitForTimeout(300);

    // Screenshot após digitar
    await page.screenshot({ path: 'tests/screenshots/cnpj-apos-digitar.png' });

    // Verificar valor com máscara
    const valorFormatado = await cnpjField.inputValue();
    console.log('Valor digitado formatado:', valorFormatado);

    // Deve estar formatado como XX.XXX.XXX/XXXX-XX
    expect(valorFormatado).toBe('12.345.678/0001-95');
  });

  test('deve validar CNPJ inválido', async ({ page }) => {
    await page.goto(`${BASE_URL}/clientes`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Clicar em Novo Cliente
    const btnNovo = page.locator('button').filter({ hasText: /Novo Cliente/i });
    await btnNovo.click();
    await page.waitForTimeout(500);

    // Preencher nome obrigatório
    const nomeInput = page.locator('input[placeholder="Nome curto / fantasia"]');
    await nomeInput.fill('Teste CNPJ');

    // Digitar CNPJ inválido (todos zeros)
    const cnpjField = page.locator('input[placeholder="00.000.000/0000-00"]');
    await cnpjField.type('00000000000000', { delay: 50 });

    await page.waitForTimeout(300);

    // Tentar submeter
    const btnSalvar = page.locator('button[type="submit"]').filter({ hasText: /Criar Cliente/i });
    await btnSalvar.click();

    await page.waitForTimeout(500);

    // Screenshot do erro
    await page.screenshot({ path: 'tests/screenshots/cnpj-invalido-erro.png' });

    // Verificar mensagem de erro
    const erroMsg = page.locator('text=CNPJ inválido');
    const temErro = await erroMsg.isVisible().catch(() => false);
    console.log('Mensagem de erro visível:', temErro);

    expect(temErro).toBeTruthy();
  });

  test('deve aceitar CNPJ válido', async ({ page }) => {
    await page.goto(`${BASE_URL}/clientes`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Clicar em Novo Cliente
    const btnNovo = page.locator('button').filter({ hasText: /Novo Cliente/i });
    await btnNovo.click();
    await page.waitForTimeout(500);

    // Preencher nome
    const nomeInput = page.locator('input[placeholder="Nome curto / fantasia"]');
    await nomeInput.fill('Teste CNPJ Válido');

    // Digitar CNPJ válido (CNPJ de teste)
    const cnpjField = page.locator('input[placeholder="00.000.000/0000-00"]');
    // CNPJ válido: 11.222.333/0001-81
    await cnpjField.type('11222333000181', { delay: 50 });

    await page.waitForTimeout(300);

    const valorFormatado = await cnpjField.inputValue();
    console.log('CNPJ válido formatado:', valorFormatado);

    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/cnpj-valido.png' });

    expect(valorFormatado).toBe('11.222.333/0001-81');
  });
});
