// =====================================================
// Middleware de Filtro por Vendedor
// v1.0.0 - Centraliza lógica de permissões de visualização
// =====================================================

/**
 * Middleware que carrega permissões do usuário para filtro de vendedor
 * Adiciona ao req:
 * - canViewAll: boolean - se pode ver todos os registros
 * - isAdmin: boolean - se é admin ou superadmin
 * - podeVisualizarTodos: boolean - flag específica do usuário
 * - getVendedorFilter: function - retorna filtro SQL apropriado
 */
const vendedorFilterMiddleware = async (req, res, next) => {
    try {
        const userResult = await req.db.query(
            'SELECT nivel, pode_visualizar_todos FROM usuarios WHERE id = $1',
            [req.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const { nivel, pode_visualizar_todos } = userResult.rows[0];
        const isAdmin = ['superadmin', 'admin'].includes(nivel);
        const canViewAll = isAdmin || pode_visualizar_todos;

        // Anexa informações ao request
        req.vendedorPerms = {
            nivel,
            isAdmin,
            podeVisualizarTodos: pode_visualizar_todos || false,
            canViewAll
        };

        /**
         * Obtém o ID do vendedor para filtrar
         * @param {string|number} vendedorIdFromQuery - vendedor_id da query string
         * @returns {number|null} ID do vendedor para filtrar, ou null se deve ver todos
         */
        req.getVendedorId = (vendedorIdFromQuery) => {
            if (!canViewAll) {
                // Usuário comum só vê seus próprios registros
                return req.userId;
            }
            // Admin pode filtrar por vendedor específico ou ver todos
            return vendedorIdFromQuery ? parseInt(vendedorIdFromQuery) : null;
        };

        /**
         * Adiciona cláusula WHERE para filtro de vendedor
         * @param {string} columnName - Nome da coluna (ex: 'vendedor_id', 'c.vendedor_id')
         * @param {string|number} vendedorIdFromQuery - vendedor_id da query string
         * @param {number} paramIndex - Índice do parâmetro atual
         * @returns {{ clause: string|null, param: number|null, newIndex: number }}
         */
        req.addVendedorFilter = (columnName, vendedorIdFromQuery, paramIndex) => {
            const vendedorId = req.getVendedorId(vendedorIdFromQuery);

            if (vendedorId !== null) {
                return {
                    clause: `${columnName} = $${paramIndex}`,
                    param: vendedorId,
                    newIndex: paramIndex + 1
                };
            }

            return {
                clause: null,
                param: null,
                newIndex: paramIndex
            };
        };

        return next();
    } catch (error) {
        console.error('[VendedorFilter] Erro ao verificar permissões:', error);
        return res.status(500).json({ error: 'Erro interno ao verificar permissões' });
    }
};

module.exports = {
    vendedorFilterMiddleware
};
