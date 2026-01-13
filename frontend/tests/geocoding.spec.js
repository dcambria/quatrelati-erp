// =====================================================
// Teste de Geocoding - Verificar cidades dos clientes
// v1.0.0 - Testa geocoding via Nominatim
// =====================================================
const { test, expect } = require('@playwright/test');

const CIDADES_TESTE = [
  { cidade: 'São Paulo', estado: 'SP' },
  { cidade: 'Belo Horizonte', estado: 'MG' },
  { cidade: 'Caieiras', estado: 'SP' },
  { cidade: 'Brasília', estado: 'DF' },
];

test.describe('Geocoding de Cidades', () => {
  test('todas as cidades devem ser geocodificadas', async ({ request }) => {
    const resultados = [];

    for (const { cidade, estado } of CIDADES_TESTE) {
      const query = `${cidade}, ${estado}, Brasil`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=br`;

      console.log(`\n🔍 Geocodificando: ${query}`);

      const response = await request.get(url, {
        headers: {
          'User-Agent': 'Quatrelati-ERP-Test/1.0'
        }
      });

      expect(response.ok()).toBeTruthy();

      const data = await response.json();

      if (data && data.length > 0) {
        console.log(`   ✅ Encontrado: ${data[0].display_name}`);
        console.log(`   📍 Coords: ${data[0].lat}, ${data[0].lon}`);
        resultados.push({
          cidade,
          estado,
          encontrado: true,
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          nome: data[0].display_name
        });
      } else {
        console.log(`   ❌ Não encontrado!`);
        resultados.push({
          cidade,
          estado,
          encontrado: false
        });
      }

      // Aguardar entre requisições (rate limiting)
      await new Promise(resolve => setTimeout(resolve, 1100));
    }

    console.log('\n📊 RESUMO:');
    console.log(`   Total: ${CIDADES_TESTE.length}`);
    console.log(`   Encontradas: ${resultados.filter(r => r.encontrado).length}`);
    console.log(`   Não encontradas: ${resultados.filter(r => !r.encontrado).length}`);

    // Verificar que todas as cidades foram encontradas
    const naoEncontradas = resultados.filter(r => !r.encontrado);
    if (naoEncontradas.length > 0) {
      console.log('\n⚠️  Cidades não encontradas:');
      naoEncontradas.forEach(r => console.log(`   - ${r.cidade}, ${r.estado}`));
    }

    expect(naoEncontradas.length).toBe(0);
  });
});
