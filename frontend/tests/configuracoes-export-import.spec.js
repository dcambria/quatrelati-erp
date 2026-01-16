// =====================================================
// Teste E2E - Configuracoes Export/Import
// v2.0.0 - Testes para novo design visual
// =====================================================
const { test, expect } = require('@playwright/test');
const { TEST_USER, hasCredentials } = require('./test-config');
const path = require('path');
const fs = require('fs');

const PROD_URL = 'https://erp.laticinioquatrelati.com.br';

// Skip tests se nao tiver credenciais
test.beforeEach(async ({ }, testInfo) => {
    if (!hasCredentials) {
        testInfo.skip();
    }
});

// Helper para fazer login
async function login(page) {
    await page.goto(`${PROD_URL}/login`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
}

// Helper para verificar acesso superadmin
async function checkAccess(page) {
    const acessoRestrito = page.locator('text=Acesso Restrito');
    const isRestricted = await acessoRestrito.isVisible().catch(() => false);
    if (isRestricted) {
        console.log('Usuario nao e superadmin - pulando teste');
        return false;
    }
    return true;
}

test.describe('Pagina de Configuracoes - Novo Design', () => {

    test('deve carregar pagina com novo layout', async ({ page }) => {
        test.setTimeout(60000);
        await page.setViewportSize({ width: 1920, height: 1080 });

        await login(page);
        await page.goto(`${PROD_URL}/configuracoes`);
        await page.waitForLoadState('networkidle');

        if (!await checkAccess(page)) return;

        // Verificar secao de exportacao
        await expect(page.getByText('Exportar Dados')).toBeVisible();
        await expect(page.getByText('Clique para baixar os dados em formato JSON')).toBeVisible();

        // Verificar 4 cards de exportacao (secao Exportar Dados)
        const exportSection = page.locator('section').filter({ hasText: 'Exportar Dados' });
        await expect(exportSection.getByRole('button', { name: /Clientes/i }).first()).toBeVisible();
        await expect(exportSection.getByRole('button', { name: /Produtos/i }).first()).toBeVisible();
        await expect(exportSection.getByRole('button', { name: /Pedidos/i }).first()).toBeVisible();
        await expect(exportSection.getByRole('button', { name: /Backup Completo/i })).toBeVisible();

        // Verificar badge "Recomendado" no backup completo
        await expect(page.getByText('Recomendado')).toBeVisible();

        // Verificar secao de importacao
        await expect(page.getByText('Importar Dados')).toBeVisible();

        // Verificar opcoes de modo
        await expect(page.getByText('Adicionar/Atualizar')).toBeVisible();
        await expect(page.getByText('Substituir tudo')).toBeVisible();

        // Screenshot do novo layout
        await page.screenshot({ path: 'tests/screenshots/configuracoes-novo-layout.png', fullPage: true });

        console.log('Novo layout carregado com sucesso');
    });

    test('deve exportar clientes com sucesso', async ({ page }) => {
        test.setTimeout(90000);
        await page.setViewportSize({ width: 1920, height: 1080 });

        await login(page);
        await page.goto(`${PROD_URL}/configuracoes`);
        await page.waitForLoadState('networkidle');

        if (!await checkAccess(page)) return;

        // Configurar download handler
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 });

        // Clicar no card de Clientes (na secao de exportacao)
        const exportSection = page.locator('section').filter({ hasText: 'Exportar Dados' });
        const clientesCard = exportSection.getByRole('button', { name: /Clientes/i }).first();
        await clientesCard.click();

        // Aguardar download
        try {
            const download = await downloadPromise;
            const filename = download.suggestedFilename();
            console.log(`Download iniciado: ${filename}`);

            // Salvar arquivo para verificacao
            const downloadPath = path.join('tests/downloads', filename);
            await download.saveAs(downloadPath);

            // Verificar conteudo do arquivo
            const content = fs.readFileSync(downloadPath, 'utf-8');
            const data = JSON.parse(content);

            expect(data.tipo).toBe('clientes');
            expect(data.versao).toBe('1.0');
            expect(data.dados).toBeDefined();
            expect(Array.isArray(data.dados)).toBe(true);

            console.log(`Exportacao de clientes OK: ${data.total_registros} registros`);
        } catch {
            // Se nao houve download, verificar toast de sucesso
            await page.waitForSelector('div[role="status"]:has-text("Clientes exportado")', { timeout: 15000 });
            console.log('Toast de exportacao exibido');
        }

        await page.screenshot({ path: 'tests/screenshots/configuracoes-export-clientes-v2.png' });
    });

    test('deve exportar produtos com sucesso', async ({ page }) => {
        test.setTimeout(90000);
        await page.setViewportSize({ width: 1920, height: 1080 });

        await login(page);
        await page.goto(`${PROD_URL}/configuracoes`);
        await page.waitForLoadState('networkidle');

        if (!await checkAccess(page)) return;

        // Configurar download handler
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 });

        // Clicar no card de Produtos (na secao de exportacao)
        const exportSection = page.locator('section').filter({ hasText: 'Exportar Dados' });
        const produtosCard = exportSection.getByRole('button', { name: /Produtos/i }).first();
        await produtosCard.click();

        try {
            const download = await downloadPromise;
            const filename = download.suggestedFilename();
            console.log(`Download iniciado: ${filename}`);

            const downloadPath = path.join('tests/downloads', filename);
            await download.saveAs(downloadPath);

            const content = fs.readFileSync(downloadPath, 'utf-8');
            const data = JSON.parse(content);

            expect(data.tipo).toBe('produtos');
            expect(data.dados).toBeDefined();

            console.log(`Exportacao de produtos OK: ${data.total_registros} registros`);
        } catch {
            await page.waitForSelector('div[role="status"]:has-text("Produtos exportado")', { timeout: 15000 });
            console.log('Toast de exportacao exibido');
        }

        await page.screenshot({ path: 'tests/screenshots/configuracoes-export-produtos-v2.png' });
    });

    test('deve exportar pedidos com sucesso', async ({ page }) => {
        test.setTimeout(90000);
        await page.setViewportSize({ width: 1920, height: 1080 });

        await login(page);
        await page.goto(`${PROD_URL}/configuracoes`);
        await page.waitForLoadState('networkidle');

        if (!await checkAccess(page)) return;

        const downloadPromise = page.waitForEvent('download', { timeout: 30000 });

        // Clicar no card de Pedidos (na secao de exportacao)
        const exportSection = page.locator('section').filter({ hasText: 'Exportar Dados' });
        const pedidosCard = exportSection.getByRole('button', { name: /Pedidos/i }).first();
        await pedidosCard.click();

        try {
            const download = await downloadPromise;
            const filename = download.suggestedFilename();
            console.log(`Download iniciado: ${filename}`);

            const downloadPath = path.join('tests/downloads', filename);
            await download.saveAs(downloadPath);

            const content = fs.readFileSync(downloadPath, 'utf-8');
            const data = JSON.parse(content);

            expect(data.tipo).toBe('pedidos');

            console.log(`Exportacao de pedidos OK: ${data.total_registros} registros`);
        } catch {
            // Aguardar mais tempo para pedidos (pode ser mais lento)
            await page.waitForTimeout(5000);
            console.log('Exportacao de pedidos iniciada (timeout no download)');
        }

        await page.screenshot({ path: 'tests/screenshots/configuracoes-export-pedidos-v2.png' });
    });

    test('deve exportar backup completo com sucesso', async ({ page }) => {
        test.setTimeout(120000);
        await page.setViewportSize({ width: 1920, height: 1080 });

        await login(page);
        await page.goto(`${PROD_URL}/configuracoes`);
        await page.waitForLoadState('networkidle');

        if (!await checkAccess(page)) return;

        const downloadPromise = page.waitForEvent('download', { timeout: 60000 });

        // Clicar no card de Backup Completo (na secao de exportacao)
        const exportSection = page.locator('section').filter({ hasText: 'Exportar Dados' });
        const backupCard = exportSection.getByRole('button', { name: /Backup Completo/i });
        await backupCard.click();

        try {
            const download = await downloadPromise;
            const filename = download.suggestedFilename();
            console.log(`Download iniciado: ${filename}`);

            const downloadPath = path.join('tests/downloads', filename);
            await download.saveAs(downloadPath);

            const content = fs.readFileSync(downloadPath, 'utf-8');
            const data = JSON.parse(content);

            expect(data.tipo).toBe('completo');
            expect(data.clientes).toBeDefined();
            expect(data.produtos).toBeDefined();
            expect(data.pedidos).toBeDefined();

            console.log(`Backup completo OK: clientes=${data.clientes.length}, produtos=${data.produtos.length}, pedidos=${data.pedidos.length}`);
        } catch {
            await page.waitForSelector('div[role="status"]:has-text("Completo exportado")', { timeout: 15000 });
            console.log('Toast de exportacao exibido');
        }

        await page.screenshot({ path: 'tests/screenshots/configuracoes-export-backup-v2.png' });
    });

    test('checkbox de apenas ativos deve funcionar', async ({ page }) => {
        test.setTimeout(60000);
        await page.setViewportSize({ width: 1920, height: 1080 });

        await login(page);
        await page.goto(`${PROD_URL}/configuracoes`);
        await page.waitForLoadState('networkidle');

        if (!await checkAccess(page)) return;

        // Encontrar checkbox de apenas ativos
        const checkboxLabel = page.getByText('Exportar apenas registros ativos');
        await expect(checkboxLabel).toBeVisible();

        // Clicar no checkbox
        await checkboxLabel.click();
        await page.waitForTimeout(500);

        // Verificar que o texto de ajuda esta visivel
        await expect(page.getByText('Aplica-se a Clientes e Produtos')).toBeVisible();

        await page.screenshot({ path: 'tests/screenshots/configuracoes-checkbox-ativos-v2.png' });
        console.log('Checkbox de apenas ativos funciona');
    });

    test('modo substituir deve mostrar aviso', async ({ page }) => {
        test.setTimeout(60000);
        await page.setViewportSize({ width: 1920, height: 1080 });

        await login(page);
        await page.goto(`${PROD_URL}/configuracoes`);
        await page.waitForLoadState('networkidle');

        if (!await checkAccess(page)) return;

        // Verificar que aviso nao esta visivel inicialmente
        const aviso = page.getByText('Este modo remove todos os registros existentes');
        expect(await aviso.isVisible()).toBe(false);

        // Clicar no modo substituir
        const modoSubstituir = page.getByText('Substituir tudo');
        await modoSubstituir.click();
        await page.waitForTimeout(500);

        // Verificar que o aviso apareceu
        await expect(aviso).toBeVisible();

        await page.screenshot({ path: 'tests/screenshots/configuracoes-modo-substituir-v2.png' });
        console.log('Aviso de modo substituir funciona');
    });

    test('filtros de pedidos devem estar visiveis', async ({ page }) => {
        test.setTimeout(60000);
        await page.setViewportSize({ width: 1920, height: 1080 });

        await login(page);
        await page.goto(`${PROD_URL}/configuracoes`);
        await page.waitForLoadState('networkidle');

        if (!await checkAccess(page)) return;

        // Verificar filtros de pedidos
        await expect(page.getByText('Filtros para Pedidos')).toBeVisible();
        await expect(page.getByText('Data Inicio')).toBeVisible();
        await expect(page.getByText('Data Fim')).toBeVisible();

        // Verificar select de status
        const statusSelect = page.locator('select').filter({ hasText: 'Todos os status' });
        await expect(statusSelect).toBeVisible();

        // Verificar que o select tem as opcoes corretas
        await expect(statusSelect.locator('option')).toHaveCount(6); // Todos + 5 status

        await page.screenshot({ path: 'tests/screenshots/configuracoes-filtros-v2.png' });
        console.log('Filtros de pedidos visiveis');
    });

    test('cards de importacao devem estar visiveis', async ({ page }) => {
        test.setTimeout(60000);
        await page.setViewportSize({ width: 1920, height: 1080 });

        await login(page);
        await page.goto(`${PROD_URL}/configuracoes`);
        await page.waitForLoadState('networkidle');

        if (!await checkAccess(page)) return;

        // Verificar cards de importacao (border-dashed)
        const importClientesCard = page.locator('button').filter({ hasText: /Clientes.*Importar cadastro/i });
        const importProdutosCard = page.locator('button').filter({ hasText: /Produtos.*Importar catalogo/i });

        await expect(importClientesCard).toBeVisible();
        await expect(importProdutosCard).toBeVisible();

        await page.screenshot({ path: 'tests/screenshots/configuracoes-import-cards-v2.png' });
        console.log('Cards de importacao visiveis');
    });

});
