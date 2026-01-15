'use client';

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
    AlertCircle,
    Check,
    Calendar,
    Filter,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/layout/Header';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

// Card de exportacao reutilizavel
function ExportCard({ icon: Icon, iconBg, title, description, tipo, loading, onExport }) {
    return (
        <Card className="p-4">
            <div className="flex items-start gap-3">
                <div className={`p-2 ${iconBg} rounded-lg`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{description}</p>
                    <Button
                        size="sm"
                        onClick={() => onExport(tipo)}
                        loading={loading}
                        className="w-full"
                    >
                        <FileJson className="w-4 h-4" />
                        Exportar JSON
                    </Button>
                </div>
            </div>
        </Card>
    );
}

// Card de importacao reutilizavel
function ImportCard({ icon: Icon, iconBg, title, description, tipo, loading, onImport }) {
    return (
        <Card className="p-4">
            <div className="flex items-start gap-3">
                <div className={`p-2 ${iconBg} rounded-lg`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{description}</p>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onImport(tipo)}
                        loading={loading}
                        className="w-full"
                    >
                        <Upload className="w-4 h-4" />
                        Selecionar Arquivo
                    </Button>
                </div>
            </div>
        </Card>
    );
}

export default function ConfiguracoesPage() {
    const { user } = useAuth();
    const [exportando, setExportando] = useState(null);
    const [importando, setImportando] = useState(null);
    const [filtrosPedidos, setFiltrosPedidos] = useState({ data_inicio: '', data_fim: '', status: '' });
    const [modoImportacao, setModoImportacao] = useState('adicionar');
    const [resultadoImportacao, setResultadoImportacao] = useState(null);
    const [apenasAtivos, setApenasAtivos] = useState(false);

    // Verificar se e superadmin
    if (user?.nivel !== 'superadmin') {
        return (
            <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Acesso Restrito</h2>
                <p className="text-gray-500 dark:text-gray-400">Apenas superadmins podem acessar esta pagina.</p>
            </div>
        );
    }

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
            const response = await api.get(url, { responseType: 'blob' });

            // Download do arquivo
            const blob = new Blob([response.data], { type: 'application/json' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;

            const contentDisposition = response.headers['content-disposition'];
            let filename = `${tipo}_${new Date().toISOString().split('T')[0]}.json`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename=(.+)/);
                if (match) filename = match[1].replace(/"/g, '');
            }

            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

            toast.success(`Exportacao de ${tipo} concluida!`);
        } catch (error) {
            console.error('Erro ao exportar:', error);
            toast.error(error.message || `Erro ao exportar ${tipo}`);
        } finally {
            setExportando(null);
        }
    };

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
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            <Header
                title="Configuracoes"
                subtitle="Gerencie exportacao e importacao de dados do sistema"
                icon={Settings}
            />

            {/* Exportacao */}
            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Download className="w-5 h-5 text-quatrelati-blue-500" />
                    Exportacao de Dados
                </h2>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ExportCard
                        icon={Users}
                        iconBg="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        title="Clientes"
                        description="Exportar cadastro de clientes"
                        tipo="clientes"
                        loading={exportando === 'clientes'}
                        onExport={handleExportar}
                    />
                    <ExportCard
                        icon={Package}
                        iconBg="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                        title="Produtos"
                        description="Exportar cadastro de produtos"
                        tipo="produtos"
                        loading={exportando === 'produtos'}
                        onExport={handleExportar}
                    />
                    <ExportCard
                        icon={ShoppingCart}
                        iconBg="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                        title="Pedidos"
                        description="Exportar pedidos com itens"
                        tipo="pedidos"
                        loading={exportando === 'pedidos'}
                        onExport={handleExportar}
                    />
                    <Card className="p-4 border-2 border-quatrelati-blue-200 dark:border-quatrelati-gold-900/50">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-quatrelati-blue-100 dark:bg-quatrelati-gold-900/30 rounded-lg">
                                <Database className="w-6 h-6 text-quatrelati-blue-600 dark:text-quatrelati-gold-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-900 dark:text-white">Backup Completo</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Todos os dados do sistema</p>
                                <Button
                                    size="sm"
                                    onClick={() => handleExportar('completo')}
                                    loading={exportando === 'completo'}
                                    className="w-full"
                                >
                                    <FileJson className="w-4 h-4" />
                                    Exportar JSON
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Filtros */}
                <Card className="p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Opcoes de Exportacao
                    </h4>

                    <div className="grid md:grid-cols-2 gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={apenasAtivos}
                                onChange={(e) => setApenasAtivos(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-quatrelati-blue-600 focus:ring-quatrelati-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                Exportar apenas registros ativos (clientes/produtos)
                            </span>
                        </label>

                        <div className="space-y-3">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Filtros para Pedidos
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Data Inicio</label>
                                    <input
                                        type="date"
                                        value={filtrosPedidos.data_inicio}
                                        onChange={(e) => setFiltrosPedidos(prev => ({ ...prev, data_inicio: e.target.value }))}
                                        className="input-glass text-sm w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Data Fim</label>
                                    <input
                                        type="date"
                                        value={filtrosPedidos.data_fim}
                                        onChange={(e) => setFiltrosPedidos(prev => ({ ...prev, data_fim: e.target.value }))}
                                        className="input-glass text-sm w-full"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
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
                    </div>
                </Card>
            </section>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* Importacao */}
            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Upload className="w-5 h-5 text-quatrelati-blue-500" />
                    Importacao de Dados
                </h2>

                <Card className="p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Modo de Importacao</h4>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="modo"
                                value="adicionar"
                                checked={modoImportacao === 'adicionar'}
                                onChange={(e) => setModoImportacao(e.target.value)}
                                className="w-4 h-4 text-quatrelati-blue-600 focus:ring-quatrelati-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                Adicionar/Atualizar registros existentes
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="modo"
                                value="substituir"
                                checked={modoImportacao === 'substituir'}
                                onChange={(e) => setModoImportacao(e.target.value)}
                                className="w-4 h-4 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                Substituir todos os dados (apenas sem pedidos)
                            </span>
                        </label>
                    </div>
                    {modoImportacao === 'substituir' && (
                        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Atencao: Este modo remove todos os registros existentes antes de importar.
                        </p>
                    )}
                </Card>

                <div className="grid md:grid-cols-2 gap-4">
                    <ImportCard
                        icon={Users}
                        iconBg="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        title="Importar Clientes"
                        description="Arquivo JSON exportado anteriormente"
                        tipo="clientes"
                        loading={importando === 'clientes'}
                        onImport={handleFileSelect}
                    />
                    <ImportCard
                        icon={Package}
                        iconBg="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                        title="Importar Produtos"
                        description="Arquivo JSON exportado anteriormente"
                        tipo="produtos"
                        loading={importando === 'produtos'}
                        onImport={handleFileSelect}
                    />
                </div>

                {/* Resultado da importacao */}
                {resultadoImportacao && (
                    <Card className={`p-4 ${resultadoImportacao.erro ? 'border-red-200 dark:border-red-900/50' : 'border-green-200 dark:border-green-900/50'}`}>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            {resultadoImportacao.erro ? (
                                <AlertCircle className="w-5 h-5 text-red-500" />
                            ) : (
                                <Check className="w-5 h-5 text-green-500" />
                            )}
                            Resultado da Importacao - {resultadoImportacao.tipo}
                        </h4>

                        {resultadoImportacao.erro ? (
                            <p className="text-sm text-red-600 dark:text-red-400">{resultadoImportacao.erro}</p>
                        ) : (
                            <div className="space-y-1 text-sm">
                                <p className="text-gray-600 dark:text-gray-400">
                                    Registros importados: <span className="font-medium text-green-600">{resultadoImportacao.importados}</span>
                                </p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Registros atualizados: <span className="font-medium text-blue-600">{resultadoImportacao.atualizados}</span>
                                </p>
                                {resultadoImportacao.erros?.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-amber-600 dark:text-amber-400 font-medium">
                                            Erros ({resultadoImportacao.erros.length}):
                                        </p>
                                        <ul className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-h-32 overflow-y-auto">
                                            {resultadoImportacao.erros.map((err, idx) => (
                                                <li key={idx}>{err.cliente || err.produto}: {err.erro}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                )}
            </section>

            {/* Info */}
            <Card className="p-4 bg-blue-50 dark:bg-gray-800 border-blue-200 dark:border-gray-700">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p className="font-medium text-gray-900 dark:text-white mb-1">Sobre Exportacao e Importacao</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Os arquivos exportados estao em formato JSON e podem ser editados manualmente.</li>
                            <li>Na importacao, clientes sao identificados pelo CNPJ/CPF e produtos pelo codigo.</li>
                            <li>O modo &quot;substituir&quot; so funciona se nao houver pedidos vinculados aos registros.</li>
                            <li>Pedidos nao podem ser importados para evitar inconsistencias.</li>
                        </ul>
                    </div>
                </div>
            </Card>
        </div>
    );
}
