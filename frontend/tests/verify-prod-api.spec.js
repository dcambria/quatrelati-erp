// =====================================================
// Teste de API - Produção
// Verifica se backend está respondendo corretamente
// =====================================================

const { test, expect } = require('@playwright/test');
const { TEST_USER } = require('./test-config');

const PROD_URL = 'https://erp.laticinioquatrelati.com.br';
const PROD_API = 'https://erp.laticinioquatrelati.com.br/api';

test.describe('Verificação de Produção', () => {
  test('verificar login via API', async ({ request }) => {
    // Testar endpoint de login direto
    const response = await request.post(`${PROD_API}/auth/login`, {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password,
      },
    });

    console.log('Status do login:', response.status());

    if (response.ok()) {
      const data = await response.json();
      console.log('Login bem-sucedido:', data.user?.email || 'sem email');
      console.log('Token recebido:', data.token ? 'SIM' : 'NÃO');
    } else {
      const errorText = await response.text();
      console.log('Erro de login:', errorText);
    }
  });

  test('verificar health do backend', async ({ request }) => {
    const response = await request.get(`${PROD_API}/health`);
    console.log('Status do health:', response.status());

    if (response.ok()) {
      const data = await response.json();
      console.log('Health data:', JSON.stringify(data, null, 2));
    }
  });

  test('acessar clientes com token via API', async ({ request }) => {
    // Primeiro fazer login
    const loginResponse = await request.post(`${PROD_API}/auth/login`, {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password,
      },
    });

    if (!loginResponse.ok()) {
      console.log('Login falhou, não é possível testar clientes');
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Acessar clientes com token
    const clientesResponse = await request.get(`${PROD_API}/clientes`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('Status clientes:', clientesResponse.status());

    if (clientesResponse.ok()) {
      const clientes = await clientesResponse.json();
      console.log('Total de clientes:', clientes.length);
      if (clientes.length > 0) {
        console.log('Primeiro cliente:', clientes[0].nome);
      }
    }
  });

  test('verificar se frontend retorna HTML com classes novas', async ({ page }) => {
    // Acessar a página de login e verificar se o bundle JS contém as classes
    await page.goto(`${PROD_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Pegar todos os scripts carregados
    const scripts = await page.locator('script[src*="/_next/"]').all();
    console.log('Scripts encontrados:', scripts.length);

    // Verificar o HTML da página de clientes via fetch interno
    const response = await page.request.get(`${PROD_URL}/_next/static/chunks/pages/clientes-*.js`).catch(() => null);

    if (response && response.ok()) {
      const content = await response.text();
      console.log('Chunk de clientes encontrado');
      console.log('Contém rounded-full:', content.includes('rounded-full'));
      console.log('Contém bg-gray-100:', content.includes('bg-gray-100'));
    } else {
      console.log('Chunk de clientes não encontrado diretamente');
    }
  });
});
