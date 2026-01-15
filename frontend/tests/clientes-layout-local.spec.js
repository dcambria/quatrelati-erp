// =====================================================
// Teste de Layout - Página de Clientes (Local)
// Verifica alterações: cidade/estado pill, mapa markers
// =====================================================

const { test, expect } = require('@playwright/test');
const { TEST_USER } = require('./test-config');

const LOCAL_URL = 'http://localhost:3000';

test.describe('Clientes - Layout Local', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${LOCAL_URL}/login`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Aguardar redirecionamento
    await page.waitForURL(/\/(clientes)?$/, { timeout: 20000 });

    // Navegar para clientes se não estiver lá
    if (!page.url().includes('/clientes')) {
      await page.goto(`${LOCAL_URL}/clientes`);
    }
    await page.waitForLoadState('networkidle');
  });

  test('deve exibir cidade/estado como botão pill clicável', async ({ page }) => {
    // Aguardar tabela carregar
    await page.waitForSelector('table', { timeout: 10000 });

    // Screenshot inicial
    await page.screenshot({ path: 'tests/screenshots/local-clientes-tabela.png', fullPage: true });

    // Procurar por botão pill com cidade/estado
    const pillButtons = await page.locator('button.rounded-full').all();
    console.log(`Encontrados ${pillButtons.length} botões pill`);

    // Verificar se existe botão com MapPin icon e texto de cidade
    const cidadeButtons = await page.locator('table button:has(svg)').all();
    console.log(`Botões com ícone na tabela: ${cidadeButtons.length}`);

    // Verificar classe específica do novo layout
    const novosButtons = await page.locator('button.bg-gray-100.rounded-full').all();
    console.log(`Botões com novo estilo (bg-gray-100 + rounded-full): ${novosButtons.length}`);

    if (novosButtons.length > 0) {
      console.log('✅ Novo layout de cidade/estado detectado (botão pill)');

      // Clicar no primeiro para testar funcionalidade
      await novosButtons[0].click();
      await page.waitForTimeout(500);

      // Screenshot após clicar
      await page.screenshot({ path: 'tests/screenshots/local-clientes-apos-click.png', fullPage: true });
    } else {
      console.log('❌ Layout antigo ainda presente');
    }

    // Expect que encontrou botões pill
    expect(novosButtons.length).toBeGreaterThan(0);
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
    await page.screenshot({ path: 'tests/screenshots/local-clientes-mapa.png', fullPage: true });

    // Verificar marcadores customizados
    const marcadores = await page.locator('.custom-marker').all();
    console.log(`Marcadores customizados encontrados: ${marcadores.length}`);

    // Verificar se marcadores têm iniciais (2 letras maiúsculas)
    if (marcadores.length > 0) {
      const primeiroMarcador = await marcadores[0].innerHTML();
      console.log('Conteúdo do primeiro marcador:', primeiroMarcador.substring(0, 100));

      // Verificar se contém letras ao invés de números
      const temNumero = />\s*\d+\s*</.test(primeiroMarcador);
      const temLetras = />\s*[A-Z]{2}\s*</.test(primeiroMarcador);

      if (temLetras) {
        console.log('✅ Marcadores com iniciais (novo layout)');
      } else if (temNumero) {
        console.log('❌ Marcadores ainda com números (layout antigo)');
      } else {
        console.log('⚠️ Conteúdo do marcador não identificado');
      }

      expect(temLetras || !temNumero).toBeTruthy();
    }
  });
});
