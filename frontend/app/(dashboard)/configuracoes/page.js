'use client';
// =====================================================
// Pagina de Configuracoes - Export/Import
// v2.0.0 - Design moderno com layout reorganizado
// =====================================================

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
    Settings,
    Download,
    Upload,
    Users,
    Package,
    ShoppingCart,
    Database,
    FileJson,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    Filter,
    ArrowDownToLine,
    ArrowUpFromLine,
    Info,
    Loader2,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/layout/Header';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

// =====================================================
// Configuracoes dos cards de export
// =====================================================
const EXPORT_ITEMS = [
    {
        tipo: 'clientes',
        icon: Users,
        title: 'Clientes',
        description: 'Cadastro completo de clientes',
        color: 'blue',
    },
    {
        tipo: 'produtos',
        icon: Package,
        title: 'Produtos',
        description: 'Catalogo de produtos',
        color: 'emerald',
    },
    {
        tipo: 'pedidos',
        icon: ShoppingCart,
        title: 'Pedidos',
        description: 'Historico de pedidos',
        color: 'amber',
    },
    {
        tipo: 'completo',
        icon: Database,
        title: 'Backup Completo',
        description: 'Todos os dados',
        color: 'purple',
        highlight: true,
    },
];

const IMPORT_ITEMS = [
    {
        tipo: 'clientes',
        icon: Users,
        title: 'Clientes',
        description: 'Importar cadastro de clientes',
        color: 'blue',
    },
    {
        tipo: 'produtos',
        icon: Package,
        title: 'Produtos',
        description: 'Importar catalogo de produtos',
        color: 'emerald',
    },
];

const COLOR_CLASSES = {
    blue: {
        bg: 'bg-blue-500/10',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-500/20',
        hover: 'hover:bg-blue-500/20',
    },
    emerald: {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-500/20',
        hover: 'hover:bg-emerald-500/20',
    },
    amber: {
        bg: 'bg-amber-500/10',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-500/20',
        hover: 'hover:bg-amber-500/20',
    },
    purple: {
        bg: 'bg-purple-500/10',
        text: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-500/20',
        hover: 'hover:bg-purple-500/20',
    },
};

// =====================================================
// Componentes
// =====================================================

function ExportCard({ item, loading, onExport }) {
    const colors = COLOR_CLASSES[item.color];
    const Icon = item.icon;
    const isLoading = loading === item.tipo;

    return (
        <button
            onClick={() => onExport(item.tipo)}
            disabled={isLoading}
            className={`
                group relative p-5 rounded-xl border-2 transition-all duration-200
                ${colors.bg} ${colors.border} ${colors.hover}
                ${item.highlight ? 'ring-2 ring-purple-500/30' : ''}
                disabled:opacity-70 disabled:cursor-not-allowed
                text-left w-full
            `}
        >
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${colors.bg} ${colors.text}`}>
                    {isLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                        <Icon className="w-6 h-6" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold ${colors.text}`}>
                        {item.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.description}
                    </p>
                </div>
                <ArrowDownToLine className={`w-5 h-5 ${colors.text} opacity-50 group-hover:opacity-100 transition-opacity`} />
            </div>
            {item.highlight && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-purple-500 text-white text-xs font-medium rounded-full">
                    Recomendado
                </div>
            )}
        </button>
    );
}

function ImportCard({ item, loading, onImport }) {
    const colors = COLOR_CLASSES[item.color];
    const Icon = item.icon;
    const isLoading = loading === item.tipo;

    return (
        <button
            onClick={() => onImport(item.tipo)}
            disabled={isLoading}
            className={`
                group relative p-5 rounded-xl border-2 border-dashed transition-all duration-200
                bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600
                hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800
                disabled:opacity-70 disabled:cursor-not-allowed
                text-left w-full
            `}
        >
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${colors.bg} ${colors.text}`}>
                    {isLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                        <Icon className="w-6 h-6" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                        {item.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.description}
                    </p>
                </div>
                <ArrowUpFromLine className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            </div>
        </button>
    );
}

// =====================================================
// Pagina Principal
// =====================================================

export default function ConfiguracoesPage() {
    const { user } = useAuth();
    const [exportando, setExportando] = useState(null);
    const [importando, setImportando] = useState(null);
    const [apenasAtivos, setApenasAtivos] = useState(false);
    const [modoImportacao, setModoImportacao] = useState('adicionar');
    const [resultadoImportacao, setResultadoImportacao] = useState(null);
    const [filtrosPedidos, setFiltrosPedidos] = useState({
        data_inicio: '',
        data_fim: '',
        status: '',
    });

    // Verificar se e superadmin
    if (user?.nivel !== 'superadmin') {
        return (
            <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
                <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Acesso Restrito
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                    Apenas superadmins podem acessar esta pagina.
                </p>
            </div>
        );
    }

    // Handler de exportacao
    const handleExportar = async (tipo) => {
        setExportando(tipo);
        try {
            const params = new URLSearchParams();

            if ((tipo === 'clientes' || tipo === 'produtos') && apenasAtivos) {
                params.append('ativos_apenas', 'true');
            }

            if (tipo === 'pedidos') {
                if (filtrosPedidos.data_inicio) params.append('data_inicio', filtrosPedidos.data_inicio);
                if (filtrosPedidos.data_fim) params.append('data_fim', filtrosPedidos.data_fim);
                if (filtrosPedidos.status) params.append('status', filtrosPedidos.status);
            }

            const url = `/configuracoes/exportar/${tipo}${params.toString() ? '?' + params : ''}`;
            const response = await api.get(url);

            // Criar blob e fazer download
            const jsonString = JSON.stringify(response.data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${tipo}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

            // Calcular total de registros baseado no tipo de exportacao
            let total = 0;
            if (tipo === 'completo') {
                // Backup completo tem estrutura diferente
                const cTotal = response.data.clientes?.total || 0;
                const pTotal = response.data.produtos?.total || 0;
                const pedTotal = response.data.pedidos?.total || 0;
                total = cTotal + pTotal + pedTotal;
                console.log('[DEBUG] Backup completo:', { cTotal, pTotal, pedTotal, total, data: response.data });
            } else {
                total = response.data.total_registros || response.data.dados?.length || 0;
            }
            toast.success(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} exportado! (${total} registros)`);
        } catch (error) {
            console.error('Erro ao exportar:', error);
            toast.error(error.message || `Erro ao exportar ${tipo}`);
        } finally {
            setExportando(null);
        }
    };

    // Handler de importacao
    const handleImportar = async (tipo, arquivo) => {
        setImportando(tipo);
        setResultadoImportacao(null);

        try {
            const formData = new FormData();
            formData.append('arquivo', arquivo);
            formData.append('modo', modoImportacao);

            const response = await api.post(`/configuracoes/importar/${tipo}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setResultadoImportacao({ tipo, ...response.data });
            toast.success(response.data.message);
        } catch (error) {
            console.error('Erro ao importar:', error);
            toast.error(error.message || `Erro ao importar ${tipo}`);
            setResultadoImportacao({ tipo, erro: error.message });
        } finally {
            setImportando(null);
        }
    };

    // Seletor de arquivo
    const handleFileSelect = (tipo) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = (e) => {
            const file = e.target.files?.[0];
            if (file) handleImportar(tipo, file);
        };
        input.click();
    };

    return (
        <div className="p-6 space-y-8 max-w-5xl mx-auto">
            <Header
                title="Configuracoes"
                subtitle="Gerencie exportacao e importacao de dados do sistema"
                icon={Settings}
            />

            {/* ===== SECAO DE EXPORTACAO ===== */}
            <section className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-quatrelati-gold-100 dark:bg-quatrelati-gold-900/30 rounded-lg">
                        <Download className="w-5 h-5 text-quatrelati-gold-600 dark:text-quatrelati-gold-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            Exportar Dados
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Clique para baixar os dados em formato JSON
                        </p>
                    </div>
                </div>

                {/* Grid de cards de exportacao */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {EXPORT_ITEMS.map((item) => (
                        <ExportCard
                            key={item.tipo}
                            item={item}
                            loading={exportando}
                            onExport={handleExportar}
                        />
                    ))}
                </div>

                {/* Opcoes de exportacao */}
                <Card className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <h3 className="font-medium text-gray-900 dark:text-white">
                            Opcoes de Exportacao
                        </h3>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Filtro de ativos */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={apenasAtivos}
                                    onChange={(e) => setApenasAtivos(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 text-quatrelati-gold-600 focus:ring-quatrelati-gold-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                    Exportar apenas registros ativos
                                </span>
                            </label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                                Aplica-se a Clientes e Produtos
                            </p>
                        </div>

                        {/* Filtros de pedidos */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <Calendar className="w-4 h-4" />
                                Filtros para Pedidos
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        Data Inicio
                                    </label>
                                    <input
                                        type="date"
                                        value={filtrosPedidos.data_inicio}
                                        onChange={(e) => setFiltrosPedidos(prev => ({ ...prev, data_inicio: e.target.value }))}
                                        className="input-glass text-sm w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        Data Fim
                                    </label>
                                    <input
                                        type="date"
                                        value={filtrosPedidos.data_fim}
                                        onChange={(e) => setFiltrosPedidos(prev => ({ ...prev, data_fim: e.target.value }))}
                                        className="input-glass text-sm w-full"
                                    />
                                </div>
                            </div>
                            <select
                                value={filtrosPedidos.status}
                                onChange={(e) => setFiltrosPedidos(prev => ({ ...prev, status: e.target.value }))}
                                className="input-glass text-sm w-full"
                            >
                                <option value="">Todos os status</option>
                                <option value="pendente">Pendente</option>
                                <option value="em_preparacao">Em preparacao</option>
                                <option value="pronto">Pronto</option>
                                <option value="entregue">Entregue</option>
                                <option value="cancelado">Cancelado</option>
                            </select>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Divisor */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-cream-50 dark:bg-gray-900 px-4 text-sm text-gray-500">
                        ou
                    </span>
                </div>
            </div>

            {/* ===== SECAO DE IMPORTACAO ===== */}
            <section className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-quatrelati-blue-100 dark:bg-quatrelati-blue-900/30 rounded-lg">
                        <Upload className="w-5 h-5 text-quatrelati-blue-600 dark:text-quatrelati-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            Importar Dados
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Restaure dados a partir de arquivos JSON
                        </p>
                    </div>
                </div>

                {/* Modo de importacao */}
                <div className="flex flex-wrap gap-3">
                    <label className={`
                        flex items-center gap-2 px-4 py-2.5 rounded-lg cursor-pointer transition-all
                        ${modoImportacao === 'adicionar'
                            ? 'bg-quatrelati-blue-100 dark:bg-quatrelati-blue-900/30 border-2 border-quatrelati-blue-500'
                            : 'bg-gray-100 dark:bg-gray-800 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                        }
                    `}>
                        <input
                            type="radio"
                            name="modo"
                            value="adicionar"
                            checked={modoImportacao === 'adicionar'}
                            onChange={(e) => setModoImportacao(e.target.value)}
                            className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                            ${modoImportacao === 'adicionar' ? 'border-quatrelati-blue-500' : 'border-gray-400'}`}>
                            {modoImportacao === 'adicionar' && (
                                <div className="w-2 h-2 rounded-full bg-quatrelati-blue-500" />
                            )}
                        </div>
                        <span className={`text-sm font-medium ${modoImportacao === 'adicionar' ? 'text-quatrelati-blue-700 dark:text-quatrelati-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                            Adicionar/Atualizar
                        </span>
                    </label>

                    <label className={`
                        flex items-center gap-2 px-4 py-2.5 rounded-lg cursor-pointer transition-all
                        ${modoImportacao === 'substituir'
                            ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500'
                            : 'bg-gray-100 dark:bg-gray-800 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                        }
                    `}>
                        <input
                            type="radio"
                            name="modo"
                            value="substituir"
                            checked={modoImportacao === 'substituir'}
                            onChange={(e) => setModoImportacao(e.target.value)}
                            className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                            ${modoImportacao === 'substituir' ? 'border-red-500' : 'border-gray-400'}`}>
                            {modoImportacao === 'substituir' && (
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                            )}
                        </div>
                        <span className={`text-sm font-medium ${modoImportacao === 'substituir' ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>
                            Substituir tudo
                        </span>
                    </label>
                </div>

                {modoImportacao === 'substituir' && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <p className="text-sm text-red-700 dark:text-red-300">
                            Este modo remove todos os registros existentes. So funciona se nao houver pedidos vinculados.
                        </p>
                    </div>
                )}

                {/* Grid de cards de importacao */}
                <div className="grid sm:grid-cols-2 gap-4">
                    {IMPORT_ITEMS.map((item) => (
                        <ImportCard
                            key={item.tipo}
                            item={item}
                            loading={importando}
                            onImport={handleFileSelect}
                        />
                    ))}
                </div>

                {/* Resultado da importacao */}
                {resultadoImportacao && (
                    <Card className={`p-4 border-2 ${resultadoImportacao.erro
                        ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                        : 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                    }`}>
                        <div className="flex items-start gap-3">
                            {resultadoImportacao.erro ? (
                                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                            ) : (
                                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                                <h4 className={`font-semibold ${resultadoImportacao.erro ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                                    {resultadoImportacao.erro ? 'Erro na Importacao' : 'Importacao Concluida'}
                                </h4>
                                {resultadoImportacao.erro ? (
                                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                        {resultadoImportacao.erro}
                                    </p>
                                ) : (
                                    <div className="mt-2 space-y-1">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            <span className="font-medium text-green-600">{resultadoImportacao.importados}</span> novos registros
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            <span className="font-medium text-blue-600">{resultadoImportacao.atualizados}</span> atualizados
                                        </p>
                                        {resultadoImportacao.erros?.length > 0 && (
                                            <details className="mt-2">
                                                <summary className="text-sm text-amber-600 cursor-pointer">
                                                    {resultadoImportacao.erros.length} erros
                                                </summary>
                                                <ul className="mt-1 text-xs text-gray-500 space-y-0.5 max-h-24 overflow-y-auto">
                                                    {resultadoImportacao.erros.map((err, idx) => (
                                                        <li key={idx}>{err.cliente || err.produto}: {err.erro}</li>
                                                    ))}
                                                </ul>
                                            </details>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                )}
            </section>

            {/* Info box */}
            <Card className="p-4 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <p><strong>Formatos:</strong> Os arquivos sao exportados em JSON e podem ser editados manualmente.</p>
                        <p><strong>Identificacao:</strong> Clientes sao identificados por CNPJ/CPF, produtos pelo nome.</p>
                        <p><strong>Restricao:</strong> Pedidos nao podem ser importados para evitar inconsistencias.</p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
