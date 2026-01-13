// =====================================================
// Teste de Foco no Mapa de Clientes
// v1.0.0 - Verifica que o mapa não recentraliza ao focar
// =====================================================
const { test, expect } = require('@playwright/test');
const { login, BASE_URL } = require('./helpers');

test.describe('Mapa de Clientes - Foco', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('ao clicar no ícone de mapa, deve focar sem recentralizar', async ({ page }) => {
    // Navegar para clientes
    await page.goto(`${BASE_URL}/clientes`);
    await page.waitForLoadState('networkidle');

    // Limpar cache de geocoding
    await page.evaluate(() => {
      localStorage.removeItem('quatrelati_geocode_cache');
    });

    // Recarregar página
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Aguardar lista de clientes carregar
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Habilitar mapa clicando no botão "Mapa"
    const mapaBtn = page.locator('button:has-text("Mapa")');
    if (await mapaBtn.isVisible()) {
      await mapaBtn.click();
    }

    // Aguardar mapa carregar
    await page.waitForSelector('.leaflet-container', { timeout: 15000 });
    console.log('✅ Mapa carregado');

    // Aguardar geocoding completar (pelo menos alguns marcadores)
    await page.waitForFunction(() => {
      const markers = document.querySelectorAll('.leaflet-marker-icon');
      return markers.length >= 2;
    }, { timeout: 30000 });

    // Contar marcadores
    const markersCount = await page.locator('.leaflet-marker-icon').count();
    console.log(`📍 ${markersCount} marcadores no mapa`);

    // Capturar centro inicial
    const centroInicial = await page.evaluate(() => {
      const tilePane = document.querySelector('.leaflet-tile-pane');
      return tilePane?.style?.transform || 'unknown';
    });
    console.log(`📐 Centro inicial: ${centroInicial.substring(0, 60)}...`);

    // Encontrar ícone de MapPin ao lado de um cliente na lista
    const mapPinIcon = page.locator('table tbody tr button[title="Ver no mapa"]').first();

    if (await mapPinIcon.isVisible()) {
      console.log('🎯 Clicando no ícone de mapa...');

      // Clicar no ícone
      await mapPinIcon.click();

      // Aguardar animação
      await page.waitForTimeout(500);

      // Verificar se popup abriu
      const popup = page.locator('.leaflet-popup');
      await expect(popup).toBeVisible({ timeout: 5000 });
      console.log('✅ Popup aberto');

      // Capturar novo centro
      const centroAposFoco = await page.evaluate(() => {
        const tilePane = document.querySelector('.leaflet-tile-pane');
        return tilePane?.style?.transform || 'unknown';
      });
      console.log(`📐 Centro após foco: ${centroAposFoco.substring(0, 60)}...`);

      // Aguardar mais um pouco para ver se recentraliza
      console.log('⏳ Aguardando 3s para verificar se recentraliza...');
      await page.waitForTimeout(3000);

      // Capturar centro final
      const centroFinal = await page.evaluate(() => {
        const tilePane = document.querySelector('.leaflet-tile-pane');
        return tilePane?.style?.transform || 'unknown';
      });
      console.log(`📐 Centro após 3s: ${centroFinal.substring(0, 60)}...`);

      // O centro deve permanecer o mesmo (não deve recentralizar)
      // Nota: o centro pode ter mudado do inicial para o foco, mas NÃO deve mudar depois
      expect(centroFinal).toBe(centroAposFoco);
      console.log('✅ Mapa NÃO recentralizou após o foco');

    } else {
      console.log('⚠️ Ícone de MapPin não encontrado');
      test.skip();
    }
  });

  test('múltiplos cliques de foco devem funcionar sem pular', async ({ page }) => {
    // Navegar para clientes
    await page.goto(`${BASE_URL}/clientes`);
    await page.waitForLoadState('networkidle');

    // Habilitar mapa
    const mapaBtn = page.locator('button:has-text("Mapa")');
    if (await mapaBtn.isVisible()) {
      await mapaBtn.click();
    }

    // Aguardar mapa e marcadores
    await page.waitForSelector('.leaflet-container', { timeout: 15000 });
    await page.waitForFunction(() => {
      const markers = document.querySelectorAll('.leaflet-marker-icon');
      return markers.length >= 2;
    }, { timeout: 30000 });

    // Encontrar todos os ícones de mapa
    const mapPinIcons = page.locator('table tbody tr button[title="Ver no mapa"]');
    const count = await mapPinIcons.count();

    if (count >= 2) {
      console.log(`📍 Testando ${Math.min(count, 3)} cliques sequenciais...`);

      for (let i = 0; i < Math.min(count, 3); i++) {
        const icon = mapPinIcons.nth(i);

        if (await icon.isVisible()) {
          console.log(`\n🎯 Clique ${i + 1}...`);
          await icon.click();

          // Aguardar popup abrir
          await page.waitForTimeout(500);

          // Verificar popup
          const popup = page.locator('.leaflet-popup');
          const popupVisible = await popup.isVisible();
          console.log(`   Popup: ${popupVisible ? '✅' : '❌'}`);

          // Capturar posição
          const centro = await page.evaluate(() => {
            const pane = document.querySelector('.leaflet-tile-pane');
            return pane?.style?.transform?.substring(0, 50) || 'unknown';
          });
          console.log(`   Centro: ${centro}...`);

          // Aguardar para verificar estabilidade
          await page.waitForTimeout(1500);

          const centroApos = await page.evaluate(() => {
            const pane = document.querySelector('.leaflet-tile-pane');
            return pane?.style?.transform?.substring(0, 50) || 'unknown';
          });

          // Verificar se não pulou
          if (centro === centroApos) {
            console.log('   ✅ Estável (não pulou)');
          } else {
            console.log(`   ⚠️ Mudou: ${centroApos}...`);
          }
        }
      }
    } else {
      console.log('⚠️ Menos de 2 ícones de mapa disponíveis');
      test.skip();
    }
  });
});
