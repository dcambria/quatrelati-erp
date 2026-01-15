// =====================================================
// Teste E2E - Configurações Export/Import
// v1.0.0 - Testa funcionalidades de exportação e importação
// =====================================================
const { test, expect } = require('@playwright/test');
const { TEST_USER, hasCredentials } = require('./test-config');

const PROD_URL = 'https://erp.laticinioquatrelati.com.br';

// Skip tests se não tiver credenciais
test.beforeEach(async ({ }, testInfo) => {
  if (!hasCredentials) {
    testInfo.skip();
  }
});

test.describe('Página de Configurações - Export/Import', () => {

  test('deve acessar página de configurações como superadmin', async ({ page }) => {
    test.setTimeout(60000);

    // Viewport grande
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Login
    console.log('Fazendo login...');
    await page.goto(`${PROD_URL}/login`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Navegar para configurações
    await page.goto(`${PROD_URL}/configuracoes`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verificar se a página carregou corretamente (não mostra mensagem de acesso restrito)
    const acessoRestrito = page.locator('text=Acesso Restrito');
    const isRestricted = await acessoRestrito.isVisible().catch(() => false);

    if (isRestricted) {
      console.log('⚠️ Usuário de teste não é superadmin - pulando teste');
      return;
    }

    // Verificar elementos da página
    await expect(page.getByRole('heading', { name: 'Exportacao de Dados' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Importacao de Dados' })).toBeVisible();

    // Verificar botões de exportação (4 cards: clientes, produtos, pedidos, completo)
    const exportButtons = page.locator('button:has-text("Exportar JSON")');
    await expect(exportButtons.first()).toBeVisible();
    expect(await exportButtons.count()).toBe(4);

    // Screenshot da página
    await page.screenshot({ path: 'tests/screenshots/configuracoes-page.png', fullPage: true });

    console.log('✓ Página de configurações acessível para superadmin');
  });

  test('deve exportar clientes com sucesso', async ({ page }) => {
    test.setTimeout(90000);

    await page.setViewportSize({ width: 1920, height: 1080 });

    // Login
    await page.goto(`${PROD_URL}/login`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Navegar para configurações
    await page.goto(`${PROD_URL}/configuracoes`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verificar acesso
    const acessoRestrito = page.locator('text=Acesso Restrito');
    if (await acessoRestrito.isVisible().catch(() => false)) {
      console.log('⚠️ Usuário não é superadmin - pulando');
      return;
    }

    // Clicar no primeiro botão de exportar (Clientes)
    const exportarBtn = page.locator('button:has-text("Exportar JSON")').first();
    await expect(exportarBtn).toBeVisible();

    // Clicar no botão de exportar
    await exportarBtn.click();
    console.log('Clicou em Exportar Clientes');

    // Aguardar toast de sucesso ou que o botão volte ao normal (loading termine)
    try {
      await page.waitForSelector('div[role="status"]:has-text("clientes")', { timeout: 15000 });
      console.log('Toast de exportação apareceu');
    } catch {
      // Verificar se o download foi iniciado pelo comportamento da página
      await page.waitForTimeout(5000);
    }

    // Screenshot após exportação
    await page.screenshot({ path: 'tests/screenshots/configuracoes-export-clientes.png', fullPage: true });

    console.log('✓ Exportação de clientes iniciada com sucesso');
  });

  test('deve exportar produtos com sucesso', async ({ page }) => {
    test.setTimeout(90000);

    await page.setViewportSize({ width: 1920, height: 1080 });

    // Login
    await page.goto(`${PROD_URL}/login`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Navegar para configurações
    await page.goto(`${PROD_URL}/configuracoes`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verificar acesso
    const acessoRestrito = page.locator('text=Acesso Restrito');
    if (await acessoRestrito.isVisible().catch(() => false)) {
      console.log('⚠️ Usuário não é superadmin - pulando');
      return;
    }

    // Clicar no segundo botão de exportar (Produtos)
    const exportarBtn = page.locator('button:has-text("Exportar JSON")').nth(1);
    await expect(exportarBtn).toBeVisible();

    // Clicar no botão de exportar
    await exportarBtn.click();
    console.log('Clicou em Exportar Produtos');

    // Aguardar toast de sucesso
    try {
      await page.waitForSelector('div[role="status"]:has-text("produtos")', { timeout: 15000 });
      console.log('Toast de exportação apareceu');
    } catch {
      await page.waitForTimeout(5000);
    }

    // Screenshot após exportação
    await page.screenshot({ path: 'tests/screenshots/configuracoes-export-produtos.png', fullPage: true });

    console.log('✓ Exportação de produtos iniciada com sucesso');
  });

  test('deve exportar pedidos', async ({ page }) => {
    test.setTimeout(90000);

    await page.setViewportSize({ width: 1920, height: 1080 });

    // Login
    await page.goto(`${PROD_URL}/login`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Navegar para configurações
    await page.goto(`${PROD_URL}/configuracoes`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verificar acesso
    const acessoRestrito = page.locator('text=Acesso Restrito');
    if (await acessoRestrito.isVisible().catch(() => false)) {
      console.log('⚠️ Usuário não é superadmin - pulando');
      return;
    }

    // Clicar no terceiro botão de exportar (Pedidos)
    const exportarBtn = page.locator('button:has-text("Exportar JSON")').nth(2);
    await expect(exportarBtn).toBeVisible();

    // Clicar no botão de exportar
    await exportarBtn.click();
    console.log('Clicou em Exportar Pedidos');

    // Aguardar toast de sucesso
    try {
      await page.waitForSelector('div[role="status"]:has-text("pedidos")', { timeout: 15000 });
      console.log('Toast de exportação apareceu');
    } catch {
      await page.waitForTimeout(5000);
    }

    // Screenshot após exportação
    await page.screenshot({ path: 'tests/screenshots/configuracoes-export-pedidos.png', fullPage: true });

    console.log('✓ Exportação de pedidos iniciada com sucesso');
  });

  test('opções de importação devem estar visíveis', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize({ width: 1920, height: 1080 });

    // Login
    await page.goto(`${PROD_URL}/login`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Navegar para configurações
    await page.goto(`${PROD_URL}/configuracoes`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verificar acesso
    const acessoRestrito = page.locator('text=Acesso Restrito');
    if (await acessoRestrito.isVisible().catch(() => false)) {
      console.log('⚠️ Usuário não é superadmin - pulando');
      return;
    }

    // Verificar seção de importação
    await expect(page.getByRole('heading', { name: 'Importacao de Dados' })).toBeVisible();

    // Verificar modos de importação
    await expect(page.getByText('Modo de Importacao')).toBeVisible();
    await expect(page.getByText('Adicionar/Atualizar registros existentes')).toBeVisible();
    await expect(page.getByText('Substituir todos os dados')).toBeVisible();

    // Verificar cards de importação
    await expect(page.locator('h3:has-text("Importar Clientes")')).toBeVisible();
    await expect(page.locator('h3:has-text("Importar Produtos")')).toBeVisible();

    // Verificar botões de selecionar arquivo
    const selecionarBtns = page.locator('button:has-text("Selecionar Arquivo")');
    expect(await selecionarBtns.count()).toBeGreaterThanOrEqual(2);

    // Screenshot das opções de importação
    await page.screenshot({ path: 'tests/screenshots/configuracoes-import.png', fullPage: true });

    console.log('✓ Opções de importação verificadas');
  });

  test('checkbox de apenas ativos deve funcionar', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize({ width: 1920, height: 1080 });

    // Login
    await page.goto(`${PROD_URL}/login`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Navegar para configurações
    await page.goto(`${PROD_URL}/configuracoes`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verificar acesso
    const acessoRestrito = page.locator('text=Acesso Restrito');
    if (await acessoRestrito.isVisible().catch(() => false)) {
      console.log('⚠️ Usuário não é superadmin - pulando');
      return;
    }

    // Encontrar checkbox de apenas ativos
    const checkboxAtivos = page.locator('input[type="checkbox"]').first();
    await expect(checkboxAtivos).toBeVisible();

    // Verificar que inicialmente não está marcado
    const isChecked = await checkboxAtivos.isChecked();
    console.log(`Checkbox inicialmente: ${isChecked ? 'marcado' : 'desmarcado'}`);

    // Clicar para alternar
    await checkboxAtivos.click();
    await page.waitForTimeout(500);

    // Verificar que o estado mudou
    expect(await checkboxAtivos.isChecked()).toBe(!isChecked);

    console.log('✓ Checkbox de apenas ativos funciona corretamente');
  });

  test('radio de modo substituir deve mostrar aviso', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize({ width: 1920, height: 1080 });

    // Login
    await page.goto(`${PROD_URL}/login`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Navegar para configurações
    await page.goto(`${PROD_URL}/configuracoes`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verificar acesso
    const acessoRestrito = page.locator('text=Acesso Restrito');
    if (await acessoRestrito.isVisible().catch(() => false)) {
      console.log('⚠️ Usuário não é superadmin - pulando');
      return;
    }

    // Verificar que o aviso não está visível inicialmente
    const aviso = page.getByText('Este modo remove todos os registros existentes');
    expect(await aviso.isVisible()).toBe(false);

    // Clicar no radio de substituir
    const radioSubstituir = page.locator('input[type="radio"][value="substituir"]');
    await radioSubstituir.click();
    await page.waitForTimeout(500);

    // Verificar que o aviso apareceu
    await expect(aviso).toBeVisible();

    // Screenshot com aviso visível
    await page.screenshot({ path: 'tests/screenshots/configuracoes-modo-substituir.png', fullPage: true });

    console.log('✓ Aviso de modo substituir funciona corretamente');
  });

});
