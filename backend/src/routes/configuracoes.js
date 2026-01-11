// =====================================================
// Rotas de Configurações do Sistema
// Apenas superadmins podem acessar
// =====================================================

const express = require('express');
const router = express.Router();
const { authMiddleware, superadminOnly } = require('../middleware/auth');

// Todas as rotas requerem autenticação e nível superadmin
router.use(authMiddleware);
router.use(superadminOnly);

/**
 * GET /api/configuracoes
 * Lista todas as configurações
 */
router.get('/', async (req, res) => {
    try {
        const result = await req.db.query(`
            SELECT c.*, u.nome as updated_by_nome
            FROM configuracoes c
            LEFT JOIN usuarios u ON c.updated_by = u.id
            ORDER BY c.chave ASC
        `);

        res.json({ configuracoes: result.rows });
    } catch (error) {
        console.error('Erro ao listar configurações:', error);
        res.status(500).json({ error: 'Erro ao listar configurações' });
    }
});

/**
 * GET /api/configuracoes/:chave
 * Busca uma configuração específica
 */
router.get('/:chave', async (req, res) => {
    try {
        const { chave } = req.params;

        const result = await req.db.query(`
            SELECT c.*, u.nome as updated_by_nome
            FROM configuracoes c
            LEFT JOIN usuarios u ON c.updated_by = u.id
            WHERE c.chave = $1
        `, [chave]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Configuração não encontrada' });
        }

        res.json({ configuracao: result.rows[0] });
    } catch (error) {
        console.error('Erro ao buscar configuração:', error);
        res.status(500).json({ error: 'Erro ao buscar configuração' });
    }
});

/**
 * PUT /api/configuracoes/:chave
 * Atualiza uma configuração
 */
router.put('/:chave', async (req, res) => {
    try {
        const { chave } = req.params;
        const { valor } = req.body;

        const result = await req.db.query(`
            UPDATE configuracoes
            SET valor = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
            WHERE chave = $3
            RETURNING *
        `, [valor, req.userId, chave]);

        if (result.rows.length === 0) {
            // Se não existe, criar
            const insertResult = await req.db.query(`
                INSERT INTO configuracoes (chave, valor, updated_by)
                VALUES ($1, $2, $3)
                RETURNING *
            `, [chave, valor, req.userId]);

            return res.json({
                message: 'Configuração criada com sucesso',
                configuracao: insertResult.rows[0]
            });
        }

        res.json({
            message: 'Configuração atualizada com sucesso',
            configuracao: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao atualizar configuração:', error);
        res.status(500).json({ error: 'Erro ao atualizar configuração' });
    }
});

module.exports = router;
