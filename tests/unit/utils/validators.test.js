// Testes de validação

describe('Validators', () => {
  describe('Email Validation', () => {
    const isValidEmail = (email) => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(email);
    };

    test('deve aceitar email válido', () => {
      expect(isValidEmail('teste@teste.com')).toBe(true);
      expect(isValidEmail('usuario@dominio.com.br')).toBe(true);
      expect(isValidEmail('nome.sobrenome@empresa.com')).toBe(true);
    });

    test('deve rejeitar email inválido', () => {
      expect(isValidEmail('teste')).toBe(false);
      expect(isValidEmail('teste@')).toBe(false);
      expect(isValidEmail('@teste.com')).toBe(false);
      expect(isValidEmail('teste @teste.com')).toBe(false);
    });
  });

  describe('Número de Pedido', () => {
    const isValidNumeroPedido = (numero) => {
      // Formato: YYMMXX (6 dígitos)
      const regex = /^\d{6}$/;
      return regex.test(numero);
    };

    test('deve aceitar número de pedido válido', () => {
      expect(isValidNumeroPedido('260101')).toBe(true);
      expect(isValidNumeroPedido('251241')).toBe(true);
    });

    test('deve rejeitar número de pedido inválido', () => {
      expect(isValidNumeroPedido('12345')).toBe(false);
      expect(isValidNumeroPedido('1234567')).toBe(false);
      expect(isValidNumeroPedido('ABCDEF')).toBe(false);
    });
  });

  describe('Cálculos de Pedido', () => {
    const calcularPeso = (quantidadeCaixas, pesoCaixa) => {
      return quantidadeCaixas * pesoCaixa;
    };

    const calcularTotal = (pesoKg, precoKg) => {
      return pesoKg * precoKg;
    };

    test('deve calcular peso corretamente', () => {
      expect(calcularPeso(100, 5)).toBe(500);
      expect(calcularPeso(50, 20)).toBe(1000);
      expect(calcularPeso(1400, 5)).toBe(7000);
    });

    test('deve calcular total corretamente', () => {
      expect(calcularTotal(7000, 19)).toBe(133000);
      expect(calcularTotal(1000, 20)).toBe(20000);
      expect(calcularTotal(500, 21)).toBe(10500);
    });
  });
});
