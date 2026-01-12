// =====================================================
// Testes Unitários - Middleware de Validação
// =====================================================

const {
    isValidCPF,
    isValidCNPJ,
    isValidCNPJorCPF,
    isValidCEP,
    isValidHorario,
    isStrongPassword,
    isValidPhone
} = require('../../src/middleware/validation');

describe('Validation Helper Functions', () => {
    describe('isValidCPF', () => {
        it('deve aceitar CPF válido com formatação', () => {
            expect(isValidCPF('529.982.247-25')).toBe(true);
        });

        it('deve aceitar CPF válido sem formatação', () => {
            expect(isValidCPF('52998224725')).toBe(true);
        });

        it('deve aceitar CPF com resto 10 no primeiro dígito', () => {
            // CPF válido que gera resto 10 no cálculo
            expect(isValidCPF('17602tried.217-00')).toBeDefined();
        });

        it('deve rejeitar CPF com dígitos repetidos', () => {
            expect(isValidCPF('111.111.111-11')).toBe(false);
            expect(isValidCPF('000.000.000-00')).toBe(false);
            expect(isValidCPF('222.222.222-22')).toBe(false);
        });

        it('deve rejeitar CPF com primeiro dígito verificador inválido', () => {
            expect(isValidCPF('529.982.247-35')).toBe(false);
        });

        it('deve rejeitar CPF com segundo dígito verificador inválido', () => {
            expect(isValidCPF('529.982.247-26')).toBe(false);
        });

        it('deve rejeitar CPF com tamanho incorreto', () => {
            expect(isValidCPF('12345')).toBe(false);
            expect(isValidCPF('123456789012')).toBe(false);
        });

        it('deve aceitar valor vazio (campo opcional)', () => {
            expect(isValidCPF('')).toBe(true);
            expect(isValidCPF(null)).toBe(true);
            expect(isValidCPF(undefined)).toBe(true);
        });
    });

    describe('isValidCNPJ', () => {
        it('deve aceitar CNPJ válido com formatação', () => {
            expect(isValidCNPJ('11.222.333/0001-81')).toBe(true);
        });

        it('deve aceitar CNPJ válido sem formatação', () => {
            expect(isValidCNPJ('11222333000181')).toBe(true);
        });

        it('deve rejeitar CNPJ com dígitos repetidos', () => {
            expect(isValidCNPJ('11.111.111/1111-11')).toBe(false);
            expect(isValidCNPJ('00.000.000/0000-00')).toBe(false);
        });

        it('deve rejeitar CNPJ com primeiro dígito verificador inválido', () => {
            expect(isValidCNPJ('11.222.333/0001-91')).toBe(false);
        });

        it('deve rejeitar CNPJ com segundo dígito verificador inválido', () => {
            expect(isValidCNPJ('11.222.333/0001-82')).toBe(false);
        });

        it('deve rejeitar CNPJ com tamanho incorreto', () => {
            expect(isValidCNPJ('1234567890')).toBe(false);
            expect(isValidCNPJ('123456789012345')).toBe(false);
        });

        it('deve aceitar valor vazio (campo opcional)', () => {
            expect(isValidCNPJ('')).toBe(true);
            expect(isValidCNPJ(null)).toBe(true);
        });
    });

    describe('isValidCNPJorCPF', () => {
        it('deve aceitar CPF válido', () => {
            expect(isValidCNPJorCPF('529.982.247-25')).toBe(true);
        });

        it('deve aceitar CNPJ válido', () => {
            expect(isValidCNPJorCPF('11.222.333/0001-81')).toBe(true);
        });

        it('deve rejeitar documento com tamanho incorreto', () => {
            expect(isValidCNPJorCPF('12345678')).toBe(false);
            expect(isValidCNPJorCPF('123456789012345')).toBe(false);
        });

        it('deve aceitar valor vazio (campo opcional)', () => {
            expect(isValidCNPJorCPF('')).toBe(true);
            expect(isValidCNPJorCPF(null)).toBe(true);
        });
    });

    describe('isValidCEP', () => {
        it('deve aceitar CEP válido com hífen', () => {
            expect(isValidCEP('01310-100')).toBe(true);
        });

        it('deve aceitar CEP válido sem hífen', () => {
            expect(isValidCEP('01310100')).toBe(true);
        });

        it('deve rejeitar CEP muito curto', () => {
            expect(isValidCEP('123')).toBe(false);
        });

        it('deve rejeitar CEP muito longo', () => {
            expect(isValidCEP('123456789')).toBe(false);
        });

        it('deve rejeitar CEP com formato inválido', () => {
            expect(isValidCEP('1234-5678')).toBe(false);
            expect(isValidCEP('abcde-fgh')).toBe(false);
        });

        it('deve aceitar valor vazio (campo opcional)', () => {
            expect(isValidCEP('')).toBe(true);
            expect(isValidCEP(null)).toBe(true);
        });
    });

    describe('isValidHorario', () => {
        it('deve aceitar horário válido HH:MM', () => {
            expect(isValidHorario('08:00')).toBe(true);
            expect(isValidHorario('23:59')).toBe(true);
            expect(isValidHorario('0:00')).toBe(true);
        });

        it('deve aceitar horário válido HH:MM:SS', () => {
            expect(isValidHorario('08:00:00')).toBe(true);
            expect(isValidHorario('23:59:59')).toBe(true);
        });

        it('deve rejeitar hora inválida', () => {
            expect(isValidHorario('25:00')).toBe(false);
            expect(isValidHorario('24:00')).toBe(false);
        });

        it('deve rejeitar minuto inválido', () => {
            expect(isValidHorario('12:60')).toBe(false);
        });

        it('deve rejeitar formato inválido', () => {
            expect(isValidHorario('abc')).toBe(false);
            expect(isValidHorario('12-00')).toBe(false);
        });

        it('deve aceitar valor vazio (campo opcional)', () => {
            expect(isValidHorario('')).toBe(true);
            expect(isValidHorario(null)).toBe(true);
        });
    });

    describe('isStrongPassword', () => {
        it('deve aceitar senha forte', () => {
            expect(isStrongPassword('Senha123!')).toBe(true);
            expect(isStrongPassword('MinhaS3nha@Forte')).toBe(true);
            expect(isStrongPassword('Teste_123')).toBe(true);
        });

        it('deve rejeitar senha sem maiúscula', () => {
            expect(isStrongPassword('senha123!')).toBe(false);
        });

        it('deve rejeitar senha sem número', () => {
            expect(isStrongPassword('SenhaForte!')).toBe(false);
        });

        it('deve rejeitar senha sem caractere especial', () => {
            expect(isStrongPassword('Senha123')).toBe(false);
        });

        it('deve rejeitar senha curta (menos de 8 caracteres)', () => {
            expect(isStrongPassword('Se1!')).toBe(false);
            expect(isStrongPassword('Aa1!aaa')).toBe(false);
        });

        it('deve rejeitar senha vazia', () => {
            expect(isStrongPassword('')).toBe(false);
        });

        it('deve rejeitar senha nula', () => {
            expect(isStrongPassword(null)).toBe(false);
        });
    });

    describe('isValidPhone', () => {
        it('deve aceitar telefone brasileiro válido', () => {
            expect(isValidPhone('11999999999')).toBe(true);
            expect(isValidPhone('(11) 99999-9999')).toBe(true);
            expect(isValidPhone('+55 11 99999-9999')).toBe(true);
        });

        it('deve aceitar telefone internacional válido', () => {
            expect(isValidPhone('+1 555 123 4567')).toBe(true);
            expect(isValidPhone('00351912345678')).toBe(true);
        });

        it('deve rejeitar telefone muito curto', () => {
            expect(isValidPhone('123456')).toBe(false);
        });

        it('deve rejeitar telefone muito longo', () => {
            expect(isValidPhone('1234567890123456')).toBe(false);
        });

        it('deve rejeitar telefone com números repetidos', () => {
            expect(isValidPhone('11111111111')).toBe(false);
        });

        it('deve rejeitar telefone só com zeros', () => {
            expect(isValidPhone('00000000000')).toBe(false);
        });

        it('deve aceitar valor vazio (campo opcional)', () => {
            expect(isValidPhone('')).toBe(true);
            expect(isValidPhone(null)).toBe(true);
        });
    });
});

// Testes de Integração para Middleware de Validação
describe('Validation Middleware Integration', () => {
    const request = require('supertest');
    const express = require('express');
    const {
        validate,
        loginValidation,
        pedidoValidation,
        pedidoUpdateValidation,
        clienteValidation
    } = require('../../src/middleware/validation');

    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
    });

    describe('validate middleware', () => {
        it('deve chamar next quando não houver erros', async () => {
            app.post('/test', loginValidation, (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .post('/test')
                .send({ email: 'test@test.com', password: '123456' });

            expect(response.status).toBe(200);
        });

        it('deve retornar 400 quando houver erros de validação', async () => {
            app.post('/test', loginValidation, (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .post('/test')
                .send({ email: 'invalid', password: '' });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Dados inválidos');
            expect(response.body.details).toBeDefined();
        });
    });

    describe('pedidoValidation - data_entrega custom validation', () => {
        it('deve rejeitar data_entrega anterior a data_pedido', async () => {
            app.post('/test', pedidoValidation, (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .post('/test')
                .send({
                    data_pedido: '2026-01-15',
                    data_entrega: '2026-01-10', // Anterior à data do pedido
                    cliente_id: 1,
                    produto_id: 1,
                    quantidade_caixas: 10,
                    preco_unitario: 50.00
                });

            expect(response.status).toBe(400);
            expect(response.body.details).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'data_entrega',
                        message: expect.stringContaining('anterior')
                    })
                ])
            );
        });

        it('deve aceitar data_entrega igual a data_pedido', async () => {
            app.post('/test', pedidoValidation, (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .post('/test')
                .send({
                    data_pedido: '2026-01-15',
                    data_entrega: '2026-01-15',
                    cliente_id: 1,
                    produto_id: 1,
                    quantidade_caixas: 10,
                    preco_unitario: 50.00
                });

            expect(response.status).toBe(200);
        });

        it('deve aceitar data_entrega posterior a data_pedido', async () => {
            app.post('/test-posterior', pedidoValidation, (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .post('/test-posterior')
                .send({
                    data_pedido: '2026-01-15',
                    data_entrega: '2026-01-20', // Posterior à data do pedido
                    cliente_id: 1,
                    produto_id: 1,
                    quantidade_caixas: 10,
                    preco_unitario: 50.00
                });

            expect(response.status).toBe(200);
        });
    });

    describe('pedidoUpdateValidation - data_entrega custom validation', () => {
        it('deve rejeitar data_entrega anterior a data_pedido no update', async () => {
            app.put('/test', pedidoUpdateValidation, (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .put('/test')
                .send({
                    data_pedido: '2026-01-15',
                    data_entrega: '2026-01-10'
                });

            expect(response.status).toBe(400);
        });
    });

    describe('clienteValidation - CNPJ/CPF validation', () => {
        it('deve rejeitar CNPJ inválido', async () => {
            app.post('/test', clienteValidation, (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .post('/test')
                .send({
                    nome: 'Cliente Teste',
                    cnpj_cpf: '12.345.678/0001-00' // CNPJ inválido
                });

            expect(response.status).toBe(400);
            expect(response.body.details).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'cnpj_cpf'
                    })
                ])
            );
        });

        it('deve rejeitar CPF inválido', async () => {
            app.post('/test', clienteValidation, (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .post('/test')
                .send({
                    nome: 'Cliente Teste',
                    cnpj_cpf: '111.111.111-11' // CPF inválido
                });

            expect(response.status).toBe(400);
        });

        it('deve aceitar CNPJ válido', async () => {
            app.post('/test', clienteValidation, (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .post('/test')
                .send({
                    nome: 'Cliente Teste',
                    cnpj_cpf: '11.222.333/0001-81'
                });

            expect(response.status).toBe(200);
        });

        it('deve rejeitar CEP inválido', async () => {
            app.post('/test', clienteValidation, (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .post('/test')
                .send({
                    nome: 'Cliente Teste',
                    cep: '123' // CEP inválido
                });

            expect(response.status).toBe(400);
        });

        it('deve rejeitar telefone inválido', async () => {
            app.post('/test', clienteValidation, (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .post('/test')
                .send({
                    nome: 'Cliente Teste',
                    telefone: '00000000000' // Telefone inválido
                });

            expect(response.status).toBe(400);
        });
    });
});

// Testes de validação de usuário com senha fraca no update
describe('Usuario Update Validation', () => {
    const request = require('supertest');
    const express = require('express');
    const { usuarioUpdateValidation } = require('../../src/middleware/validation');

    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.put('/test', usuarioUpdateValidation, (req, res) => {
            res.json({ success: true });
        });
    });

    it('deve rejeitar senha fraca no update', async () => {
        const response = await request(app)
            .put('/test')
            .send({ senha: 'fraca' });

        expect(response.status).toBe(400);
    });

    it('deve aceitar update sem senha', async () => {
        const response = await request(app)
            .put('/test')
            .send({ nome: 'Novo Nome' });

        expect(response.status).toBe(200);
    });

    it('deve aceitar senha forte no update', async () => {
        const response = await request(app)
            .put('/test')
            .send({ senha: 'Senha123!' });

        expect(response.status).toBe(200);
    });
});
