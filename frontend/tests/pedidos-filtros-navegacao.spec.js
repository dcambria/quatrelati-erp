const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3002';

// Helper para fazer login
async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"]', 'daniel.cambria@bureau-it.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/', { timeout: 15000 });
  await page.waitForTimeout(1000);
}

// Helper para navegar para pedidos
async function navegarParaPedidos(page) {
  await page.click('a[href="/pedidos"]');
  await page.waitForURL('**/pedidos', { timeout: 10000 });
  await page.waitForTimeout(2000);
}

test.describe('Pedidos - Navegacao por Mes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navegarParaPedidos(page);
  });

  test('deve navegar para o mes anterior', async ({ page }) => {
    test.setTimeout(60000);

    // Capturar mes atual
    const mesAtualElement = page.locator('span').filter({ hasText: /\w+ \d{4}/ }).first();
    const mesAtualText = await mesAtualElement.textContent();
    console.log('Mes atual:', mesAtualText);

    // Clicar no botao de mes anterior
    const botaoAnterior = page.locator('button[aria-label="Mês anterior"]');
    await expect(botaoAnterior).toBeVisible();
    await botaoAnterior.click();
    await page.waitForTimeout(2000);

    // Verificar que o mes mudou
    const novoMesText = await mesAtualElement.textContent();
    console.log('Novo mes:', novoMesText);
    expect(novoMesText).not.toBe(mesAtualText);

    await page.screenshot({ path: 'tests/screenshots/navegacao-mes-anterior.png' });
  });

  test('deve navegar para o proximo mes', async ({ page }) => {
    test.setTimeout(60000);

    const mesAtualElement = page.locator('span').filter({ hasText: /\w+ \d{4}/ }).first();
    const mesAtualText = await mesAtualElement.textContent();
    console.log('Mes atual:', mesAtualText);

    const botaoProximo = page.locator('button[aria-label="Próximo mês"]');
    await expect(botaoProximo).toBeVisible();
    await botaoProximo.click();
    await page.waitForTimeout(2000);

    const novoMesText = await mesAtualElement.textContent();
    console.log('Novo mes:', novoMesText);
    expect(novoMesText).not.toBe(mesAtualText);

    await page.screenshot({ path: 'tests/screenshots/navegacao-mes-proximo.png' });
  });

  test('deve carregar pedidos ao navegar entre meses', async ({ page }) => {
    test.setTimeout(60000);

    // Verificar que a tabela esta carregada
    const tabela = page.locator('table');
    await expect(tabela).toBeVisible();

    // Navegar para mes anterior
    await page.locator('button[aria-label="Mês anterior"]').click();
    await page.waitForTimeout(2000);

    // Tabela deve continuar visivel (nao deve dar erro)
    await expect(tabela).toBeVisible();

    // Navegar para proximo mes
    await page.locator('button[aria-label="Próximo mês"]').click();
    await page.waitForTimeout(2000);

    await expect(tabela).toBeVisible();
  });
});

test.describe('Pedidos - Filtros', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navegarParaPedidos(page);
  });

  test('deve abrir painel de filtros', async ({ page }) => {
    test.setTimeout(60000);

    // Clicar no botao Filtros
    const botaoFiltros = page.locator('button').filter({ hasText: /Filtros/ });
    await botaoFiltros.click();
    await page.waitForTimeout(500);

    // Verificar que os filtros apareceram
    const selectStatus = page.locator('select').filter({ has: page.locator('option:has-text("Todos")') }).first();
    await expect(selectStatus).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/filtros-abertos.png' });
  });

  test('deve filtrar por status pendente', async ({ page }) => {
    test.setTimeout(60000);

    // Abrir filtros
    await page.locator('button').filter({ hasText: /Filtros/ }).click();
    await page.waitForTimeout(500);

    // Selecionar status pendente
    const selectStatus = page.locator('select').first();
    await selectStatus.selectOption('pendente');
    await page.waitForTimeout(2000);

    // Verificar que a pagina nao deu erro
    const tabela = page.locator('table');
    await expect(tabela).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/filtro-pendentes.png' });
  });

  test('deve filtrar por status entregue', async ({ page }) => {
    test.setTimeout(60000);

    await page.locator('button').filter({ hasText: /Filtros/ }).click();
    await page.waitForTimeout(500);

    const selectStatus = page.locator('select').first();
    await selectStatus.selectOption('entregue');
    await page.waitForTimeout(2000);

    const tabela = page.locator('table');
    await expect(tabela).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/filtro-entregues.png' });
  });

  test('deve mostrar filtro de vendedor para admin', async ({ page }) => {
    test.setTimeout(60000);

    // Abrir filtros
    await page.locator('button').filter({ hasText: /Filtros/ }).click();
    await page.waitForTimeout(500);

    // Verificar que existe o select de vendedor (admin deve ver)
    const labelVendedor = page.locator('label:has-text("Vendedor")');
    await expect(labelVendedor).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/filtro-vendedor-visivel.png' });
  });

  test('deve filtrar por vendedor', async ({ page }) => {
    test.setTimeout(60000);

    // Abrir filtros
    await page.locator('button').filter({ hasText: /Filtros/ }).click();
    await page.waitForTimeout(500);

    // Encontrar select de vendedor
    const selects = page.locator('select');
    const count = await selects.count();

    // O terceiro select deve ser o de vendedor (apos Status e Cliente)
    if (count >= 3) {
      const vendedorSelect = selects.nth(2);

      // Selecionar primeira opcao diferente de "Todos"
      const options = await vendedorSelect.locator('option').all();
      if (options.length > 1) {
        await vendedorSelect.selectOption({ index: 1 });
        await page.waitForTimeout(2000);

        // Verificar que a tabela ainda esta visivel
        const tabela = page.locator('table');
        await expect(tabela).toBeVisible();
      }
    }

    await page.screenshot({ path: 'tests/screenshots/filtro-vendedor-aplicado.png' });
  });
});

test.describe('Pedidos - Tabela e Scroll', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navegarParaPedidos(page);
  });

  test('tabela deve ter scroll horizontal em telas pequenas', async ({ page }) => {
    test.setTimeout(60000);

    // Redimensionar para tela pequena
    await page.setViewportSize({ width: 480, height: 800 });
    await page.waitForTimeout(1000);

    // Verificar que a tabela esta visivel
    const tabela = page.locator('table');
    await expect(tabela).toBeVisible();

    // Verificar que o container permite scroll
    const container = page.locator('.overflow-auto, .overflow-x-auto').first();
    await expect(container).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/tabela-mobile.png' });
  });

  test('tabela deve ter scroll vertical quando ha muitos pedidos', async ({ page }) => {
    test.setTimeout(60000);

    const container = page.locator('div').filter({ has: page.locator('table') }).first();
    await expect(container).toBeVisible();

    // Verificar que max-height esta aplicado
    const divWithMaxH = page.locator('[class*="max-h"]').filter({ has: page.locator('table') }).first();
    await expect(divWithMaxH).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/tabela-scroll-vertical.png' });
  });
});

test.describe('Pedidos - Layout Responsivo', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navegarParaPedidos(page);
  });

  test('header deve ser responsivo em mobile', async ({ page }) => {
    test.setTimeout(60000);

    // Tela mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    // Verificar que os botoes de navegacao ainda estao visiveis
    const botaoAnterior = page.locator('button[aria-label="Mês anterior"]');
    await expect(botaoAnterior).toBeVisible();

    const botaoProximo = page.locator('button[aria-label="Próximo mês"]');
    await expect(botaoProximo).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/header-mobile.png' });
  });

  test('filtros devem empilhar em mobile', async ({ page }) => {
    test.setTimeout(60000);

    // Tela mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    // Abrir filtros
    await page.locator('button').filter({ hasText: /Filtros/ }).click();
    await page.waitForTimeout(500);

    // Verificar que os filtros estao visiveis
    const selectStatus = page.locator('select').first();
    await expect(selectStatus).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/filtros-mobile.png' });
  });

  test('deve funcionar em tablet', async ({ page }) => {
    test.setTimeout(60000);

    // Tela tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);

    // Verificar que a pagina carregou corretamente
    const tabela = page.locator('table');
    await expect(tabela).toBeVisible();

    // Navegar pelo mes
    await page.locator('button[aria-label="Mês anterior"]').click();
    await page.waitForTimeout(2000);

    await expect(tabela).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/pedidos-tablet.png' });
  });
});
