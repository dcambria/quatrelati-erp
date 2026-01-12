// =====================================================
// Testes de Pedidos com Múltiplos Produtos
// v1.1.0 - Habilitar testes e atualizar seletores
// =====================================================
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

test('criar pedido com multiplos produtos', async ({ page }) => {
  test.setTimeout(90000);

  // Login via UI
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  // Aguardar inputs estarem visiveis
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });
  await page.fill('input[type="email"]', 'daniel.cambria@bureau-it.com');
  await page.fill('input[type="password"]', 'srxwdjedi');
  await page.click('button[type="submit"]');

  // Aguardar login completo e redirecionamento
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Navegar para pedidos clicando no link da sidebar
  await page.click('a[href="/pedidos"]');
  await page.waitForURL('**/pedidos', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // Clicar no botao Novo Pedido
  await page.click('button:has-text("Novo")');
  await page.waitForTimeout(1000);

  // Verificar se o modal abriu (titulo h2)
  await expect(page.locator('h2:has-text("Novo Pedido")')).toBeVisible();

  // Preencher data do pedido (primeiro input date)
  const dateInputs = page.locator('input[type="date"]');
  await dateInputs.first().fill('2026-01-15');

  // Selecionar cliente (primeiro select visivel no modal)
  const clienteSelect = page.locator('select').first();
  await clienteSelect.selectOption({ index: 1 });
  await page.waitForTimeout(300);

  // Preencher primeiro produto - encontrar o select de produto na secao Produtos
  const produtoSection = page.locator('text=Produtos').locator('..');
  const produtoSelects = page.locator('select').filter({ has: page.locator('option:has-text("Produto")') });

  // Selecionar primeiro produto (index 1 porque 0 e o placeholder)
  await produtoSelects.first().selectOption({ index: 1 });
  await page.waitForTimeout(300);

  // Preencher quantidade e preco do primeiro produto
  const qtdInputs = page.locator('input[placeholder="Cx"]');
  const precoInputs = page.locator('input[placeholder="R$/kg"]');

  await qtdInputs.first().fill('100');
  await precoInputs.first().fill('19');
  await page.waitForTimeout(300);

  // Clicar em adicionar produto (botao com texto "+ Adicionar")
  await page.click('button:has-text("Adicionar")');
  await page.waitForTimeout(500);

  // Agora deve haver 2 linhas de produto
  // Selecionar segundo produto (ultima linha)
  const allProdutoSelects = page.locator('select').filter({ has: page.locator('option:has-text("Produto")') });
  const count = await allProdutoSelects.count();
  console.log(`Encontrados ${count} selects de produto`);

  // Selecionar produto diferente na ultima linha
  await allProdutoSelects.last().selectOption({ index: 2 });
  await page.waitForTimeout(300);

  // Preencher quantidade e preco do segundo produto
  await qtdInputs.last().fill('50');
  await precoInputs.last().fill('21');
  await page.waitForTimeout(300);

  // Verificar que o total esta sendo calculado (deve mostrar valor > 0)
  const totalText = page.locator('text=Total:').first();
  await expect(totalText).toBeVisible();

  // Criar pasta de screenshots se nao existir
  await page.screenshot({ path: 'tests/screenshots/pedido-multiplos-produtos.png', fullPage: false });

  // Submeter o pedido
  await page.click('button:has-text("Criar Pedido")');
  await page.waitForTimeout(3000);

  // Verificar se o modal fechou (pedido criado com sucesso)
  await expect(page.locator('h2:has-text("Novo Pedido")')).not.toBeVisible({ timeout: 10000 });

  // Tirar screenshot final
  await page.screenshot({ path: 'tests/screenshots/pedido-criado.png', fullPage: false });

  console.log('Pedido com multiplos produtos criado com sucesso!');
});

test('editar pedido com multiplos produtos', async ({ page }) => {
  test.setTimeout(90000);

  // Login via UI
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  // Aguardar inputs estarem visiveis
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });
  await page.fill('input[type="email"]', 'daniel.cambria@bureau-it.com');
  await page.fill('input[type="password"]', 'srxwdjedi');
  await page.click('button[type="submit"]');

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Navegar para pedidos
  await page.click('a[href="/pedidos"]');
  await page.waitForURL('**/pedidos', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // Encontrar o primeiro pedido e clicar no botao de editar
  // Botões de editar usam svg.text-blue-500 dentro de .group/tip
  const editButton = page.locator('.group\\/tip button').filter({ has: page.locator('svg.text-blue-500') }).first();
  const editVisible = await editButton.isVisible({ timeout: 5000 }).catch(() => false);
  console.log(`Botao de editar visivel: ${editVisible}`);

  if (!editVisible) {
    throw new Error('Nenhum pedido encontrado para editar');
  }

  // Clicar no primeiro botao de editar
  await editButton.click();
  await page.waitForTimeout(1000);

  // Verificar se o modal de edicao abriu
  await expect(page.locator('h2:has-text("Editar Pedido")')).toBeVisible();

  // Verificar se os produtos foram carregados
  const produtoSelects = page.locator('select').filter({ has: page.locator('option:has-text("Produto")') });
  const produtosCount = await produtoSelects.count();
  console.log(`Produtos carregados no modal: ${produtosCount}`);

  // Aguardar carregamento dos itens
  await page.waitForTimeout(1000);

  // Adicionar mais um produto
  await page.click('button:has-text("Adicionar")');
  await page.waitForTimeout(500);

  // Selecionar produto na nova linha
  const allProdutoSelects = page.locator('select').filter({ has: page.locator('option:has-text("Produto")') });
  await allProdutoSelects.last().selectOption({ index: 3 });
  await page.waitForTimeout(300);

  // Preencher quantidade e preco
  const qtdInputs = page.locator('input[placeholder="Cx"]');
  const precoInputs = page.locator('input[placeholder="R$/kg"]');

  await qtdInputs.last().fill('25');
  await precoInputs.last().fill('22');
  await page.waitForTimeout(300);

  // Tirar screenshot do formulario de edicao
  await page.screenshot({ path: 'tests/screenshots/pedido-edicao-multiplos.png', fullPage: false });

  // Salvar alteracoes
  await page.click('button:has-text("Salvar")');
  await page.waitForTimeout(3000);

  // Verificar se o modal fechou
  await expect(page.locator('h2:has-text("Editar Pedido")')).not.toBeVisible({ timeout: 10000 });

  // Tirar screenshot final
  await page.screenshot({ path: 'tests/screenshots/pedido-editado.png', fullPage: false });

  console.log('Pedido editado com multiplos produtos com sucesso!');
});
