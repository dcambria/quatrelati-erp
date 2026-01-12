// =====================================================
// Testes Unitários - seedPasswords
// =====================================================

const seedPasswords = require('../../src/utils/seedPasswords');

describe('seedPasswords', () => {
    let mockPool;

    beforeEach(() => {
        mockPool = {
            query: jest.fn()
        };
        jest.clearAllMocks();
        // Suppress console output during tests
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('deve criar tabela magic_links e atualizar senhas', async () => {
        // Mock para CREATE TABLE
        mockPool.query.mockResolvedValueOnce({ rows: [] });
        // Mock para CREATE INDEX
        mockPool.query.mockResolvedValueOnce({ rows: [] });
        // Mock para UPDATE (nenhuma senha atualizada)
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await seedPasswords(mockPool);

        expect(mockPool.query).toHaveBeenCalledTimes(3);
        expect(console.log).toHaveBeenCalledWith('Verificando senhas dos usuários...');
        expect(console.log).toHaveBeenCalledWith('Todas as senhas já estão configuradas corretamente.');
    });

    it('deve logar emails quando senhas são atualizadas', async () => {
        // Mock para CREATE TABLE
        mockPool.query.mockResolvedValueOnce({ rows: [] });
        // Mock para CREATE INDEX
        mockPool.query.mockResolvedValueOnce({ rows: [] });
        // Mock para UPDATE (senhas atualizadas)
        mockPool.query.mockResolvedValueOnce({
            rows: [{ email: 'user1@test.com' }, { email: 'user2@test.com' }]
        });

        await seedPasswords(mockPool);

        expect(console.log).toHaveBeenCalledWith(
            'Senhas atualizadas para: user1@test.com, user2@test.com'
        );
    });

    it('deve tratar erros sem lançar exceção', async () => {
        mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

        // Não deve lançar erro
        await expect(seedPasswords(mockPool)).resolves.not.toThrow();

        expect(console.error).toHaveBeenCalledWith(
            'Erro ao atualizar senhas:',
            expect.any(Error)
        );
    });
});
