'use client';

// =====================================================
// Página de Clientes
// v2.12.3 - Header colunas sem bordas laterais
// =====================================================

import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  User,
  Phone,
  Mail,
  MapPin,
  ShoppingCart,
  Upload,
  X,
  Image,
  Building2,
  UserCircle,
  LayoutGrid,
  List,
  FileText,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  DollarSign,
  Package,
  Map,
  Navigation,
  CheckSquare,
  Square,
  Power,
  LocateFixed,
  Loader2,
  Truck,
  Printer,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useVendedorFilter } from '../../contexts/VendedorFilterContext';
import api from '../../lib/api';
import { useCidadesIBGE } from '../../lib/useCidadesIBGE';
// Header não usado - header customizado inline no sticky
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Loading from '../../components/ui/Loading';
import Gravatar from '../../components/ui/Gravatar';
import { cnpjSchema, cepSchema, mascaraCNPJ, mascaraCEP, mascaraTelefone } from '../../lib/validations';

// Lazy load do mapa para melhor performance
const ClientesMap = lazy(() => import('../../components/ui/ClientesMap'));

// Cache de geocoding para proximidade
const GEOCODE_CACHE_KEY = 'quatrelati_geocode_cache';

// Calcula distância entre dois pontos (Haversine)
function calcularDistancia(lat1, lng1, lat2, lng2) {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Obtém coordenadas do cache de geocoding
function getClienteCoords(cidade, estado) {
  if (!cidade && !estado) return null;
  try {
    const cached = localStorage.getItem(GEOCODE_CACHE_KEY);
    if (cached) {
      const cache = JSON.parse(cached);
      const key = `${cidade || ''}_${estado || ''}`.toLowerCase().trim();
      if (cache[key]?.lat) {
        return { lat: cache[key].lat, lng: cache[key].lng };
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

const ESTADOS = [
  { value: 'AC', label: 'AC' }, { value: 'AL', label: 'AL' }, { value: 'AP', label: 'AP' },
  { value: 'AM', label: 'AM' }, { value: 'BA', label: 'BA' }, { value: 'CE', label: 'CE' },
  { value: 'DF', label: 'DF' }, { value: 'ES', label: 'ES' }, { value: 'GO', label: 'GO' },
  { value: 'MA', label: 'MA' }, { value: 'MT', label: 'MT' }, { value: 'MS', label: 'MS' },
  { value: 'MG', label: 'MG' }, { value: 'PA', label: 'PA' }, { value: 'PB', label: 'PB' },
  { value: 'PR', label: 'PR' }, { value: 'PE', label: 'PE' }, { value: 'PI', label: 'PI' },
  { value: 'RJ', label: 'RJ' }, { value: 'RN', label: 'RN' }, { value: 'RS', label: 'RS' },
  { value: 'RO', label: 'RO' }, { value: 'RR', label: 'RR' }, { value: 'SC', label: 'SC' },
  { value: 'SP', label: 'SP' }, { value: 'SE', label: 'SE' }, { value: 'TO', label: 'TO' },
];

const clienteSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  razao_social: z.string().optional(),
  cnpj_cpf: cnpjSchema,
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  // Endereço principal
  cep: cepSchema,
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  // Endereço de entrega
  cep_entrega: z.string().optional(),
  endereco_entrega: z.string().optional(),
  numero_entrega: z.string().optional(),
  complemento_entrega: z.string().optional(),
  cidade_entrega: z.string().optional(),
  estado_entrega: z.string().optional(),
  // Outros
  contato_nome: z.string().optional(),
  observacoes: z.string().optional(),
  vendedor_id: z.string().optional(),
});

export default function ClientesPage() {
  const searchParams = useSearchParams();
  const { canEdit, isAdmin, user } = useAuth();
  const { vendedorId } = useVendedorFilter();

  // Parâmetro de URL para abrir detalhes de cliente (vindo do dashboard)
  const urlDetalheId = searchParams.get('detalhe');

  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [search, setSearch] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('true');
  const [viewMode, setViewMode] = useState('list'); // 'cards' ou 'list'
  const [showMap, setShowMap] = useState(false); // toggle do mapa acima da lista
  const [focusClienteId, setFocusClienteId] = useState(null); // ID do cliente para focar no mapa
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [detailsModal, setDetailsModal] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [sortConfig, setSortConfig] = useState({ key: 'nome', direction: 'asc' });
  const [exportingPdf, setExportingPdf] = useState(false);
  const [selectedClientes, setSelectedClientes] = useState(new Set());
  const [selectedEstado, setSelectedEstado] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);

  // Endereço de entrega
  const [showEnderecoEntrega, setShowEnderecoEntrega] = useState(false);
  const [selectedEstadoEntrega, setSelectedEstadoEntrega] = useState('');
  const [loadingCepEntrega, setLoadingCepEntrega] = useState(false);

  // Status ativo do cliente (para edição)
  const [clienteAtivo, setClienteAtivo] = useState(true);

  // Localização do usuário para ordenação por proximidade
  const [userLocation, setUserLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Hook para buscar cidades do IBGE
  const { cidades: cidadesDoEstado, loading: loadingCidades } = useCidadesIBGE(selectedEstado);
  const { cidades: cidadesDoEstadoEntrega, loading: loadingCidadesEntrega } = useCidadesIBGE(selectedEstadoEntrega);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(clienteSchema),
  });

  // Ordenar clientes
  const clientesOrdenados = useMemo(() => {
    const sorted = [...clientes];
    sorted.sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case 'nome':
          aValue = (a.nome || '').toLowerCase();
          bValue = (b.nome || '').toLowerCase();
          break;
        case 'contato':
          aValue = (a.contato_nome || '').toLowerCase();
          bValue = (b.contato_nome || '').toLowerCase();
          break;
        case 'telefone':
          aValue = (a.telefone || '').toLowerCase();
          bValue = (b.telefone || '').toLowerCase();
          break;
        case 'email':
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
          break;
        case 'cidade':
          aValue = (a.cidade || '').toLowerCase();
          bValue = (b.cidade || '').toLowerCase();
          break;
        case 'vendedor':
          aValue = (a.vendedor_nome || '').toLowerCase();
          bValue = (b.vendedor_nome || '').toLowerCase();
          break;
        case 'pedidos':
          aValue = parseInt(a.total_pedidos) || 0;
          bValue = parseInt(b.total_pedidos) || 0;
          break;
        case 'valor':
          aValue = parseFloat(a.valor_total_pedidos) || 0;
          bValue = parseFloat(b.valor_total_pedidos) || 0;
          break;
        case 'proximidade':
          if (!userLocation) {
            aValue = (a.nome || '').toLowerCase();
            bValue = (b.nome || '').toLowerCase();
          } else {
            const coordsA = getClienteCoords(a.cidade, a.estado);
            const coordsB = getClienteCoords(b.cidade, b.estado);
            // Clientes sem coordenadas vão para o final
            aValue = coordsA
              ? calcularDistancia(userLocation.lat, userLocation.lng, coordsA.lat, coordsA.lng)
              : 99999;
            bValue = coordsB
              ? calcularDistancia(userLocation.lat, userLocation.lng, coordsB.lat, coordsB.lng)
              : 99999;
          }
          break;
        default:
          aValue = (a.nome || '').toLowerCase();
          bValue = (b.nome || '').toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [clientes, sortConfig, userLocation]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) {
      return <ArrowUpDown className="w-4 h-4 opacity-30" />;
    }
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="w-4 h-4" />
      : <ChevronDown className="w-4 h-4" />;
  };

  const exportarPdf = async () => {
    setExportingPdf(true);
    try {
      let url = '/clientes/exportar/pdf?';
      if (vendedorId) url += `vendedor_id=${vendedorId}&`;
      if (search) url += `search=${encodeURIComponent(search)}&`;

      await api.download(url, 'clientes-quatrelati.pdf');
      toast.success('PDF gerado com sucesso');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  // Funções de seleção para rotas
  const toggleSelectCliente = (clienteId) => {
    const newSelected = new Set(selectedClientes);
    if (newSelected.has(clienteId)) {
      newSelected.delete(clienteId);
    } else {
      if (newSelected.size >= 10) {
        toast.error('Máximo de 10 clientes por rota');
        return;
      }
      newSelected.add(clienteId);
    }
    setSelectedClientes(newSelected);
  };

  const selectAllVisible = () => {
    const newSelected = new Set();
    clientesOrdenados.slice(0, 10).forEach(c => newSelected.add(c.id));
    setSelectedClientes(newSelected);
  };

  const clearSelection = () => {
    setSelectedClientes(new Set());
  };

  const changeViewMode = (mode) => {
    if (mode === 'cards') {
      clearSelection();
    }
    setViewMode(mode);
  };

  const toggleMap = () => {
    setShowMap(prev => !prev);
  };

  // Ordenar por proximidade
  const ordenarPorProximidade = () => {
    if (loadingLocation) return;

    // Se já está ordenando por proximidade e tem localização, desativar
    if (sortConfig.key === 'proximidade' && userLocation) {
      setSortConfig({ key: 'nome', direction: 'asc' });
      setUserLocation(null);
      return;
    }

    setLoadingLocation(true);

    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada neste navegador');
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setSortConfig({ key: 'proximidade', direction: 'asc' });
        setLoadingLocation(false);
        toast.success('Lista ordenada por proximidade');
      },
      (error) => {
        setLoadingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Permissão de localização negada');
        } else {
          toast.error('Erro ao obter localização');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Focar em um cliente no mapa
  const focusClienteNoMapa = (clienteId) => {
    if (!showMap) {
      setShowMap(true);
    }
    setFocusClienteId(clienteId);
    // Limpar o foco após um tempo para permitir focar no mesmo cliente novamente
    setTimeout(() => setFocusClienteId(null), 1000);
  };

  // Buscar endereço pelo CEP (ViaCEP)
  const buscarCep = async (cep, tipo = 'principal') => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    const isEntrega = tipo === 'entrega';
    if (isEntrega) {
      setLoadingCepEntrega(true);
    } else {
      setLoadingCep(true);
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      // Preencher campos automaticamente
      const sufixo = isEntrega ? '_entrega' : '';
      setValue(`endereco${sufixo}`, data.logradouro ? `${data.logradouro}${data.bairro ? `, ${data.bairro}` : ''}` : '');
      setValue(`estado${sufixo}`, data.uf);

      if (isEntrega) {
        setSelectedEstadoEntrega(data.uf);
      } else {
        setSelectedEstado(data.uf);
      }

      // Aguardar um pouco para as cidades carregarem, depois setar a cidade
      setTimeout(() => {
        setValue(`cidade${sufixo}`, data.localidade);
      }, 500);

      toast.success('Endereço preenchido automaticamente');
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao buscar CEP');
    } finally {
      if (isEntrega) {
        setLoadingCepEntrega(false);
      } else {
        setLoadingCep(false);
      }
    }
  };

  const criarRotaGoogleMaps = () => {
    if (selectedClientes.size === 0) {
      toast.error('Selecione ao menos um cliente');
      return;
    }

    const clientesSelecionados = clientesOrdenados.filter(c => selectedClientes.has(c.id));

    // Criar URL do Google Maps com waypoints
    const waypoints = clientesSelecionados.map(c => {
      const endereco = [c.endereco, c.cidade, c.estado, 'Brasil'].filter(Boolean).join(', ');
      return encodeURIComponent(endereco);
    });

    // Usar o primeiro como origem e o último como destino
    const origem = waypoints[0];
    const destino = waypoints[waypoints.length - 1];
    const paradas = waypoints.slice(1, -1).join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origem}&destination=${destino}`;
    if (paradas) {
      url += `&waypoints=${paradas}`;
    }
    url += '&travelmode=driving';

    window.open(url, '_blank');
    toast.success(`Rota criada para ${clientesSelecionados.length} clientes`);
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  useEffect(() => {
    carregarClientes();
  }, [filtroAtivo, vendedorId]);

  // Abrir detalhes de cliente vindo da URL (dashboard)
  useEffect(() => {
    if (urlDetalheId && clientes.length > 0) {
      const cliente = clientes.find(c => c.id === parseInt(urlDetalheId));
      if (cliente) {
        setDetailsModal(cliente);
      }
    }
  }, [urlDetalheId, clientes]);

  const carregarUsuarios = async () => {
    try {
      const res = await api.get('/usuarios?ativo=true');
      setUsuarios(res.data.usuarios || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const carregarClientes = async () => {
    setLoading(true);
    try {
      let url = `/clientes?ativo=${filtroAtivo}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (vendedorId) url += `&vendedor_id=${vendedorId}`;

      const res = await api.get(url);
      setClientes(res.data.clientes);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const buscar = (e) => {
    e.preventDefault();
    carregarClientes();
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 1MB');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast.error('Formato não suportado. Use JPG, PNG, GIF ou WebP');
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const res = await api.upload('/upload/logo', formData);
      setLogoUrl(res.data.url);
      toast.success('Logo enviada com sucesso');
    } catch (error) {
      console.error('Erro ao enviar logo:', error);
      toast.error('Erro ao enviar logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const abrirModal = (cliente = null) => {
    if (cliente) {
      setEditingCliente(cliente);
      setLogoUrl(cliente.logo_url || '');
      setSelectedEstado(cliente.estado || '');
      setSelectedEstadoEntrega(cliente.estado_entrega || '');
      setClienteAtivo(cliente.ativo !== false); // Default true se não definido
      // Mostrar endereço de entrega se tiver dados
      const temEnderecoEntrega = cliente.cep_entrega || cliente.endereco_entrega || cliente.cidade_entrega;
      setShowEnderecoEntrega(!!temEnderecoEntrega);
      reset({
        nome: cliente.nome || '',
        razao_social: cliente.razao_social || '',
        cnpj_cpf: cliente.cnpj_cpf || '',
        telefone: cliente.telefone || '',
        email: cliente.email || '',
        // Endereço principal
        cep: cliente.cep || '',
        endereco: cliente.endereco || '',
        numero: cliente.numero || '',
        complemento: cliente.complemento || '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        // Endereço de entrega
        cep_entrega: cliente.cep_entrega || '',
        endereco_entrega: cliente.endereco_entrega || '',
        numero_entrega: cliente.numero_entrega || '',
        complemento_entrega: cliente.complemento_entrega || '',
        cidade_entrega: cliente.cidade_entrega || '',
        estado_entrega: cliente.estado_entrega || '',
        // Outros
        contato_nome: cliente.contato_nome || '',
        observacoes: cliente.observacoes || '',
        vendedor_id: cliente.vendedor_id?.toString() || '',
      });
    } else {
      setEditingCliente(null);
      setLogoUrl('');
      setSelectedEstado('');
      setSelectedEstadoEntrega('');
      setShowEnderecoEntrega(false);
      setClienteAtivo(true);
      reset({
        nome: '',
        razao_social: '',
        cnpj_cpf: '',
        telefone: '',
        email: '',
        // Endereço principal
        cep: '',
        endereco: '',
        numero: '',
        complemento: '',
        cidade: '',
        estado: '',
        // Endereço de entrega
        cep_entrega: '',
        endereco_entrega: '',
        numero_entrega: '',
        complemento_entrega: '',
        cidade_entrega: '',
        estado_entrega: '',
        // Outros
        contato_nome: '',
        observacoes: '',
        vendedor_id: user?.id?.toString() || '',
      });
    }
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setEditingCliente(null);
    reset();
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        logo_url: logoUrl || null,
        vendedor_id: data.vendedor_id ? parseInt(data.vendedor_id) : null,
        ativo: clienteAtivo,
      };

      if (editingCliente) {
        await api.put(`/clientes/${editingCliente.id}`, payload);
        toast.success('Cliente atualizado com sucesso');
      } else {
        await api.post('/clientes', payload);
        toast.success('Cliente criado com sucesso');
      }

      fecharModal();
      carregarClientes();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      toast.error(error.message || 'Erro ao salvar cliente');
    } finally {
      setSaving(false);
    }
  };

  const excluirCliente = async (id) => {
    try {
      await api.delete(`/clientes/${id}`);
      toast.success('Cliente excluído/desativado com sucesso');
      setDeleteConfirm(null);
      carregarClientes();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast.error(error.message || 'Erro ao excluir cliente');
    }
  };

  const verDetalhes = async (cliente) => {
    try {
      const res = await api.get(`/clientes/${cliente.id}`);
      setDetailsModal(res.data.cliente);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      toast.error('Erro ao carregar detalhes');
    }
  };

  const imprimirCliente = (cliente) => {
    const printWindow = window.open('', '_blank');
    const formatarEndereco = (end, num, comp, cidade, estado, cep) => {
      const partes = [];
      if (end) partes.push(end);
      if (num) partes.push(num);
      if (comp) partes.push(comp);
      const linha1 = partes.join(', ');
      const linha2 = [cidade, estado].filter(Boolean).join(' - ');
      const linha3 = cep ? `CEP: ${cep}` : '';
      return [linha1, linha2, linha3].filter(Boolean).join('<br>');
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${cliente.nome} - Dados Cadastrais</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .header { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; border-bottom: 2px solid #1D4ED8; padding-bottom: 20px; }
          .logo { width: 80px; height: 80px; background: linear-gradient(135deg, #1D4ED8, #3B82F6); border-radius: 16px; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: bold; }
          .logo img { width: 100%; height: 100%; object-fit: cover; border-radius: 16px; }
          .title { flex: 1; }
          .title h1 { font-size: 24px; color: #1D4ED8; margin-bottom: 4px; }
          .title p { color: #666; font-size: 14px; }
          .section { margin-bottom: 24px; }
          .section-title { font-size: 14px; font-weight: bold; color: #1D4ED8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #E5E7EB; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
          .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
          .field { margin-bottom: 12px; }
          .field-label { font-size: 11px; color: #6B7280; text-transform: uppercase; margin-bottom: 2px; }
          .field-value { font-size: 14px; color: #111; }
          .field-small .field-value { font-size: 13px; }
          .observacoes { background: #FFFBEB; padding: 16px; border-radius: 12px; margin-top: 20px; }
          .observacoes p { font-size: 14px; color: #92400E; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 11px; color: #9CA3AF; }
          .bureau-logo { display: flex; align-items: center; gap: 6px; }
          .bureau-logo svg { width: 50px; height: auto; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            ${cliente.logo_url ? `<img src="${cliente.logo_url}" alt="${cliente.nome}">` : cliente.nome.charAt(0).toUpperCase()}
          </div>
          <div class="title">
            <h1>${cliente.nome}</h1>
            ${cliente.razao_social ? `<p>${cliente.razao_social}</p>` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Dados da Empresa</div>
          <div class="grid-3">
            ${cliente.cnpj_cpf ? `<div class="field"><div class="field-label">CNPJ</div><div class="field-value">${cliente.cnpj_cpf}</div></div>` : ''}
            ${cliente.contato_nome ? `<div class="field"><div class="field-label">Contato</div><div class="field-value">${cliente.contato_nome}</div></div>` : ''}
            ${cliente.vendedor_nome ? `<div class="field field-small"><div class="field-label">Vendedor</div><div class="field-value">${cliente.vendedor_nome}</div></div>` : ''}
          </div>
          <div class="grid">
            ${cliente.telefone ? `<div class="field"><div class="field-label">Telefone</div><div class="field-value">${cliente.telefone}</div></div>` : ''}
            ${cliente.email ? `<div class="field"><div class="field-label">Email</div><div class="field-value">${cliente.email}</div></div>` : ''}
          </div>
        </div>

        ${(cliente.endereco || cliente.cidade) ? `
        <div class="section">
          <div class="section-title">Endereço Principal</div>
          <div class="field">
            <div class="field-value">${formatarEndereco(cliente.endereco, cliente.numero, cliente.complemento, cliente.cidade, cliente.estado, cliente.cep)}</div>
          </div>
        </div>
        ` : ''}

        ${(cliente.endereco_entrega || cliente.cidade_entrega) ? `
        <div class="section">
          <div class="section-title">Endereço de Entrega</div>
          <div class="field">
            <div class="field-value">${formatarEndereco(cliente.endereco_entrega, cliente.numero_entrega, cliente.complemento_entrega, cliente.cidade_entrega, cliente.estado_entrega, cliente.cep_entrega)}</div>
          </div>
        </div>
        ` : ''}

        ${cliente.observacoes ? `
        <div class="observacoes">
          <div class="section-title" style="color: #92400E; border-color: #FCD34D;">Observações</div>
          <p>${cliente.observacoes}</p>
        </div>
        ` : ''}

        <div class="footer">
          <span>Desenvolvido por</span>
          <div class="bureau-logo">
            <svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
              <!-- Seta (cinza) -->
              <path d="M 16.59 44.68 L 16.59 87.58 L 28.69 71.86 L 45.68 71.86 Z" fill="#6B7280"/>
              <!-- Ponto do i (dourado) -->
              <rect x="41.13" y="36.23" width="11.16" height="6.86" fill="#D4A017"/>
              <!-- Corpo do i (dourado) -->
              <path d="M 41.13 45 L 41.13 64.03 L 49.44 71.73 L 52.29 71.73 L 52.29 45 Z" fill="#D4A017"/>
              <!-- Letra t (dourado) -->
              <path d="M 67.86 72.32 Q 62.86 72.32 60.31 69.99 C 58.59 68.44 57.73 66.04 57.73 62.77 L 57.73 53.57 L 54.59 53.57 L 54.59 45 L 57.73 45 L 57.73 38.29 L 68.89 38.29 L 68.89 45 L 75.06 45 L 75.06 53.57 L 68.89 53.57 L 68.89 60.29 C 68.89 61.09 69.12 61.69 69.58 62.41 C 70.04 62.72 70.58 62.90 71.58 62.90 C 72.58 62.90 74.00 62.23 75 62.23 L 75 70.8 C 74 71.3 73.18 71.5 71.82 71.9 C 70.46 72.22 69.16 72.32 67.86 72.32 Z" fill="#D4A017"/>
              <!-- Underline (dourado) -->
              <rect x="78.18" y="73.48" width="29" height="5.58" fill="#D4A017"/>
            </svg>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Verificar se pode editar o cliente específico
  const podeEditarCliente = (cliente) => {
    if (isAdmin) return true;
    return cliente.vendedor_id === user?.id;
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header Unificado Sticky */}
      <div className="sticky top-0 z-40 -mx-6 px-6 pb-4 pt-0 backdrop-blur-sm bg-white/95 dark:bg-gray-900/95 shadow-sm space-y-4">
        {/* Título e Ações */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{clientes.length} clientes cadastrados</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportarPdf} disabled={exportingPdf || clientes.length === 0}>
              {exportingPdf ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              PDF
            </Button>
            <Button onClick={() => abrirModal()}>
              <Plus className="w-4 h-4" />
              Novo Cliente
            </Button>
          </div>
        </div>

        {/* Filtros e Busca */}
        <form onSubmit={buscar} className="flex flex-wrap gap-3 items-center bg-gray-50/50 dark:bg-gray-800/30 rounded-lg p-2">
          {/* Campo de Busca */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Separador */}
          <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-gray-700" />

          {/* Toggle Ativos/Inativos */}
          <div className="flex p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <button
              type="button"
              onClick={() => setFiltroAtivo('true')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                filtroAtivo === 'true'
                  ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Ativos
            </button>
            <button
              type="button"
              onClick={() => setFiltroAtivo('false')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                filtroAtivo === 'false'
                  ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Inativos
            </button>
          </div>

          {/* Separador */}
          <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-gray-700" />

          {/* Toggle Visualização */}
          <div className="flex p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <button
              type="button"
              onClick={() => changeViewMode('cards')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-gray-700 text-quatrelati-blue-600 dark:text-quatrelati-blue-400 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title="Cards"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => changeViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-700 text-quatrelati-blue-600 dark:text-quatrelati-blue-400 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title="Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Separador */}
          <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-gray-700" />

          {/* Botões Mapa e Proximidade */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleMap}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                showMap
                  ? 'bg-quatrelati-blue-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              title={showMap ? 'Ocultar mapa' : 'Exibir mapa'}
            >
              <Map className="w-4 h-4" />
              <span className="hidden sm:inline">{showMap ? 'Ocultar' : 'Mapa'}</span>
            </button>
            <button
              type="button"
              onClick={ordenarPorProximidade}
              disabled={loadingLocation}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                sortConfig.key === 'proximidade'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              } ${loadingLocation ? 'opacity-75 cursor-wait' : ''}`}
              title="Ordenar por proximidade"
            >
              {loadingLocation ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LocateFixed className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{sortConfig.key === 'proximidade' ? 'Próximos' : 'Proximidade'}</span>
            </button>
          </div>
        </form>

        {/* Cabeçalho das Colunas (apenas modo lista) */}
        {viewMode === 'list' && !loading && clientes.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-3 py-2.5 w-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedClientes.size > 0) {
                          clearSelection();
                        } else {
                          selectAllVisible();
                        }
                      }}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      title={selectedClientes.size > 0 ? 'Limpar seleção' : 'Selecionar primeiros 10'}
                    >
                      {selectedClientes.size > 0 ? (
                        <CheckSquare className="w-5 h-5 text-quatrelati-blue-600 dark:text-quatrelati-blue-400" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th
                    className="px-4 py-2.5 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => handleSort('nome')}
                  >
                    <div className="flex items-center gap-1">
                      Cliente
                      <SortIcon column="nome" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-2.5 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => handleSort('contato')}
                  >
                    <div className="flex items-center gap-1">
                      Contato
                      <SortIcon column="contato" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-2.5 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => handleSort('telefone')}
                  >
                    <div className="flex items-center gap-1">
                      Telefone
                      <SortIcon column="telefone" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-2.5 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-1">
                      Email
                      <SortIcon column="email" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-2.5 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => handleSort('vendedor')}
                  >
                    <div className="flex items-center gap-1">
                      Vendedor
                      <SortIcon column="vendedor" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-2.5 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => handleSort('pedidos')}
                  >
                    <div className="flex items-center gap-1">
                      Pedidos
                      <SortIcon column="pedidos" />
                    </div>
                  </th>
                  <th className="px-4 py-2.5 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Ações</th>
                </tr>
              </thead>
            </table>
          </div>
        )}
      </div>

      {/* Barra de Seleção para Rotas */}
      {selectedClientes.size > 0 && viewMode === 'list' && (
        <Card className="p-3 bg-quatrelati-blue-50 dark:bg-quatrelati-blue-900/20 border-quatrelati-blue-200 dark:border-quatrelati-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-quatrelati-blue-600 dark:text-quatrelati-blue-400" />
              <span className="text-sm font-medium text-quatrelati-blue-700 dark:text-quatrelati-blue-300">
                {selectedClientes.size} cliente{selectedClientes.size > 1 ? 's' : ''} selecionado{selectedClientes.size > 1 ? 's' : ''}
              </span>
              <span className="text-xs text-quatrelati-blue-500 dark:text-quatrelati-blue-400">
                (máx. 10)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-gray-600"
              >
                <X className="w-4 h-4" />
                Limpar
              </Button>
              <Button
                size="sm"
                onClick={criarRotaGoogleMaps}
                className="bg-quatrelati-blue-600 hover:bg-quatrelati-blue-700"
              >
                <Navigation className="w-4 h-4" />
                Criar Rota no Google Maps
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Mapa de Clientes (acima da lista) */}
      {showMap && !loading && clientes.length > 0 && (
        <Card className="p-4">
          <Suspense fallback={
            <div className="h-[350px] rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Loading />
            </div>
          }>
            <ClientesMap
              clientes={clientesOrdenados}
              onClienteClick={(cliente) => verDetalhes(cliente)}
              focusClienteId={focusClienteId}
              compact
            />
          </Suspense>
        </Card>
      )}

      {/* Grid de Clientes */}
      {loading ? (
        <div className={viewMode === 'cards' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-3"}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="skeleton-quatrelati h-6 w-3/4 mb-4" />
              <div className="skeleton-quatrelati h-4 w-full mb-2" />
              <div className="skeleton-quatrelati h-4 w-2/3" />
            </Card>
          ))}
        </div>
      ) : clientes.length === 0 ? (
        <Card className="p-12 text-center">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nenhum cliente encontrado</p>
        </Card>
      ) : viewMode === 'cards' ? (
        /* Visualização em Cards - Melhorada */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientesOrdenados.map((cliente) => (
            <Card
              key={cliente.id}
              className="p-5 cursor-pointer group"
              onClick={() => verDetalhes(cliente)}
            >
              {/* Header com Logo e Nome */}
              <div className="flex items-start gap-3 mb-4">
                {cliente.logo_url ? (
                  <img
                    src={cliente.logo_url}
                    alt={cliente.nome}
                    className="w-14 h-14 rounded-2xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-quatrelati-blue-500 to-quatrelati-blue-600 dark:from-quatrelati-gold-400 dark:to-quatrelati-gold-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-white">
                      {(cliente.nome || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-quatrelati-blue-600 dark:group-hover:text-quatrelati-gold-400 transition-colors">
                    {cliente.nome}
                  </h3>
                  <div className="flex items-center gap-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {cliente.cidade ? `${cliente.cidade}${cliente.estado ? ` - ${cliente.estado}` : ''}` : 'Sem localização'}
                    </p>
                    {(cliente.cidade || cliente.estado) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          focusClienteNoMapa(cliente.id);
                        }}
                        className="p-0.5 rounded hover:bg-quatrelati-blue-100 dark:hover:bg-quatrelati-blue-900/30 text-quatrelati-blue-500 hover:text-quatrelati-blue-700 transition-colors flex-shrink-0"
                        title="Ver no mapa"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <Badge variant={cliente.ativo ? 'success' : 'error'} className="mt-1">
                    {cliente.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                    <Package className="w-4 h-4" />
                    <span className="text-xs font-medium">Pedidos</span>
                  </div>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {cliente.total_pedidos || 0}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium">Total</span>
                  </div>
                  <p className="text-lg font-bold text-green-700 dark:text-green-300 truncate">
                    {formatCurrency(cliente.valor_total_pedidos || 0)}
                  </p>
                </div>
              </div>

              {/* Contato Info */}
              <div className="space-y-2 text-sm">
                {cliente.contato_nome && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <UserCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{cliente.contato_nome}</span>
                  </div>
                )}
                {cliente.telefone && (
                  <a
                    href={`tel:${cliente.telefone.replace(/\D/g, '')}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-quatrelati-blue-600 dark:hover:text-quatrelati-gold-400 transition-colors"
                  >
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{cliente.telefone}</span>
                  </a>
                )}
                {cliente.email && (
                  <a
                    href={`mailto:${cliente.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-quatrelati-blue-600 dark:hover:text-quatrelati-gold-400 transition-colors"
                  >
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{cliente.email}</span>
                  </a>
                )}
              </div>

              {/* Vendedor */}
              {cliente.vendedor_nome && (
                <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex items-center gap-2">
                    <Gravatar
                      email={cliente.vendedor_email}
                      name={cliente.vendedor_nome}
                      size={28}
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Vendedor</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                        {cliente.vendedor_nome}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200/50 dark:border-gray-700/50" onClick={(e) => e.stopPropagation()}>
                {podeEditarCliente(cliente) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => abrirModal(cliente)}
                  >
                    <Edit2 className="w-4 h-4" />
                    Editar
                  </Button>
                )}
                {podeEditarCliente(cliente) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-500/10"
                    onClick={() => setDeleteConfirm(cliente)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : viewMode === 'list' ? (
        /* Visualização em Lista - tbody apenas (cabeçalho está no sticky) */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {clientesOrdenados.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className={`transition-colors cursor-pointer ${
                      selectedClientes.has(cliente.id)
                        ? 'bg-quatrelati-blue-50 dark:bg-quatrelati-blue-900/30 hover:bg-quatrelati-blue-100 dark:hover:bg-quatrelati-blue-900/40'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                    onClick={() => verDetalhes(cliente)}
                  >
                    {/* Checkbox de seleção */}
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleSelectCliente(cliente.id)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        {selectedClientes.has(cliente.id) ? (
                          <CheckSquare className="w-5 h-5 text-quatrelati-blue-600 dark:text-quatrelati-blue-400" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </td>
                    {/* Cliente */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {cliente.logo_url ? (
                          <img
                            src={cliente.logo_url}
                            alt={cliente.nome}
                            className="w-10 h-10 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-quatrelati-gold-500/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-quatrelati-gold-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{cliente.nome}</p>
                          <div className="flex items-center gap-1">
                            <p className="text-xs text-gray-500">
                              {cliente.cidade}{cliente.estado && ` - ${cliente.estado}`}
                            </p>
                            {(cliente.cidade || cliente.estado) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  focusClienteNoMapa(cliente.id);
                                }}
                                className="p-0.5 rounded hover:bg-quatrelati-blue-100 dark:hover:bg-quatrelati-blue-900/30 text-quatrelati-blue-500 hover:text-quatrelati-blue-700 transition-colors"
                                title="Ver no mapa"
                              >
                                <MapPin className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Contato */}
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {cliente.contato_nome || '-'}
                    </td>
                    {/* Telefone - Clicável */}
                    <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                      {cliente.telefone ? (
                        <a
                          href={`tel:${cliente.telefone.replace(/\D/g, '')}`}
                          className="text-gray-600 dark:text-gray-400 hover:text-quatrelati-blue-600 dark:hover:text-quatrelati-gold-400 transition-colors"
                        >
                          {cliente.telefone}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    {/* Email - Clicável */}
                    <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                      {cliente.email ? (
                        <a
                          href={`mailto:${cliente.email}`}
                          className="text-gray-600 dark:text-gray-400 hover:text-quatrelati-blue-600 dark:hover:text-quatrelati-gold-400 transition-colors truncate max-w-[200px] block"
                        >
                          {cliente.email}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    {/* Vendedor */}
                    <td className="px-4 py-3">
                      {cliente.vendedor_nome ? (
                        <div className="flex items-center gap-2">
                          <Gravatar
                            email={cliente.vendedor_email}
                            name={cliente.vendedor_nome}
                            size={28}
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {cliente.vendedor_nome}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    {/* Pedidos */}
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {cliente.total_pedidos || 0}
                        </p>
                        <p className="text-xs text-quatrelati-gold-600">
                          {formatCurrency(cliente.valor_total_pedidos || 0)}
                        </p>
                      </div>
                    </td>
                    {/* Ações */}
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        {podeEditarCliente(cliente) && (
                          <button
                            onClick={() => abrirModal(cliente)}
                            className="p-2 rounded-lg text-gray-500 hover:text-quatrelati-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {podeEditarCliente(cliente) && (
                          <button
                            onClick={() => setDeleteConfirm(cliente)}
                            className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {/* Modal de Cliente */}
      <Modal
        isOpen={modalOpen}
        onClose={fecharModal}
        title={editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          {/* Área scrollável */}
          <div className="flex-1 overflow-y-auto space-y-5 pr-2 -mr-2 max-h-[calc(80vh-140px)]">
            {/* Header: Logo + Status + Nome */}
            <div className="flex gap-4 items-start p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              {/* Upload de Logo */}
              <div className="flex-shrink-0">
                {logoUrl ? (
                  <div className="relative">
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="w-20 h-20 object-cover rounded-xl border-2 border-white dark:border-gray-700 shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center hover:border-quatrelati-blue-400 hover:bg-quatrelati-blue-50 dark:hover:bg-quatrelati-blue-900/20 transition-colors">
                      {uploadingLogo ? (
                        <div className="w-6 h-6 border-2 border-quatrelati-blue-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-gray-400" />
                          <span className="text-xs text-gray-400 mt-1">Logo</span>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                    />
                  </label>
                )}
              </div>

              {/* Nome e Status */}
              <div className="flex-1 space-y-3">
                <Input
                  label="Nome (apelido)"
                  placeholder="Nome curto / fantasia"
                  error={errors.nome?.message}
                  required
                  {...register('nome')}
                />
                {/* Toggle Ativo - somente ao editar */}
                {editingCliente && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                    <button
                      type="button"
                      onClick={() => setClienteAtivo(!clienteAtivo)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        clienteAtivo ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          clienteAtivo ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-sm font-medium ${clienteAtivo ? 'text-green-600' : 'text-gray-500'}`}>
                      {clienteAtivo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Dados da Empresa */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Dados da Empresa
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="CNPJ"
                  placeholder="00.000.000/0000-00"
                  error={errors.cnpj_cpf?.message}
                  value={watch('cnpj_cpf') || ''}
                  onChange={(e) => setValue('cnpj_cpf', mascaraCNPJ(e.target.value))}
                />
                <Input
                  label="Razão Social"
                  placeholder="Razão social completa"
                  {...register('razao_social')}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Telefone"
                  placeholder="(11) 99999-9999"
                  value={watch('telefone') || ''}
                  onChange={(e) => setValue('telefone', mascaraTelefone(e.target.value))}
                />
                <Input
                  label="Email"
                  type="email"
                  error={errors.email?.message}
                  {...register('email')}
                />
                <Input
                  label="Contato (Nome)"
                  placeholder="Nome do responsável"
                  {...register('contato_nome')}
                />
              </div>
              {isAdmin && (
                <Select
                  label="Vendedor Responsável"
                  options={usuarios.filter(u => ['vendedor', 'admin', 'superadmin'].includes(u.nivel)).map(u => ({
                    value: u.id,
                    label: u.nome
                  }))}
                  placeholder="Selecione..."
                  {...register('vendedor_id')}
                />
              )}
            </div>

          {/* Endereço Principal */}
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Endereço Principal
              </h4>
            {/* CEP, UF, Cidade */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="relative">
                <Input
                  label="CEP"
                  placeholder="00000-000"
                  error={errors.cep?.message}
                  value={watch('cep') || ''}
                  onChange={(e) => {
                    const valor = mascaraCEP(e.target.value);
                    setValue('cep', valor);
                    if (valor.length === 9) {
                      buscarCep(valor, 'principal');
                    }
                  }}
                />
                {loadingCep && (
                  <div className="absolute right-3 top-9">
                    <div className="w-4 h-4 border-2 border-quatrelati-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <Select
                label="UF"
                options={ESTADOS}
                value={watch('estado') || ''}
                onChange={(e) => {
                  setValue('estado', e.target.value);
                  setSelectedEstado(e.target.value);
                  setValue('cidade', '');
                }}
              />
              <div className="col-span-2">
                <Select
                  label="Cidade"
                  options={cidadesDoEstado}
                  value={watch('cidade') || ''}
                  onChange={(e) => setValue('cidade', e.target.value)}
                  disabled={!selectedEstado || loadingCidades}
                  placeholder={loadingCidades ? 'Carregando...' : selectedEstado ? 'Selecione a cidade' : 'Selecione o UF primeiro'}
                />
              </div>
            </div>
            {/* Rua, Número, Complemento */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-3">
                <Input
                  label="Rua / Logradouro"
                  placeholder="Ex: Rua das Flores, Centro"
                  {...register('endereco')}
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  label="Número"
                  placeholder="123"
                  {...register('numero')}
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  label="Complemento"
                  placeholder="Apto, Sala, Bloco..."
                  {...register('complemento')}
                />
              </div>
            </div>

            {/* Toggle para Endereço de Entrega */}
            {!showEnderecoEntrega ? (
              <button
                type="button"
                onClick={() => setShowEnderecoEntrega(true)}
                className="flex items-center gap-2 text-sm text-quatrelati-blue-600 dark:text-quatrelati-gold-400 hover:underline"
              >
                <Plus className="w-4 h-4" />
                Cadastrar endereço de entrega diferente
              </button>
            ) : (
              <>
                {/* Endereço de Entrega */}
                <div className="mt-4 pt-4 border-t border-dashed border-gray-300 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
                      <Truck className="w-4 h-4 text-quatrelati-blue-500" />
                      Endereço de Entrega
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEnderecoEntrega(false);
                        setValue('cep_entrega', '');
                        setValue('endereco_entrega', '');
                        setValue('numero_entrega', '');
                        setValue('complemento_entrega', '');
                        setValue('cidade_entrega', '');
                        setValue('estado_entrega', '');
                        setSelectedEstadoEntrega('');
                      }}
                      className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Remover
                    </button>
                  </div>
                  {/* CEP, UF, Cidade - Entrega */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="relative">
                      <Input
                        label="CEP"
                        placeholder="00000-000"
                        value={watch('cep_entrega') || ''}
                        onChange={(e) => {
                          const valor = mascaraCEP(e.target.value);
                          setValue('cep_entrega', valor);
                          if (valor.length === 9) {
                            buscarCep(valor, 'entrega');
                          }
                        }}
                      />
                      {loadingCepEntrega && (
                        <div className="absolute right-3 top-9">
                          <div className="w-4 h-4 border-2 border-quatrelati-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <Select
                      label="UF"
                      options={ESTADOS}
                      value={watch('estado_entrega') || ''}
                      onChange={(e) => {
                        setValue('estado_entrega', e.target.value);
                        setSelectedEstadoEntrega(e.target.value);
                        setValue('cidade_entrega', '');
                      }}
                    />
                    <div className="col-span-2">
                      <Select
                        label="Cidade"
                        options={cidadesDoEstadoEntrega}
                        value={watch('cidade_entrega') || ''}
                        onChange={(e) => setValue('cidade_entrega', e.target.value)}
                        disabled={!selectedEstadoEntrega || loadingCidadesEntrega}
                        placeholder={loadingCidadesEntrega ? 'Carregando...' : selectedEstadoEntrega ? 'Selecione a cidade' : 'Selecione o UF primeiro'}
                      />
                    </div>
                  </div>
                  {/* Rua, Número, Complemento - Entrega */}
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="md:col-span-3">
                      <Input
                        label="Rua / Logradouro"
                        placeholder="Ex: Rua das Flores, Centro"
                        {...register('endereco_entrega')}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Input
                        label="Número"
                        placeholder="123"
                        {...register('numero_entrega')}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        label="Complemento"
                        placeholder="Apto, Sala, Bloco..."
                        {...register('complemento_entrega')}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Observações */}
            <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Observações
              </label>
              <textarea
                className="input-glass resize-none w-full"
                rows={3}
                placeholder="Anotações sobre o cliente..."
                {...register('observacoes')}
              />
            </div>
          </div>

          {/* Botões fixos no rodapé */}
          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 sticky bottom-0">
            <Button variant="ghost" type="button" onClick={fecharModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editingCliente ? 'Salvar' : 'Criar Cliente'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Detalhes */}
      <Modal
        isOpen={!!detailsModal}
        onClose={() => setDetailsModal(null)}
        title="Detalhes do Cliente"
        size="lg"
      >
        {detailsModal && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {detailsModal.logo_url ? (
                <img
                  src={detailsModal.logo_url}
                  alt={detailsModal.nome}
                  className="w-16 h-16 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-quatrelati-gold-500/20 flex items-center justify-center">
                  <User className="w-8 h-8 text-quatrelati-gold-600" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {detailsModal.nome}
                </h3>
                {detailsModal.cnpj_cpf && (
                  <p className="text-gray-500">{detailsModal.cnpj_cpf}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => imprimirCliente(detailsModal)}
                  className="text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  title="Imprimir dados cadastrais"
                >
                  <Printer className="w-4 h-4" />
                </Button>
                {podeEditarCliente(detailsModal) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDetailsModal(null);
                      abrirModal(detailsModal);
                    }}
                    className="text-quatrelati-blue-600 hover:bg-quatrelati-blue-50 dark:text-quatrelati-blue-400 dark:hover:bg-quatrelati-blue-900/20"
                  >
                    <Edit2 className="w-4 h-4" />
                    Editar
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {detailsModal.contato_nome && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <UserCircle className="w-4 h-4" />
                  <span>{detailsModal.contato_nome}</span>
                </div>
              )}
              {detailsModal.telefone && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Phone className="w-4 h-4" />
                  <span>{detailsModal.telefone}</span>
                </div>
              )}
              {detailsModal.email && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Mail className="w-4 h-4" />
                  <span>{detailsModal.email}</span>
                </div>
              )}
              {(detailsModal.cidade || detailsModal.estado) && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Building2 className="w-4 h-4" />
                  <span>{detailsModal.cidade}{detailsModal.estado && ` - ${detailsModal.estado}`}</span>
                </div>
              )}
            </div>

            {detailsModal.endereco && (
              <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4 mt-1" />
                <span>{detailsModal.endereco}</span>
              </div>
            )}

            {detailsModal.endereco_entrega && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Endereço de Entrega</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">{detailsModal.endereco_entrega}</p>
              </div>
            )}

            {detailsModal.vendedor_nome && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">Vendedor Responsável</p>
                <p className="text-sm text-green-600 dark:text-green-400">{detailsModal.vendedor_nome}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
              <div className="text-center">
                <p className="text-2xl font-bold text-quatrelati-gold-600">
                  {detailsModal.total_pedidos || 0}
                </p>
                <p className="text-sm text-gray-500">Pedidos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-quatrelati-blue-600">
                  {formatCurrency(detailsModal.valor_total_pedidos || 0)}
                </p>
                <p className="text-sm text-gray-500">Valor Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Intl.NumberFormat('pt-BR').format(detailsModal.peso_total_pedidos || 0)} kg
                </p>
                <p className="text-sm text-gray-500">Peso Total</p>
              </div>
            </div>

            {detailsModal.observacoes && (
              <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Observações
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {detailsModal.observacoes}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Tem certeza que deseja excluir o cliente <strong>{deleteConfirm?.nome}</strong>?
          {deleteConfirm?.total_pedidos > 0 && (
            <span className="block mt-2 text-amber-600">
              Este cliente possui {deleteConfirm.total_pedidos} pedido(s) e será desativado em vez de excluído.
            </span>
          )}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => excluirCliente(deleteConfirm?.id)}>
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  );
}
