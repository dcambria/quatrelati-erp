// =====================================================
// Teste de Layout - Página de Clientes (Produção)
// Verifica alterações: cidade/estado pill, mapa markers
// =====================================================

const { test, expect } = require('@playwright/test');
const { TEST_USER } = require('./test-config');

const PROD_URL = 'https://erp.laticinioquatrelati.com.br';

test.describe('Clientes - Layout Produção', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${PROD_URL}/login`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Aguardar redirecionamento para dashboard ou clientes
    await page.waitForURL(/\/(clientes)?$/, { timeout: 20000 });

    // Navegar para clientes se não estiver lá
    if (!page.url().includes('/clientes')) {
      await page.goto(`${PROD_URL}/clientes`);
    }
    await page.waitForLoadState('networkidle');
  });

  test('deve exibir cidade/estado como botão pill clicável', async ({ page }) => {
    // Aguardar tabela carregar
    await page.waitForSelector('table', { timeout: 10000 });

    // Screenshot inicial
    await page.screenshot({ path: 'tests/screenshots/clientes-layout-inicial.png', fullPage: true });

    // Procurar por botão pill com cidade/estado (deve ter bg-gray-100 e rounded-full)
    const pillButtons = await page.locator('button.rounded-full').all();
    console.log(`Encontrados ${pillButtons.length} botões pill`);

    // Verificar se existe algum botão com MapPin e texto de cidade
    const cidadeButtons = await page.locator('button:has(svg):has-text("São Paulo")').all();
    console.log(`Botões com "São Paulo": ${cidadeButtons.length}`);

    // Verificar estrutura antiga (texto simples sem botão)
    const textoAntigo = await page.locator('p.text-xs.text-gray-500:has-text("São Paulo")').all();
    console.log(`Textos antigos (sem botão): ${textoAntigo.length}`);

    // Screenshot da área de clientes
    await page.screenshot({ path: 'tests/screenshots/clientes-layout-tabela.png' });

    // Verificar se o novo layout está presente
    if (cidadeButtons.length > 0) {
      console.log('✅ Novo layout de cidade/estado detectado (botão pill)');
    } else if (textoAntigo.length > 0) {
      console.log('❌ Layout antigo ainda presente (texto simples)');
    }

    // Capturar HTML de uma linha da tabela para análise
    const primeiraLinha = await page.locator('table tbody tr').first();
    const htmlLinha = await primeiraLinha.innerHTML();
    console.log('HTML da primeira linha:', htmlLinha.substring(0, 500));
  });

  test('deve exibir mapa com marcadores de iniciais', async ({ page }) => {
    // Ativar visualização do mapa
    const mapaButton = page.locator('button:has-text("Mapa")');
    if (await mapaButton.isVisible()) {
      await mapaButton.click();
      await page.waitForTimeout(2000);
    }

    // Aguardar mapa carregar
    await page.waitForSelector('.leaflet-container', { timeout: 15000 }).catch(() => {
      console.log('Mapa não encontrado ou não carregou');
    });

    // Screenshot do mapa
    await page.screenshot({ path: 'tests/screenshots/clientes-mapa-marcadores.png', fullPage: true });

    // Verificar marcadores customizados
    const marcadores = await page.locator('.custom-marker').all();
    console.log(`Marcadores customizados encontrados: ${marcadores.length}`);

    // Verificar se marcadores têm iniciais (não números)
    if (marcadores.length > 0) {
      const primeiroMarcador = await marcadores[0].innerHTML();
      console.log('Conteúdo do primeiro marcador:', primeiroMarcador);

      // Verificar se é número ou letras
      const temNumero = />\d+</.test(primeiroMarcador);
      const temLetras = />[A-Z]{2}</.test(primeiroMarcador);

      if (temLetras) {
        console.log('✅ Marcadores com iniciais (novo layout)');
      } else if (temNumero) {
        console.log('❌ Marcadores ainda com números (layout antigo)');
      }
    }
  });

  test('verificar versão do código em produção', async ({ page }) => {
    // Verificar se há algum indicador de versão no HTML/JS
    const pageContent = await page.content();

    // Procurar por classes específicas do novo layout
    const temRoundedFull = pageContent.includes('rounded-full');
    const temBgGray100 = pageContent.includes('bg-gray-100');

    console.log('Classes encontradas no HTML:');
    console.log('- rounded-full:', temRoundedFull);
    console.log('- bg-gray-100:', temBgGray100);

    // Verificar versão da API
    const apiResponse = await page.request.get(`${PROD_URL}/api/health`);
    const apiData = await apiResponse.json();
    console.log('API Health:', apiData);
  });
});
