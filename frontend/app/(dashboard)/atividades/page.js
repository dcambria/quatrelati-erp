'use client'

// =====================================================
// Página de Histórico de Atividades e Erros
// v1.2.0 - Adicionado botão limpar logs
// =====================================================

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import {
    Activity,
    AlertTriangle,
    Filter,
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
    BarChart3,
    XCircle,
    AlertCircle,
    ShieldX,
    FileX,
    ServerCrash
} from 'lucide-react'
import api from '../../lib/api'

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
    login: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    logout: 'text-gray-600 bg-gray-100 dark:bg-gray-800',
    criar: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    atualizar: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
    excluir: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    atualizar_perfil: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    alterar_senha: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    redefinir_senha: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    entregar: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    reverter_entrega: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
    enviar_convite: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    reenviar_convite: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
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

// Mapeamento de ícones por tipo de erro
const errorTypeIcons = {
    validation: XCircle,
    authentication: ShieldX,
    authorization: ShieldX,
    not_found: FileX,
    server_error: ServerCrash,
    uncaught_error: AlertTriangle
}

// Mapeamento de cores por tipo de erro
const errorTypeColors = {
    validation: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
    authentication: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    authorization: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    not_found: 'text-gray-600 bg-gray-100 dark:bg-gray-800',
    server_error: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    uncaught_error: 'text-red-600 bg-red-100 dark:bg-red-900/30'
}

// Tradução de tipos de erro
const errorTypeLabels = {
    validation: 'Validação',
    authentication: 'Autenticação',
    authorization: 'Autorização',
    not_found: 'Não Encontrado',
    server_error: 'Erro do Servidor',
    uncaught_error: 'Erro Não Tratado'
}

export default function AtividadesPage() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const [activeTab, setActiveTab] = useState('activities') // 'activities' ou 'errors'

    // Estados para Activity Logs
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [filters, setFilters] = useState({
        user_id: '',
        action: '',
        entity: '',
        data_inicio: '',
        data_fim: ''
    })
    const [showFilters, setShowFilters] = useState(false)
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
    })
    const [usuarios, setUsuarios] = useState([])
    const [acoes, setAcoes] = useState([])
    const [entidades, setEntidades] = useState([])
    const [estatisticas, setEstatisticas] = useState(null)

    // Estados para Error Logs
    const [errorLogs, setErrorLogs] = useState([])
    const [errorLoading, setErrorLoading] = useState(true)
    const [errorError, setErrorError] = useState(null)
    const [errorFilters, setErrorFilters] = useState({
        user_id: '',
        error_type: '',
        endpoint: '',
        data_inicio: '',
        data_fim: ''
    })
    const [showErrorFilters, setShowErrorFilters] = useState(false)
    const [errorPagination, setErrorPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
    })
    const [errorTipos, setErrorTipos] = useState([])
    const [errorEstatisticas, setErrorEstatisticas] = useState(null)

    // Estado para modal de limpar
    const [showClearModal, setShowClearModal] = useState(false)
    const [clearDias, setClearDias] = useState(7)
    const [clearing, setClearing] = useState(false)
    const [clearResult, setClearResult] = useState(null)

    // Verificar permissão
    useEffect(() => {
        if (!authLoading && user?.nivel !== 'superadmin') {
            router.push('/dashboard')
        }
    }, [user, authLoading, router])

    // Buscar activity logs
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

            const response = await api.get(`/logs?${params.toString()}`)
            setLogs(response.data.logs)
            setPagination(prev => ({
                ...prev,
                total: response.data.pagination.total,
                totalPages: response.data.pagination.totalPages
            }))
        } catch (err) {
            setError(err.message || 'Erro ao carregar logs')
        } finally {
            setLoading(false)
        }
    }, [pagination.page, pagination.limit, filters])

    // Buscar error logs
    const fetchErrorLogs = useCallback(async () => {
        setErrorLoading(true)
        setErrorError(null)

        try {
            const params = new URLSearchParams()
            params.append('page', errorPagination.page)
            params.append('limit', errorPagination.limit)

            if (errorFilters.user_id) params.append('user_id', errorFilters.user_id)
            if (errorFilters.error_type) params.append('error_type', errorFilters.error_type)
            if (errorFilters.endpoint) params.append('endpoint', errorFilters.endpoint)
            if (errorFilters.data_inicio) params.append('data_inicio', errorFilters.data_inicio)
            if (errorFilters.data_fim) params.append('data_fim', errorFilters.data_fim)

            const response = await api.get(`/logs/errors?${params.toString()}`)
            setErrorLogs(response.data.errors)
            setErrorPagination(prev => ({
                ...prev,
                total: response.data.pagination.total,
                totalPages: response.data.pagination.totalPages
            }))
        } catch (err) {
            setErrorError(err.message || 'Erro ao carregar error logs')
        } finally {
            setErrorLoading(false)
        }
    }, [errorPagination.page, errorPagination.limit, errorFilters])

    // Buscar dados para filtros de atividades
    const fetchFilterData = useCallback(async () => {
        try {
            const [usuariosRes, acoesRes, entidadesRes, estatisticasRes] = await Promise.all([
                api.get('/logs/usuarios').catch(() => ({ data: { usuarios: [] } })),
                api.get('/logs/acoes').catch(() => ({ data: { acoes: [] } })),
                api.get('/logs/entidades').catch(() => ({ data: { entidades: [] } })),
                api.get('/logs/estatisticas?dias=30').catch(() => ({ data: null }))
            ])

            setUsuarios(usuariosRes.data.usuarios || [])
            setAcoes(acoesRes.data.acoes || [])
            setEntidades(entidadesRes.data.entidades || [])
            if (estatisticasRes.data) {
                setEstatisticas(estatisticasRes.data)
            }
        } catch (err) {
            console.error('Erro ao buscar dados de filtro:', err)
        }
    }, [])

    // Buscar dados para filtros de erros
    const fetchErrorFilterData = useCallback(async () => {
        try {
            const [tiposRes, estatisticasRes] = await Promise.all([
                api.get('/logs/errors/tipos').catch(() => ({ data: { tipos: [] } })),
                api.get('/logs/errors/estatisticas?dias=30').catch(() => ({ data: null }))
            ])

            setErrorTipos(tiposRes.data.tipos || [])
            if (estatisticasRes.data) {
                setErrorEstatisticas(estatisticasRes.data)
            }
        } catch (err) {
            console.error('Erro ao buscar dados de filtro de erros:', err)
        }
    }, [])

    // Limpar logs
    const handleClearLogs = async () => {
        setClearing(true)
        setClearResult(null)
        try {
            const endpoint = activeTab === 'activities'
                ? `/logs/clear?dias=${clearDias}`
                : `/logs/errors/clear?dias=${clearDias}`

            const response = await api.delete(endpoint)

            // Recarregar dados
            if (activeTab === 'activities') {
                fetchLogs()
                fetchFilterData()
            } else {
                fetchErrorLogs()
                fetchErrorFilterData()
            }

            setClearResult({ success: true, message: `${response.data.deletados} registros removidos` })

            // Fechar modal após 2 segundos
            setTimeout(() => {
                setShowClearModal(false)
                setClearResult(null)
            }, 2000)
        } catch (err) {
            setClearResult({ success: false, message: err.message || 'Erro ao limpar logs' })
        } finally {
            setClearing(false)
        }
    }

    // Fechar modal e limpar resultado
    const closeClearModal = () => {
        setShowClearModal(false)
        setClearResult(null)
    }

    useEffect(() => {
        if (user?.nivel === 'superadmin') {
            if (activeTab === 'activities') {
                fetchLogs()
                fetchFilterData()
            } else {
                fetchErrorLogs()
                fetchErrorFilterData()
            }
        }
    }, [user, activeTab, fetchLogs, fetchFilterData, fetchErrorLogs, fetchErrorFilterData])

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

    // Renderizar ícone da ação
    const renderActionIcon = (action) => {
        const Icon = actionIcons[action] || Activity
        const colorClass = actionColors[action] || 'text-gray-600 bg-gray-100 dark:bg-gray-800'
        return (
            <div className={`p-2 rounded-full ${colorClass}`}>
                <Icon className="w-4 h-4" />
            </div>
        )
    }

    // Renderizar ícone do erro
    const renderErrorIcon = (errorType) => {
        const Icon = errorTypeIcons[errorType] || AlertCircle
        const colorClass = errorTypeColors[errorType] || 'text-red-600 bg-red-100 dark:bg-red-900/30'
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
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Activity className="w-8 h-8 text-quatrelati-gold-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Histórico de Atividades</h1>
                        <p className="text-gray-500 dark:text-gray-400">Visualize todas as ações e erros do sistema</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowClearModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Limpar
                    </button>
                    <button
                        onClick={() => activeTab === 'activities' ? setShowFilters(!showFilters) : setShowErrorFilters(!showErrorFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${(activeTab === 'activities' ? showFilters : showErrorFilters) ? 'bg-quatrelati-gold-50 border-quatrelati-gold-500 text-quatrelati-gold-700 dark:bg-quatrelati-gold-900/20 dark:text-quatrelati-gold-400' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <Filter className="w-4 h-4" />
                        Filtros
                    </button>
                    <button
                        onClick={() => activeTab === 'activities' ? fetchLogs() : fetchErrorLogs()}
                        className="flex items-center gap-2 px-4 py-2 bg-quatrelati-gold-500 text-white rounded-lg hover:bg-quatrelati-gold-600 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${(activeTab === 'activities' ? loading : errorLoading) ? 'animate-spin' : ''}`} />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex gap-4">
                    <button
                        onClick={() => setActiveTab('activities')}
                        className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'activities' ? 'border-quatrelati-gold-500 text-quatrelati-gold-600 dark:text-quatrelati-gold-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}`}
                    >
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Atividades
                            {estatisticas && (
                                <span className="bg-quatrelati-gold-100 dark:bg-quatrelati-gold-900/30 text-quatrelati-gold-600 dark:text-quatrelati-gold-400 px-2 py-0.5 rounded-full text-xs">
                                    {estatisticas.total}
                                </span>
                            )}
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('errors')}
                        className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'errors' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}`}
                    >
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Erros
                            {errorEstatisticas && errorEstatisticas.total > 0 && (
                                <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full text-xs">
                                    {errorEstatisticas.total}
                                </span>
                            )}
                        </div>
                    </button>
                </nav>
            </div>

            {/* Conteúdo baseado na aba ativa */}
            {activeTab === 'activities' ? (
                <>
                    {/* Estatísticas de Atividades */}
                    {estatisticas && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-quatrelati-gold-100 dark:bg-quatrelati-gold-900/30 rounded-lg">
                                        <BarChart3 className="w-5 h-5 text-quatrelati-gold-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Ações (30 dias)</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{estatisticas.total}</p>
                                    </div>
                                </div>
                            </div>
                            {estatisticas.porUsuario.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                            <User className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{item.user_nome || 'Desconhecido'}</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{item.total}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Filtros de Atividades */}
                    {showFilters && (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuário</label>
                                    <select
                                        value={filters.user_id}
                                        onChange={(e) => setFilters(prev => ({ ...prev, user_id: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-quatrelati-gold-500 focus:border-quatrelati-gold-500"
                                    >
                                        <option value="">Todos</option>
                                        {usuarios.map((u) => (
                                            <option key={u.user_id} value={u.user_id}>{u.user_nome}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ação</label>
                                    <select
                                        value={filters.action}
                                        onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-quatrelati-gold-500 focus:border-quatrelati-gold-500"
                                    >
                                        <option value="">Todas</option>
                                        {acoes.map((a) => (
                                            <option key={a} value={a}>{actionLabels[a] || a}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entidade</label>
                                    <select
                                        value={filters.entity}
                                        onChange={(e) => setFilters(prev => ({ ...prev, entity: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-quatrelati-gold-500 focus:border-quatrelati-gold-500"
                                    >
                                        <option value="">Todas</option>
                                        {entidades.map((e) => (
                                            <option key={e} value={e}>{entityLabels[e] || e}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Início</label>
                                    <input
                                        type="date"
                                        value={filters.data_inicio}
                                        onChange={(e) => setFilters(prev => ({ ...prev, data_inicio: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-quatrelati-gold-500 focus:border-quatrelati-gold-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Fim</label>
                                    <input
                                        type="date"
                                        value={filters.data_fim}
                                        onChange={(e) => setFilters(prev => ({ ...prev, data_fim: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-quatrelati-gold-500 focus:border-quatrelati-gold-500"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={() => {
                                        setFilters({ user_id: '', action: '', entity: '', data_inicio: '', data_fim: '' })
                                        setPagination(prev => ({ ...prev, page: 1 }))
                                    }}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Limpar
                                </button>
                                <button
                                    onClick={() => { setPagination(prev => ({ ...prev, page: 1 })); fetchLogs() }}
                                    className="px-4 py-2 bg-quatrelati-gold-500 text-white rounded-lg hover:bg-quatrelati-gold-600 transition-colors"
                                >
                                    Aplicar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Tabela de Atividades */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ação</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usuário</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Entidade</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Detalhes</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP / Dispositivo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data/Hora</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center">
                                                <RefreshCw className="w-8 h-8 animate-spin text-quatrelati-gold-500 mx-auto" />
                                                <p className="mt-2 text-gray-500 dark:text-gray-400">Carregando...</p>
                                            </td>
                                        </tr>
                                    ) : logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                <Activity className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                                                Nenhuma atividade encontrada
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => {
                                            const EntityIcon = entityIcons[log.entity] || Activity
                                            return (
                                                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            {renderActionIcon(log.action)}
                                                            <span className="font-medium text-gray-900 dark:text-white">
                                                                {actionLabels[log.action] || log.action}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <User className="w-4 h-4 text-gray-400" />
                                                            <div>
                                                                <p className="font-medium text-gray-900 dark:text-white">{log.user_nome || '-'}</p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">{log.user_nivel}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <EntityIcon className="w-4 h-4 text-gray-400" />
                                                            <div>
                                                                <p className="font-medium text-gray-900 dark:text-white">
                                                                    {entityLabels[log.entity] || log.entity || '-'}
                                                                </p>
                                                                {log.entity_name && (
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                                                                        {log.entity_name}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {log.entity_id && (
                                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                                ID: {log.entity_id}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <Monitor className="w-4 h-4 text-gray-400" />
                                                            <div>
                                                                <p className="text-sm text-gray-900 dark:text-white">{log.ip_address || '-'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="w-4 h-4 text-gray-400" />
                                                            <span className="text-sm text-gray-600 dark:text-gray-400">
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

                        {/* Paginação de Atividades */}
                        {pagination.totalPages > 1 && (
                            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} registros
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                        disabled={pagination.page === 1}
                                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <span className="px-3 py-1 text-gray-700 dark:text-gray-300">
                                        {pagination.page} / {pagination.totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                        disabled={pagination.page === pagination.totalPages}
                                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <>
                    {/* Estatísticas de Erros */}
                    {errorEstatisticas && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                        <AlertTriangle className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Erros (30 dias)</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{errorEstatisticas.total}</p>
                                    </div>
                                </div>
                            </div>
                            {errorEstatisticas.porTipo.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        {renderErrorIcon(item.error_type)}
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{errorTypeLabels[item.error_type] || item.error_type}</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{item.total}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Filtros de Erros */}
                    {showErrorFilters && (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Erro</label>
                                    <select
                                        value={errorFilters.error_type}
                                        onChange={(e) => setErrorFilters(prev => ({ ...prev, error_type: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    >
                                        <option value="">Todos</option>
                                        {errorTipos.map((t) => (
                                            <option key={t} value={t}>{errorTypeLabels[t] || t}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endpoint</label>
                                    <input
                                        type="text"
                                        placeholder="/api/..."
                                        value={errorFilters.endpoint}
                                        onChange={(e) => setErrorFilters(prev => ({ ...prev, endpoint: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuário</label>
                                    <select
                                        value={errorFilters.user_id}
                                        onChange={(e) => setErrorFilters(prev => ({ ...prev, user_id: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    >
                                        <option value="">Todos</option>
                                        {usuarios.map((u) => (
                                            <option key={u.user_id} value={u.user_id}>{u.user_nome}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Início</label>
                                    <input
                                        type="date"
                                        value={errorFilters.data_inicio}
                                        onChange={(e) => setErrorFilters(prev => ({ ...prev, data_inicio: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Fim</label>
                                    <input
                                        type="date"
                                        value={errorFilters.data_fim}
                                        onChange={(e) => setErrorFilters(prev => ({ ...prev, data_fim: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={() => {
                                        setErrorFilters({ user_id: '', error_type: '', endpoint: '', data_inicio: '', data_fim: '' })
                                        setErrorPagination(prev => ({ ...prev, page: 1 }))
                                    }}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Limpar
                                </button>
                                <button
                                    onClick={() => { setErrorPagination(prev => ({ ...prev, page: 1 })); fetchErrorLogs() }}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                >
                                    Aplicar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {errorError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                            {errorError}
                        </div>
                    )}

                    {/* Tabela de Erros */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mensagem</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Endpoint</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usuário</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data/Hora</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {errorLoading ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center">
                                                <RefreshCw className="w-8 h-8 animate-spin text-red-500 mx-auto" />
                                                <p className="mt-2 text-gray-500 dark:text-gray-400">Carregando...</p>
                                            </td>
                                        </tr>
                                    ) : errorLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                <AlertTriangle className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                                                Nenhum erro encontrado
                                            </td>
                                        </tr>
                                    ) : (
                                        errorLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        {renderErrorIcon(log.error_type)}
                                                        <span className="font-medium text-gray-900 dark:text-white">
                                                            {errorTypeLabels[log.error_type] || log.error_type}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm text-gray-900 dark:text-white font-medium">{log.error_message}</p>
                                                    {log.validation_errors && Array.isArray(log.validation_errors) && (
                                                        <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                                                            {log.validation_errors.map((e, i) => (
                                                                <span key={i} className="block">{e.field}: {e.message}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                                                        {log.method} {log.endpoint}
                                                    </code>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-gray-400" />
                                                        <span className="text-sm text-gray-900 dark:text-white">{log.user_nome || 'Anônimo'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">{log.ip_address || '-'}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-gray-400" />
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                                            {formatDate(log.created_at)}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginação de Erros */}
                        {errorPagination.totalPages > 1 && (
                            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Mostrando {((errorPagination.page - 1) * errorPagination.limit) + 1} a {Math.min(errorPagination.page * errorPagination.limit, errorPagination.total)} de {errorPagination.total} registros
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setErrorPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                        disabled={errorPagination.page === 1}
                                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <span className="px-3 py-1 text-gray-700 dark:text-gray-300">
                                        {errorPagination.page} / {errorPagination.totalPages}
                                    </span>
                                    <button
                                        onClick={() => setErrorPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                        disabled={errorPagination.page === errorPagination.totalPages}
                                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Modal de Limpar Logs */}
            {showClearModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Limpar {activeTab === 'activities' ? 'Atividades' : 'Erros'}
                        </h3>

                        {/* Mensagem de resultado */}
                        {clearResult && (
                            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${clearResult.success ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                                {clearResult.success ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <XCircle className="w-5 h-5" />
                                )}
                                {clearResult.message}
                            </div>
                        )}

                        {!clearResult && (
                            <>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    Escolha quantos dias de histórico deseja manter:
                                </p>
                                <div className="space-y-3 mb-6">
                                    {[
                                        { value: 30, label: 'Manter últimos 30 dias' },
                                        { value: 7, label: 'Manter últimos 7 dias' },
                                        { value: 1, label: 'Manter apenas hoje' },
                                        { value: 0, label: 'Limpar todos os registros' }
                                    ].map((option) => (
                                        <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="clearDias"
                                                value={option.value}
                                                checked={clearDias === option.value}
                                                onChange={(e) => setClearDias(parseInt(e.target.value))}
                                                className="w-4 h-4 text-quatrelati-gold-500 focus:ring-quatrelati-gold-500"
                                            />
                                            <span className={`text-sm ${clearDias === option.value ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                                                {option.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={closeClearModal}
                                disabled={clearing}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                {clearResult ? 'Fechar' : 'Cancelar'}
                            </button>
                            {!clearResult && (
                                <button
                                    onClick={handleClearLogs}
                                    disabled={clearing}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {clearing ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                    {clearing ? 'Limpando...' : 'Limpar'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
