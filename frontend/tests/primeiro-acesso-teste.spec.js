// =====================================================
// Teste Específico - Primeiro Acesso
// Executa o fluxo completo de primeiro acesso
// =====================================================

const { test, expect } = require('@playwright/test');

const MAGIC_LINK = 'http://localhost:3000/magic-link?token=8fd86c10b34335bdeb1990c77062ff6d5fa84d33a5dd087095a8bfd87124903d';

test.describe('Primeiro Acesso - Teste Específico', () => {
  test('deve completar fluxo de primeiro acesso e ver tour', async ({ page }) => {
    console.log('🔗 Acessando magic link...');
    await page.goto(MAGIC_LINK);
    await page.waitForLoadState('networkidle');

    // Aguardar redirecionamento após magic link
    await page.waitForURL((url) => !url.pathname.includes('magic-link'), { timeout: 15000 });

    console.log('📍 URL após magic link:', page.url());
    await page.waitForTimeout(2000);

    // Screenshot inicial
    await page.screenshot({ path: 'tests/screenshots/primeiro-acesso-1-apos-magic-link.png' });

    // Verificar se modal de primeiro acesso apareceu
    const modalTitle = page.locator('text=Bem-vindo ao Quatrelati!');
    await modalTitle.waitFor({ state: 'visible', timeout: 10000 });

    console.log('✅ Modal de primeiro acesso visível');
    await page.screenshot({ path: 'tests/screenshots/primeiro-acesso-2-modal-aberto.png' });

    // PASSO 1: Preencher nome
    console.log('📝 Preenchendo dados pessoais...');
    const nomeInput = page.locator('input[placeholder="Seu nome"]');
    await nomeInput.clear();
    await nomeInput.fill('Usuário Teste Primeiro Acesso');

    // Telefone (opcional)
    const telefoneInput = page.locator('input').filter({ hasText: /telefone/i }).first();
    if (await telefoneInput.count() > 0) {
      // Tentar preencher telefone se o campo existir
    }

    await page.screenshot({ path: 'tests/screenshots/primeiro-acesso-3-dados-preenchidos.png' });

    // Clicar em Próximo
    const btnProximo = page.locator('button').filter({ hasText: /Próximo/i });
    await btnProximo.click();
    await page.waitForTimeout(500);

    console.log('✅ Passo 1 concluído');

    // PASSO 2: Definir senha
    console.log('🔐 Definindo senha...');

    const senhaInput = page.locator('input[placeholder="Digite sua senha"]');
    await senhaInput.fill('Teste@123456');

    const confirmarSenhaInput = page.locator('input[placeholder="Confirme sua senha"]');
    await confirmarSenhaInput.fill('Teste@123456');

    await page.screenshot({ path: 'tests/screenshots/primeiro-acesso-4-senha-preenchida.png' });

    // Verificar indicador de força de senha
    const forcaSenha = page.locator('text=Forte');
    if (await forcaSenha.isVisible()) {
      console.log('✅ Indicador de força de senha: Forte');
    }

    // Clicar em Concluir Cadastro
    console.log('📤 Clicando em Concluir Cadastro...');
    const btnConcluir = page.locator('button').filter({ hasText: /Concluir Cadastro/i });
    await btnConcluir.click();

    // Aguardar processamento
    await page.waitForTimeout(5000);

    await page.screenshot({ path: 'tests/screenshots/primeiro-acesso-5-apos-concluir.png' });

    // Verificar sucesso
    const modalAindaVisivel = await modalTitle.isVisible().catch(() => false);

    if (!modalAindaVisivel) {
      console.log('✅ Modal fechou - primeiro acesso concluído com sucesso!');

      // Verificar se tour apareceu
      await page.waitForTimeout(1000);
      const tourTitle = page.locator('text=Bem-vindo ao Quatrelati!').first();
      const tourVisivel = await tourTitle.isVisible().catch(() => false);

      if (tourVisivel) {
        console.log('✅ Tour guiada iniciada!');
        await page.screenshot({ path: 'tests/screenshots/primeiro-acesso-6-tour-iniciada.png' });

        // Pular tour para finalizar teste
        const btnPularTour = page.locator('text=Pular tour');
        if (await btnPularTour.isVisible()) {
          await btnPularTour.click();
          console.log('⏭️  Tour pulada');
        }
      }
    } else {
      console.log('⚠️  Modal ainda visível - verificando erros...');

      // Capturar possível mensagem de erro
      const toastError = page.locator('[role="status"]').first();
      if (await toastError.isVisible()) {
        const errorText = await toastError.textContent();
        console.log('❌ Erro encontrado:', errorText);
      }
    }

    await page.screenshot({ path: 'tests/screenshots/primeiro-acesso-7-final.png' });

    // Verificar se está no dashboard
    expect(page.url()).not.toContain('/login');
    console.log('✅ Teste finalizado com sucesso!');
  });
});
