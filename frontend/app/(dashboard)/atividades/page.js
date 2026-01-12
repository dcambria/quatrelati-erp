'use client'

// =====================================================
// Página de Histórico de Atividades
// v1.0.0 - Visualização de logs de atividade
// =====================================================

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import {
    Activity,
    Search,
    Filter,
    Calendar,
    User,
    Clock,
    Monitor,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    LogIn,
    LogOut,
    Plus,
    Edit,
    Trash2,
    Package,
    Users,
    ShoppingCart,
    Settings,
    BarChart3
} from 'lucide-react'

// Mapeamento de ícones por ação
const actionIcons = {
    login: LogIn,
    logout: LogOut,
    criar: Plus,
    atualizar: Edit,
    excluir: Trash2,
    atualizar_perfil: User,
    alterar_senha: Settings,
    redefinir_senha: Settings,
    entregar: Package,
    reverter_entrega: Package,
    enviar_convite: Users,
    reenviar_convite: Users
}

// Mapeamento de cores por ação
const actionColors = {
    login: 'text-green-600 bg-green-100',
    logout: 'text-gray-600 bg-gray-100',
    criar: 'text-blue-600 bg-blue-100',
    atualizar: 'text-yellow-600 bg-yellow-100',
    excluir: 'text-red-600 bg-red-100',
    atualizar_perfil: 'text-purple-600 bg-purple-100',
    alterar_senha: 'text-orange-600 bg-orange-100',
    redefinir_senha: 'text-orange-600 bg-orange-100',
    entregar: 'text-green-600 bg-green-100',
    reverter_entrega: 'text-yellow-600 bg-yellow-100',
    enviar_convite: 'text-blue-600 bg-blue-100',
    reenviar_convite: 'text-blue-600 bg-blue-100'
}

// Mapeamento de ícones por entidade
const entityIcons = {
    pedido: ShoppingCart,
    cliente: Users,
    produto: Package,
    usuario: User,
    auth: LogIn
}

// Tradução de ações
const actionLabels = {
    login: 'Login',
    logout: 'Logout',
    criar: 'Criação',
    atualizar: 'Atualização',
    excluir: 'Exclusão',
    atualizar_perfil: 'Atualização de Perfil',
    alterar_senha: 'Alteração de Senha',
    redefinir_senha: 'Redefinição de Senha',
    entregar: 'Entrega',
    reverter_entrega: 'Reversão de Entrega',
    enviar_convite: 'Envio de Convite',
    reenviar_convite: 'Reenvio de Convite'
}

// Tradução de entidades
const entityLabels = {
    pedido: 'Pedido',
    cliente: 'Cliente',
    produto: 'Produto',
    usuario: 'Usuário',
    auth: 'Autenticação'
}

export default function AtividadesPage() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Filtros
    const [filters, setFilters] = useState({
        user_id: '',
        action: '',
        entity: '',
        data_inicio: '',
        data_fim: ''
    })
    const [showFilters, setShowFilters] = useState(false)

    // Paginação
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
    })

    // Dados para filtros
    const [usuarios, setUsuarios] = useState([])
    const [acoes, setAcoes] = useState([])
    const [entidades, setEntidades] = useState([])
    const [estatisticas, setEstatisticas] = useState(null)

    // Verificar permissão
    useEffect(() => {
        if (!authLoading && user?.nivel !== 'superadmin') {
            router.push('/dashboard')
        }
    }, [user, authLoading, router])

    // Buscar logs
    const fetchLogs = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const params = new URLSearchParams()
            params.append('page', pagination.page)
            params.append('limit', pagination.limit)

            if (filters.user_id) params.append('user_id', filters.user_id)
            if (filters.action) params.append('action', filters.action)
            if (filters.entity) params.append('entity', filters.entity)
            if (filters.data_inicio) params.append('data_inicio', filters.data_inicio)
            if (filters.data_fim) params.append('data_fim', filters.data_fim)

            const response = await fetch(`/api/logs?${params.toString()}`)
            if (!response.ok) throw new Error('Erro ao carregar logs')

            const data = await response.json()
            setLogs(data.logs)
            setPagination(prev => ({
                ...prev,
                total: data.pagination.total,
                totalPages: data.pagination.totalPages
            }))
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [pagination.page, pagination.limit, filters])

    // Buscar dados para filtros
    const fetchFilterData = useCallback(async () => {
        try {
            const [usuariosRes, acoesRes, entidadesRes, estatisticasRes] = await Promise.all([
                fetch('/api/logs/usuarios'),
                fetch('/api/logs/acoes'),
                fetch('/api/logs/entidades'),
                fetch('/api/logs/estatisticas?dias=30')
            ])

            if (usuariosRes.ok) {
                const data = await usuariosRes.json()
                setUsuarios(data.usuarios)
            }
            if (acoesRes.ok) {
                const data = await acoesRes.json()
                setAcoes(data.acoes)
            }
            if (entidadesRes.ok) {
                const data = await entidadesRes.json()
                setEntidades(data.entidades)
            }
            if (estatisticasRes.ok) {
                const data = await estatisticasRes.json()
                setEstatisticas(data)
            }
        } catch (err) {
            console.error('Erro ao buscar dados de filtro:', err)
        }
    }, [])

    useEffect(() => {
        if (user?.nivel === 'superadmin') {
            fetchLogs()
            fetchFilterData()
        }
    }, [user, fetchLogs, fetchFilterData])

    // Formatar data
    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Aplicar filtros
    const handleApplyFilters = () => {
        setPagination(prev => ({ ...prev, page: 1 }))
        fetchLogs()
    }

    // Limpar filtros
    const handleClearFilters = () => {
        setFilters({
            user_id: '',
            action: '',
            entity: '',
            data_inicio: '',
            data_fim: ''
        })
        setPagination(prev => ({ ...prev, page: 1 }))
    }

    // Renderizar ícone da ação
    const renderActionIcon = (action) => {
        const Icon = actionIcons[action] || Activity
        const colorClass = actionColors[action] || 'text-gray-600 bg-gray-100'
        return (
            <div className={`p-2 rounded-full ${colorClass}`}>
                <Icon className="w-4 h-4" />
            </div>
        )
    }

    if (authLoading || user?.nivel !== 'superadmin') {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Activity className="w-8 h-8 text-blue-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Histórico de Atividades</h1>
                        <p className="text-gray-500">Visualize todas as ações realizadas no sistema</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${showFilters ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                        <Filter className="w-4 h-4" />
                        Filtros
                    </button>
                    <button
                        onClick={fetchLogs}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Estatísticas */}
            {estatisticas && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <BarChart3 className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Ações (30 dias)</p>
                                <p className="text-2xl font-bold text-gray-900">{estatisticas.total}</p>
                            </div>
                        </div>
                    </div>
                    {estatisticas.porUsuario.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-lg border shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <User className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 truncate">{item.user_nome || 'Desconhecido'}</p>
                                    <p className="text-2xl font-bold text-gray-900">{item.total}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filtros */}
            {showFilters && (
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
                            <select
                                value={filters.user_id}
                                onChange={(e) => setFilters(prev => ({ ...prev, user_id: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Todos</option>
                                {usuarios.map((u) => (
                                    <option key={u.user_id} value={u.user_id}>{u.user_nome}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ação</label>
                            <select
                                value={filters.action}
                                onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Todas</option>
                                {acoes.map((a) => (
                                    <option key={a} value={a}>{actionLabels[a] || a}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Entidade</label>
                            <select
                                value={filters.entity}
                                onChange={(e) => setFilters(prev => ({ ...prev, entity: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Todas</option>
                                {entidades.map((e) => (
                                    <option key={e} value={e}>{entityLabels[e] || e}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                            <input
                                type="date"
                                value={filters.data_inicio}
                                onChange={(e) => setFilters(prev => ({ ...prev, data_inicio: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                            <input
                                type="date"
                                value={filters.data_fim}
                                onChange={(e) => setFilters(prev => ({ ...prev, data_fim: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            onClick={handleClearFilters}
                            className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Limpar
                        </button>
                        <button
                            onClick={handleApplyFilters}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Aplicar
                        </button>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Tabela de Logs */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ação
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Usuário
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Entidade
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Detalhes
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    IP / Dispositivo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Data/Hora
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                                        <p className="mt-2 text-gray-500">Carregando...</p>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <Activity className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                        Nenhuma atividade encontrada
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => {
                                    const EntityIcon = entityIcons[log.entity] || Activity
                                    return (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    {renderActionIcon(log.action)}
                                                    <span className="font-medium text-gray-900">
                                                        {actionLabels[log.action] || log.action}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-gray-400" />
                                                    <div>
                                                        <p className="font-medium text-gray-900">{log.user_nome || '-'}</p>
                                                        <p className="text-xs text-gray-500">{log.user_nivel}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <EntityIcon className="w-4 h-4 text-gray-400" />
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {entityLabels[log.entity] || log.entity || '-'}
                                                        </p>
                                                        {log.entity_name && (
                                                            <p className="text-xs text-gray-500 truncate max-w-[150px]">
                                                                {log.entity_name}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {log.entity_id && (
                                                    <span className="text-sm text-gray-600">
                                                        ID: {log.entity_id}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Monitor className="w-4 h-4 text-gray-400" />
                                                    <div>
                                                        <p className="text-sm text-gray-900">{log.ip_address || '-'}</p>
                                                        {log.user_agent && (
                                                            <p className="text-xs text-gray-500 truncate max-w-[150px]" title={log.user_agent}>
                                                                {log.user_agent.includes('Mozilla') ? 'Browser' : log.user_agent.slice(0, 20)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm text-gray-600">
                                                        {formatDate(log.created_at)}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginação */}
                {pagination.totalPages > 1 && (
                    <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t">
                        <p className="text-sm text-gray-500">
                            Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} registros
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                disabled={pagination.page === 1}
                                className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="px-3 py-1 text-gray-700">
                                {pagination.page} / {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                disabled={pagination.page === pagination.totalPages}
                                className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
