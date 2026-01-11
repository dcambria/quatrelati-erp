// =====================================================
// Middleware de Validação
// =====================================================

const { validationResult, body, param, query } = require('express-validator');

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
        .withMessage('Data de entrega inválida'),
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
        .withMessage('Data de entrega inválida'),
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
        .isLength({ max: 20 })
        .withMessage('CNPJ/CPF inválido'),
    body('telefone')
        .optional()
        .isLength({ max: 20 })
        .withMessage('Telefone inválido'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Email inválido'),
    body('endereco')
        .optional()
        .isString()
        .withMessage('Endereço inválido'),
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
    body('senha')
        .notEmpty()
        .withMessage('Senha é obrigatória')
        .isLength({ min: 8 })
        .withMessage('Senha deve ter no mínimo 8 caracteres'),
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
    body('senha')
        .optional()
        .isLength({ min: 8 })
        .withMessage('Senha deve ter no mínimo 8 caracteres'),
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
    validate,
    loginValidation,
    pedidoValidation,
    pedidoUpdateValidation,
    clienteValidation,
    produtoValidation,
    usuarioValidation,
    usuarioUpdateValidation,
    idValidation,
    pedidosQueryValidation
};
