// =====================================================
// Middleware de Validação
// v1.2.0 - Adicionar validação de telefone internacional
// =====================================================

const { validationResult, body, param, query } = require('express-validator');

// =====================================================
// Funções de Validação Customizadas
// =====================================================

/**
 * Valida CPF brasileiro (11 dígitos)
 * @param {string} cpf - CPF a validar (com ou sem formatação)
 * @returns {boolean}
 */
const isValidCPF = (cpf) => {
    if (!cpf) return true; // Campo opcional

    // Remover formatação
    cpf = cpf.replace(/[^\d]/g, '');

    // Verificar tamanho
    if (cpf.length !== 11) return false;

    // Verificar dígitos repetidos
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    // Calcular dígitos verificadores
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

/**
 * Valida CNPJ brasileiro (14 dígitos)
 * @param {string} cnpj - CNPJ a validar (com ou sem formatação)
 * @returns {boolean}
 */
const isValidCNPJ = (cnpj) => {
    if (!cnpj) return true; // Campo opcional

    // Remover formatação
    cnpj = cnpj.replace(/[^\d]/g, '');

    // Verificar tamanho
    if (cnpj.length !== 14) return false;

    // Verificar dígitos repetidos
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    // Calcular primeiro dígito verificador
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

    // Calcular segundo dígito verificador
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

/**
 * Valida CNPJ ou CPF
 * @param {string} doc - Documento a validar
 * @returns {boolean}
 */
const isValidCNPJorCPF = (doc) => {
    if (!doc) return true; // Campo opcional

    const numeros = doc.replace(/[^\d]/g, '');

    if (numeros.length === 11) return isValidCPF(doc);
    if (numeros.length === 14) return isValidCNPJ(doc);

    return false;
};

/**
 * Valida CEP brasileiro (XXXXX-XXX ou XXXXXXXX)
 * @param {string} cep - CEP a validar
 * @returns {boolean}
 */
const isValidCEP = (cep) => {
    if (!cep) return true; // Campo opcional
    return /^\d{5}-?\d{3}$/.test(cep);
};

/**
 * Valida formato de horário (HH:MM ou HH:MM:SS)
 * @param {string} horario - Horário a validar
 * @returns {boolean}
 */
const isValidHorario = (horario) => {
    if (!horario) return true; // Campo opcional
    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(horario);
};

/**
 * Valida senha forte (mínimo 8 chars, 1 maiúscula, 1 número, 1 especial)
 * @param {string} senha - Senha a validar
 * @returns {boolean}
 */
const isStrongPassword = (senha) => {
    if (!senha) return false;
    if (senha.length < 8) return false;
    if (!/[A-Z]/.test(senha)) return false; // Pelo menos uma maiúscula
    if (!/[0-9]/.test(senha)) return false; // Pelo menos um número
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(senha)) return false; // Pelo menos um especial
    return true;
};

/**
 * Valida telefone formato internacional
 * Aceita: +55 11 99999-9999, (11) 99999-9999, 11999999999, etc.
 * @param {string} telefone - Telefone a validar
 * @returns {boolean}
 */
const isValidPhone = (telefone) => {
    if (!telefone) return true; // Campo opcional

    // Remove formatação
    const numeros = telefone.replace(/\D/g, '');

    // Telefone brasileiro: 10-11 dígitos (com DDD)
    // Telefone internacional: 7-15 dígitos
    if (numeros.length < 7 || numeros.length > 15) return false;

    // Não pode ser só zeros ou números repetidos
    if (/^0+$/.test(numeros) || /^(\d)\1+$/.test(numeros)) return false;

    return true;
};

/**
 * Middleware para processar resultados de validação
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Dados inválidos',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// =====================================================
// Validações de Autenticação
// =====================================================

const loginValidation = [
    body('email')
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Senha é obrigatória'),
    validate
];

// =====================================================
// Validações de Pedidos
// =====================================================

const pedidoValidation = [
    body('data_pedido')
        .notEmpty()
        .withMessage('Data do pedido é obrigatória')
        .isISO8601()
        .withMessage('Data do pedido inválida'),
    body('cliente_id')
        .notEmpty()
        .withMessage('Cliente é obrigatório')
        .isInt({ min: 1 })
        .withMessage('Cliente inválido'),
    body('produto_id')
        .notEmpty()
        .withMessage('Produto é obrigatório')
        .isInt({ min: 1 })
        .withMessage('Produto inválido'),
    body('quantidade_caixas')
        .notEmpty()
        .withMessage('Quantidade é obrigatória')
        .isInt({ min: 1 })
        .withMessage('Quantidade deve ser maior que 0'),
    body('preco_unitario')
        .notEmpty()
        .withMessage('Preço unitário é obrigatório')
        .isFloat({ min: 0.01 })
        .withMessage('Preço deve ser maior que 0'),
    body('data_entrega')
        .optional()
        .isISO8601()
        .withMessage('Data de entrega inválida')
        .custom((value, { req }) => {
            if (value && req.body.data_pedido) {
                const dataEntrega = new Date(value);
                const dataPedido = new Date(req.body.data_pedido);
                if (dataEntrega < dataPedido) {
                    throw new Error('Data de entrega não pode ser anterior à data do pedido');
                }
            }
            return true;
        }),
    body('horario_recebimento')
        .optional()
        .custom(isValidHorario)
        .withMessage('Horário inválido (formato: HH:MM)'),
    body('nf')
        .optional()
        .isString()
        .withMessage('N.F. inválida'),
    body('observacoes')
        .optional()
        .isString()
        .withMessage('Observações inválidas'),
    validate
];

const pedidoUpdateValidation = [
    body('data_pedido')
        .optional()
        .isISO8601()
        .withMessage('Data do pedido inválida'),
    body('cliente_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Cliente inválido'),
    body('produto_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Produto inválido'),
    body('quantidade_caixas')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Quantidade deve ser maior que 0'),
    body('preco_unitario')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('Preço deve ser maior que 0'),
    body('data_entrega')
        .optional()
        .isISO8601()
        .withMessage('Data de entrega inválida')
        .custom((value, { req }) => {
            if (value && req.body.data_pedido) {
                const dataEntrega = new Date(value);
                const dataPedido = new Date(req.body.data_pedido);
                if (dataEntrega < dataPedido) {
                    throw new Error('Data de entrega não pode ser anterior à data do pedido');
                }
            }
            return true;
        }),
    body('horario_recebimento')
        .optional()
        .custom(isValidHorario)
        .withMessage('Horário inválido (formato: HH:MM)'),
    body('entregue')
        .optional()
        .isBoolean()
        .withMessage('Status de entrega inválido'),
    validate
];

// =====================================================
// Validações de Clientes
// =====================================================

const clienteValidation = [
    body('nome')
        .notEmpty()
        .withMessage('Nome é obrigatório')
        .isLength({ min: 2, max: 150 })
        .withMessage('Nome deve ter entre 2 e 150 caracteres'),
    body('cnpj_cpf')
        .optional()
        .custom(isValidCNPJorCPF)
        .withMessage('CNPJ/CPF inválido (deve ser um documento válido)'),
    body('telefone')
        .optional()
        .custom(isValidPhone)
        .withMessage('Telefone inválido (deve ter entre 7 e 15 dígitos)'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Email inválido'),
    body('endereco')
        .optional()
        .isString()
        .withMessage('Endereço inválido'),
    body('cep')
        .optional()
        .custom(isValidCEP)
        .withMessage('CEP inválido (formato: XXXXX-XXX)'),
    body('observacoes')
        .optional()
        .isString()
        .withMessage('Observações inválidas'),
    validate
];

// =====================================================
// Validações de Produtos
// =====================================================

const produtoValidation = [
    body('nome')
        .notEmpty()
        .withMessage('Nome é obrigatório')
        .isLength({ min: 2, max: 150 })
        .withMessage('Nome deve ter entre 2 e 150 caracteres'),
    body('peso_caixa_kg')
        .notEmpty()
        .withMessage('Peso por caixa é obrigatório')
        .isFloat({ min: 0.001 })
        .withMessage('Peso deve ser maior que 0'),
    body('preco_padrao')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Preço deve ser um valor válido'),
    body('descricao')
        .optional()
        .isString()
        .withMessage('Descrição inválida'),
    validate
];

// =====================================================
// Validações de Usuários
// =====================================================

const usuarioValidation = [
    body('nome')
        .notEmpty()
        .withMessage('Nome é obrigatório')
        .isLength({ min: 2, max: 100 })
        .withMessage('Nome deve ter entre 2 e 100 caracteres'),
    body('email')
        .notEmpty()
        .withMessage('Email é obrigatório')
        .isEmail()
        .withMessage('Email inválido'),
    body('telefone')
        .optional()
        .custom(isValidPhone)
        .withMessage('Telefone inválido (deve ter entre 7 e 15 dígitos)'),
    body('senha')
        .notEmpty()
        .withMessage('Senha é obrigatória')
        .custom(isStrongPassword)
        .withMessage('Senha deve ter mínimo 8 caracteres, 1 maiúscula, 1 número e 1 caractere especial'),
    body('nivel')
        .optional()
        .isIn(['superadmin', 'admin', 'vendedor', 'visualizador'])
        .withMessage('Nível de acesso inválido'),
    validate
];

const usuarioUpdateValidation = [
    body('nome')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nome deve ter entre 2 e 100 caracteres'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Email inválido'),
    body('telefone')
        .optional()
        .custom(isValidPhone)
        .withMessage('Telefone inválido (deve ter entre 7 e 15 dígitos)'),
    body('senha')
        .optional()
        .custom((value) => {
            // Se senha for fornecida, deve ser forte
            if (value && !isStrongPassword(value)) {
                throw new Error('Senha deve ter mínimo 8 caracteres, 1 maiúscula, 1 número e 1 caractere especial');
            }
            return true;
        }),
    body('nivel')
        .optional()
        .isIn(['superadmin', 'admin', 'vendedor', 'visualizador'])
        .withMessage('Nível de acesso inválido'),
    body('ativo')
        .optional()
        .isBoolean()
        .withMessage('Status inválido'),
    validate
];

// =====================================================
// Validações de ID
// =====================================================

const idValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID inválido'),
    validate
];

// =====================================================
// Validações de Query (filtros)
// =====================================================

const pedidosQueryValidation = [
    query('mes')
        .optional()
        .isInt({ min: 1, max: 12 })
        .withMessage('Mês inválido'),
    query('ano')
        .optional()
        .isInt({ min: 2020, max: 2100 })
        .withMessage('Ano inválido'),
    query('cliente_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Cliente inválido'),
    query('produto_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Produto inválido'),
    query('status')
        .optional()
        .isIn(['pendente', 'entregue', 'todos'])
        .withMessage('Status inválido'),
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Página inválida'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limite inválido'),
    validate
];

module.exports = {
    // Middleware
    validate,
    loginValidation,
    pedidoValidation,
    pedidoUpdateValidation,
    clienteValidation,
    produtoValidation,
    usuarioValidation,
    usuarioUpdateValidation,
    idValidation,
    pedidosQueryValidation,
    // Helper functions (for testing)
    isValidCPF,
    isValidCNPJ,
    isValidCNPJorCPF,
    isValidCEP,
    isValidHorario,
    isStrongPassword,
    isValidPhone
};
