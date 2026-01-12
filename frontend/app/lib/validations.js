// =====================================================
// Utilitários de Validação
// v1.4.0 - Adiciona máscara Horário
// =====================================================

import { z } from 'zod';

/**
 * Valida CPF brasileiro
 * @param {string} cpf - CPF com ou sem formatação
 * @returns {boolean}
 */
export function validarCPF(cpf) {
  if (!cpf) return true; // Opcional

  // Remove caracteres não numéricos
  const numeros = cpf.replace(/\D/g, '');

  if (numeros.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(numeros)) return false;

  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(numeros.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(numeros.charAt(9))) return false;

  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(numeros.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(numeros.charAt(10))) return false;

  return true;
}

/**
 * Valida CNPJ brasileiro
 * @param {string} cnpj - CNPJ com ou sem formatação
 * @returns {boolean}
 */
export function validarCNPJ(cnpj) {
  if (!cnpj) return true; // Opcional

  // Remove caracteres não numéricos
  const numeros = cnpj.replace(/\D/g, '');

  if (numeros.length !== 14) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(numeros)) return false;

  // Validação do primeiro dígito verificador
  let tamanho = numeros.length - 2;
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(numeros.charAt(tamanho))) return false;

  // Validação do segundo dígito verificador
  tamanho = tamanho + 1;
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(numeros.charAt(tamanho))) return false;

  return true;
}

/**
 * Valida CPF ou CNPJ
 * @param {string} valor - CPF ou CNPJ com ou sem formatação
 * @returns {boolean}
 */
export function validarCPFouCNPJ(valor) {
  if (!valor) return true; // Opcional

  const numeros = valor.replace(/\D/g, '');

  if (numeros.length === 11) {
    return validarCPF(valor);
  } else if (numeros.length === 14) {
    return validarCNPJ(valor);
  }

  // Se não tem 11 nem 14 dígitos, inválido
  return false;
}

/**
 * Valida CEP brasileiro (formato XXXXX-XXX ou XXXXXXXX)
 * @param {string} cep - CEP com ou sem formatação
 * @returns {boolean}
 */
export function validarCEP(cep) {
  if (!cep) return true; // Opcional

  const numeros = cep.replace(/\D/g, '');

  if (numeros.length !== 8) return false;

  // Verifica se não é um CEP inválido conhecido
  if (/^0{8}$/.test(numeros)) return false;

  return true;
}

/**
 * Valida formato de horário HH:MM ou intervalo
 * @param {string} horario - Horário ou intervalo (ex: "08:00" ou "08:00 às 17:00")
 * @returns {boolean}
 */
export function validarHorario(horario) {
  if (!horario) return true; // Opcional

  // Aceita formato HH:MM ou HH:MM às HH:MM
  const regexSimples = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  const regexIntervalo = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s*(às|a|-)\s*([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/i;

  return regexSimples.test(horario.trim()) || regexIntervalo.test(horario.trim());
}

/**
 * Valida se senha é forte
 * Requisitos: mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número
 * @param {string} senha - Senha a validar
 * @returns {boolean}
 */
export function validarSenhaForte(senha) {
  if (!senha) return false;

  if (senha.length < 8) return false;
  if (!/[A-Z]/.test(senha)) return false;
  if (!/[a-z]/.test(senha)) return false;
  if (!/[0-9]/.test(senha)) return false;

  return true;
}

/**
 * Retorna mensagem de erro para senha fraca
 * @param {string} senha - Senha a validar
 * @returns {string|null} Mensagem de erro ou null se válida
 */
export function mensagemSenhaForte(senha) {
  if (!senha) return 'Senha é obrigatória';
  if (senha.length < 8) return 'Senha deve ter no mínimo 8 caracteres';
  if (!/[A-Z]/.test(senha)) return 'Senha deve conter pelo menos uma letra maiúscula';
  if (!/[a-z]/.test(senha)) return 'Senha deve conter pelo menos uma letra minúscula';
  if (!/[0-9]/.test(senha)) return 'Senha deve conter pelo menos um número';
  return null;
}

// =====================================================
// Schemas Zod reutilizáveis
// =====================================================

/**
 * Schema para CNPJ/CPF com validação
 */
export const cnpjCpfSchema = z.string()
  .optional()
  .refine((val) => !val || validarCPFouCNPJ(val), {
    message: 'CPF ou CNPJ inválido',
  });

/**
 * Schema para CNPJ apenas com validação
 */
export const cnpjSchema = z.string()
  .optional()
  .refine((val) => !val || validarCNPJ(val), {
    message: 'CNPJ inválido',
  });

/**
 * Aplica máscara de CNPJ (XX.XXX.XXX/XXXX-XX)
 * @param {string} valor - Valor a ser formatado
 * @returns {string} Valor formatado
 */
export function mascaraCNPJ(valor) {
  if (!valor) return '';

  // Remove tudo que não é número
  const numeros = valor.replace(/\D/g, '');

  // Limita a 14 dígitos
  const limitado = numeros.slice(0, 14);

  // Aplica a máscara progressivamente
  let formatado = limitado;
  if (limitado.length > 2) {
    formatado = limitado.slice(0, 2) + '.' + limitado.slice(2);
  }
  if (limitado.length > 5) {
    formatado = formatado.slice(0, 6) + '.' + formatado.slice(6);
  }
  if (limitado.length > 8) {
    formatado = formatado.slice(0, 10) + '/' + formatado.slice(10);
  }
  if (limitado.length > 12) {
    formatado = formatado.slice(0, 15) + '-' + formatado.slice(15);
  }

  return formatado;
}

/**
 * Schema para CEP com validação
 */
export const cepSchema = z.string()
  .optional()
  .refine((val) => !val || validarCEP(val), {
    message: 'CEP inválido (formato: XXXXX-XXX)',
  });

/**
 * Aplica máscara de CEP (XXXXX-XXX)
 * @param {string} valor - Valor a ser formatado
 * @returns {string} Valor formatado
 */
export function mascaraCEP(valor) {
  if (!valor) return '';

  // Remove tudo que não é número
  const numeros = valor.replace(/\D/g, '');

  // Limita a 8 dígitos
  const limitado = numeros.slice(0, 8);

  // Aplica a máscara XXXXX-XXX
  if (limitado.length > 5) {
    return limitado.slice(0, 5) + '-' + limitado.slice(5);
  }

  return limitado;
}

/**
 * Aplica máscara de Telefone (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 * @param {string} valor - Valor a ser formatado
 * @returns {string} Valor formatado
 */
export function mascaraTelefone(valor) {
  if (!valor) return '';

  // Remove tudo que não é número
  const numeros = valor.replace(/\D/g, '');

  // Limita a 11 dígitos
  const limitado = numeros.slice(0, 11);

  // Aplica a máscara progressivamente
  let formatado = limitado;

  if (limitado.length > 0) {
    formatado = '(' + limitado;
  }
  if (limitado.length > 2) {
    formatado = '(' + limitado.slice(0, 2) + ') ' + limitado.slice(2);
  }
  if (limitado.length > 7) {
    // Celular: (XX) XXXXX-XXXX
    if (limitado.length > 10) {
      formatado = '(' + limitado.slice(0, 2) + ') ' + limitado.slice(2, 7) + '-' + limitado.slice(7);
    } else {
      // Fixo: (XX) XXXX-XXXX
      formatado = '(' + limitado.slice(0, 2) + ') ' + limitado.slice(2, 6) + '-' + limitado.slice(6);
    }
  }

  return formatado;
}

/**
 * Aplica máscara de Horário (HH:MM ou HH:MM às HH:MM)
 * @param {string} valor - Valor a ser formatado
 * @returns {string} Valor formatado
 */
export function mascaraHorario(valor) {
  if (!valor) return '';

  // Função para formatar um horário individual
  const formatarHorario = (str) => {
    const numeros = str.replace(/\D/g, '').slice(0, 4);
    if (numeros.length === 0) return '';
    if (numeros.length <= 2) return numeros;
    return numeros.slice(0, 2) + ':' + numeros.slice(2);
  };

  // Verifica se tem separador de intervalo completo
  const separadoresCompletos = [' às ', ' a ', ' - '];
  for (const sep of separadoresCompletos) {
    const idx = valor.toLowerCase().indexOf(sep.toLowerCase());
    if (idx !== -1) {
      const inicio = formatarHorario(valor.slice(0, idx));
      const fim = formatarHorario(valor.slice(idx + sep.length));
      return inicio + ' às ' + fim;
    }
  }

  // Verifica separadores parciais (usuário ainda digitando)
  // Inclui variações com e sem acento
  const separadoresParciais = [' às', ' as', ' à', ' a', 'às', 'as', 'à', ' -', '- '];
  for (const sep of separadoresParciais) {
    const idx = valor.toLowerCase().indexOf(sep.toLowerCase());
    if (idx !== -1 && idx > 0) {
      const inicio = formatarHorario(valor.slice(0, idx));
      const resto = valor.slice(idx);
      const fimNumeros = resto.replace(/[^0-9]/g, '');
      if (fimNumeros) {
        return inicio + ' às ' + formatarHorario(fimNumeros);
      }
      return inicio + resto;
    }
  }

  // Verifica se termina com espaço (início de separador)
  if (valor.endsWith(' ')) {
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length >= 4) {
      return formatarHorario(numeros) + ' ';
    }
  }

  // Horário simples
  return formatarHorario(valor);
}

/**
 * Schema para horário com validação
 */
export const horarioSchema = z.string()
  .optional()
  .refine((val) => !val || validarHorario(val), {
    message: 'Horário inválido (formato: HH:MM ou HH:MM às HH:MM)',
  });

/**
 * Schema para senha forte
 */
export const senhaForteSchema = z.string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .refine((val) => /[A-Z]/.test(val), {
    message: 'Senha deve conter pelo menos uma letra maiúscula',
  })
  .refine((val) => /[a-z]/.test(val), {
    message: 'Senha deve conter pelo menos uma letra minúscula',
  })
  .refine((val) => /[0-9]/.test(val), {
    message: 'Senha deve conter pelo menos um número',
  });

/**
 * Schema para senha forte opcional (para edição)
 */
export const senhaForteOpcionalSchema = z.string()
  .optional()
  .refine((val) => !val || val.length >= 8, {
    message: 'Senha deve ter no mínimo 8 caracteres',
  })
  .refine((val) => !val || /[A-Z]/.test(val), {
    message: 'Senha deve conter pelo menos uma letra maiúscula',
  })
  .refine((val) => !val || /[a-z]/.test(val), {
    message: 'Senha deve conter pelo menos uma letra minúscula',
  })
  .refine((val) => !val || /[0-9]/.test(val), {
    message: 'Senha deve conter pelo menos um número',
  })
  .or(z.literal(''));

/**
 * Schema para preço positivo
 */
export const precoPositivoSchema = z.string()
  .optional()
  .refine((val) => !val || parseFloat(val) >= 0, {
    message: 'Preço deve ser positivo',
  });

/**
 * Cria schema de pedido com validação de datas
 * @param {object} options - Opções para personalização
 * @returns {z.ZodObject} Schema do pedido
 */
export function criarPedidoSchema() {
  return z.object({
    data_pedido: z.string().min(1, 'Data é obrigatória'),
    cliente_id: z.string().min(1, 'Cliente é obrigatório'),
    data_entrega: z.string().optional(),
    nf: z.string().optional(),
    observacoes: z.string().optional(),
    preco_descarga_pallet: precoPositivoSchema,
    horario_recebimento: horarioSchema,
  }).refine((data) => {
    // Se data_entrega foi preenchida, deve ser >= data_pedido
    if (data.data_entrega && data.data_pedido) {
      return new Date(data.data_entrega) >= new Date(data.data_pedido);
    }
    return true;
  }, {
    message: 'Data de entrega deve ser igual ou posterior à data do pedido',
    path: ['data_entrega'],
  });
}
