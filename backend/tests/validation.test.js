// =====================================================
// Testes de Validação
// v1.0.0 - Testes unitários para funções de validação
// =====================================================

const { body, validationResult } = require('express-validator');

// Importar funções de validação (precisamos expor elas)
// Por enquanto, vamos testar diretamente as lógicas

describe('Validações de CPF', () => {
  const isValidCPF = (cpf) => {
    if (!cpf) return true;
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(10))) return false;

    return true;
  };

  test('deve aceitar CPF válido', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true);
    expect(isValidCPF('52998224725')).toBe(true);
  });

  test('deve rejeitar CPF inválido', () => {
    expect(isValidCPF('111.111.111-11')).toBe(false);
    expect(isValidCPF('123.456.789-00')).toBe(false);
    expect(isValidCPF('12345')).toBe(false);
  });

  test('deve aceitar valor vazio (opcional)', () => {
    expect(isValidCPF('')).toBe(true);
    expect(isValidCPF(null)).toBe(true);
    expect(isValidCPF(undefined)).toBe(true);
  });
});

describe('Validações de CNPJ', () => {
  const isValidCNPJ = (cnpj) => {
    if (!cnpj) return true;
    cnpj = cnpj.replace(/[^\d]/g, '');
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    const digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0))) return false;

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(1))) return false;

    return true;
  };

  test('deve aceitar CNPJ válido', () => {
    expect(isValidCNPJ('11.222.333/0001-81')).toBe(true);
    expect(isValidCNPJ('11222333000181')).toBe(true);
  });

  test('deve rejeitar CNPJ inválido', () => {
    expect(isValidCNPJ('11.111.111/1111-11')).toBe(false);
    expect(isValidCNPJ('12.345.678/0001-00')).toBe(false);
  });

  test('deve aceitar valor vazio (opcional)', () => {
    expect(isValidCNPJ('')).toBe(true);
    expect(isValidCNPJ(null)).toBe(true);
  });
});

describe('Validações de CEP', () => {
  const isValidCEP = (cep) => {
    if (!cep) return true;
    return /^\d{5}-?\d{3}$/.test(cep);
  };

  test('deve aceitar CEP válido', () => {
    expect(isValidCEP('01310-100')).toBe(true);
    expect(isValidCEP('01310100')).toBe(true);
  });

  test('deve rejeitar CEP inválido', () => {
    expect(isValidCEP('123')).toBe(false);
    expect(isValidCEP('123456789')).toBe(false);
    expect(isValidCEP('abcde-fgh')).toBe(false);
  });

  test('deve aceitar valor vazio (opcional)', () => {
    expect(isValidCEP('')).toBe(true);
    expect(isValidCEP(null)).toBe(true);
  });
});

describe('Validações de Telefone', () => {
  const isValidPhone = (telefone) => {
    if (!telefone) return true;
    const numeros = telefone.replace(/\D/g, '');
    if (numeros.length < 7 || numeros.length > 15) return false;
    if (/^0+$/.test(numeros) || /^(\d)\1+$/.test(numeros)) return false;
    return true;
  };

  test('deve aceitar telefone brasileiro válido', () => {
    expect(isValidPhone('+55 11 99999-9999')).toBe(true);
    expect(isValidPhone('(11) 99999-9999')).toBe(true);
    expect(isValidPhone('11999999999')).toBe(true);
  });

  test('deve aceitar telefone internacional', () => {
    expect(isValidPhone('+1 555 123 4567')).toBe(true);
    expect(isValidPhone('+44 20 7946 0958')).toBe(true);
  });

  test('deve rejeitar telefone inválido', () => {
    expect(isValidPhone('123')).toBe(false);
    expect(isValidPhone('0000000000')).toBe(false);
    expect(isValidPhone('1111111111111111')).toBe(false);
  });

  test('deve aceitar valor vazio (opcional)', () => {
    expect(isValidPhone('')).toBe(true);
    expect(isValidPhone(null)).toBe(true);
  });
});

describe('Validações de Horário', () => {
  const isValidHorario = (horario) => {
    if (!horario) return true;
    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(horario);
  };

  test('deve aceitar horário válido', () => {
    expect(isValidHorario('08:00')).toBe(true);
    expect(isValidHorario('23:59')).toBe(true);
    expect(isValidHorario('08:00:00')).toBe(true);
  });

  test('deve rejeitar horário inválido', () => {
    expect(isValidHorario('25:00')).toBe(false);
    expect(isValidHorario('12:60')).toBe(false);
    expect(isValidHorario('abc')).toBe(false);
  });

  test('deve aceitar valor vazio (opcional)', () => {
    expect(isValidHorario('')).toBe(true);
    expect(isValidHorario(null)).toBe(true);
  });
});

describe('Validações de Senha Forte', () => {
  const isStrongPassword = (senha) => {
    if (!senha) return false;
    if (senha.length < 8) return false;
    if (!/[A-Z]/.test(senha)) return false;
    if (!/[0-9]/.test(senha)) return false;
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(senha)) return false;
    return true;
  };

  test('deve aceitar senha forte', () => {
    expect(isStrongPassword('Senha123!')).toBe(true);
    expect(isStrongPassword('MinhaSenha@2024')).toBe(true);
  });

  test('deve rejeitar senha fraca', () => {
    expect(isStrongPassword('12345678')).toBe(false); // sem maiúscula e especial
    expect(isStrongPassword('Senha123')).toBe(false); // sem especial
    expect(isStrongPassword('senha123!')).toBe(false); // sem maiúscula
    expect(isStrongPassword('Senha!')).toBe(false); // muito curta
  });

  test('deve rejeitar valor vazio', () => {
    expect(isStrongPassword('')).toBe(false);
    expect(isStrongPassword(null)).toBe(false);
  });
});
