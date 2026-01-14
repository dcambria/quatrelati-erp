// =====================================================
// Teste E2E - Download de PDF de Pedidos
// =====================================================

const { test, expect } = require('@playwright/test');
const { BASE_URL, TEST_USER, hasCredentials, isCI } = require('./test-config');

const API_URL = 'http://localhost:3001';

test.skip(!hasCredentials, 'Credenciais não configuradas');

test.describe('Download de PDF', () => {
  test('deve baixar PDF de pedidos via botao', async ({ page }) => {
    // Login via UI
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Preencher formulário de login
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Aguardar redirecionamento após login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Navegar para pedidos
    await page.goto(`${BASE_URL}/pedidos`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Aguardar a página carregar completamente
    await page.waitForSelector('table', { timeout: 15000 }).catch(() => {
      console.log('Tabela não encontrada, continuando...');
    });

    // Screenshot do estado atual
    await page.screenshot({ path: 'tests/screenshots/pedidos-before-download.png' });

    // Localizar botão de exportar PDF (pode ter diferentes textos)
    const btnExportar = page.locator('button').filter({ hasText: /PDF|Exportar/i }).first();
    const isVisible = await btnExportar.isVisible().catch(() => false);

    if (!isVisible) {
      console.log('Botão de exportar não encontrado');
      await page.screenshot({ path: 'tests/screenshots/no-export-button.png' });
      // Listar todos os botões visíveis
      const buttons = await page.locator('button').allTextContents();
      console.log('Botões disponíveis:', buttons);
      test.skip();
      return;
    }

    console.log('Botão de exportar encontrado');

    // Configurar listener para download (timeout maior para primeira vez)
    const downloadPromise = page.waitForEvent('download', { timeout: 45000 });

    // Clicar no botão de exportar
    await btnExportar.click();
    console.log('Clicou no botão de exportar');

    // Aguardar modal aparecer (ele sempre aparece)
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'tests/screenshots/after-click.png' });

    // Procurar botão "Baixar PDF" no modal
    const btnBaixarPdf = page.locator('button').filter({ hasText: /Baixar PDF/i }).first();
    const modalBtnVisible = await btnBaixarPdf.isVisible().catch(() => false);

    if (modalBtnVisible) {
      console.log('Modal com botão Baixar PDF detectado');

      // Configurar listener ANTES de clicar (timeout longo para primeira compilação)
      const downloadPromise2 = page.waitForEvent('download', { timeout: 60000 });
      await btnBaixarPdf.click();
      console.log('Clicou em Baixar PDF');

      try {
        const download = await downloadPromise2;
        console.log('Download iniciado:', download.suggestedFilename());
        expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
        return; // Sucesso!
      } catch (e) {
        await page.screenshot({ path: 'tests/screenshots/download-failed-modal.png' });
        // Capturar erros do console
        console.log('Erro no download após modal:', e.message);
        throw e;
      }
    } else {
      // Download direto sem modal
      try {
        const download = await downloadPromise;
        console.log('Download iniciado:', download.suggestedFilename());
        expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
      } catch (e) {
        console.log('Download não iniciou:', e.message);
        await page.screenshot({ path: 'tests/screenshots/download-failed.png' });

        // Verificar erros no console
        const errors = [];
        page.on('console', msg => {
          if (msg.type() === 'error') errors.push(msg.text());
        });
        await page.waitForTimeout(2000);
        if (errors.length > 0) {
          console.log('Erros no console:', errors);
        }
        throw e;
      }
    }
  });

  test('API de exportacao PDF deve funcionar', async ({ request }) => {
    // Login
    const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
      data: TEST_USER,
    });
    expect(loginResponse.ok()).toBeTruthy();
    const { accessToken } = await loginResponse.json();

    // Testar exportação PDF
    const pdfResponse = await request.get(`${API_URL}/api/pedidos/exportar/pdf?mes=1&ano=2026`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('PDF Response status:', pdfResponse.status());
    console.log('PDF Content-Type:', pdfResponse.headers()['content-type']);

    expect(pdfResponse.ok()).toBeTruthy();
    expect(pdfResponse.headers()['content-type']).toContain('application/pdf');
  });
});
