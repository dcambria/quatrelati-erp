'use client';

// =====================================================
// Página de Perfil do Usuário
// v1.3.0 - Refatora seção de alteração de senha
// =====================================================

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import {
  User,
  Mail,
  Phone,
  Shield,
  Save,
  ExternalLink,
  Info,
  Lock,
  Key,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { mascaraTelefone } from '../../lib/validations';
import Header from '../../components/layout/Header';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Gravatar from '../../components/ui/Gravatar';
import PasswordStrength from '../../components/ui/PasswordStrength';

// Lista completa de paises com bandeiras e codigos
const PAISES = [
  { codigo: '+55', pais: 'BR', bandeira: '🇧🇷', nome: 'Brasil' },
  { codigo: '+1', pais: 'US', bandeira: '🇺🇸', nome: 'Estados Unidos' },
  { codigo: '+93', pais: 'AF', bandeira: '🇦🇫', nome: 'Afeganistão' },
  { codigo: '+355', pais: 'AL', bandeira: '🇦🇱', nome: 'Albânia' },
  { codigo: '+213', pais: 'DZ', bandeira: '🇩🇿', nome: 'Argélia' },
  { codigo: '+376', pais: 'AD', bandeira: '🇦🇩', nome: 'Andorra' },
  { codigo: '+244', pais: 'AO', bandeira: '🇦🇴', nome: 'Angola' },
  { codigo: '+54', pais: 'AR', bandeira: '🇦🇷', nome: 'Argentina' },
  { codigo: '+374', pais: 'AM', bandeira: '🇦🇲', nome: 'Armênia' },
  { codigo: '+61', pais: 'AU', bandeira: '🇦🇺', nome: 'Austrália' },
  { codigo: '+43', pais: 'AT', bandeira: '🇦🇹', nome: 'Áustria' },
  { codigo: '+994', pais: 'AZ', bandeira: '🇦🇿', nome: 'Azerbaijão' },
  { codigo: '+973', pais: 'BH', bandeira: '🇧🇭', nome: 'Bahrein' },
  { codigo: '+880', pais: 'BD', bandeira: '🇧🇩', nome: 'Bangladesh' },
  { codigo: '+375', pais: 'BY', bandeira: '🇧🇾', nome: 'Belarus' },
  { codigo: '+32', pais: 'BE', bandeira: '🇧🇪', nome: 'Bélgica' },
  { codigo: '+501', pais: 'BZ', bandeira: '🇧🇿', nome: 'Belize' },
  { codigo: '+229', pais: 'BJ', bandeira: '🇧🇯', nome: 'Benin' },
  { codigo: '+591', pais: 'BO', bandeira: '🇧🇴', nome: 'Bolívia' },
  { codigo: '+387', pais: 'BA', bandeira: '🇧🇦', nome: 'Bósnia' },
  { codigo: '+267', pais: 'BW', bandeira: '🇧🇼', nome: 'Botsuana' },
  { codigo: '+359', pais: 'BG', bandeira: '🇧🇬', nome: 'Bulgária' },
  { codigo: '+855', pais: 'KH', bandeira: '🇰🇭', nome: 'Camboja' },
  { codigo: '+237', pais: 'CM', bandeira: '🇨🇲', nome: 'Camarões' },
  { codigo: '+1', pais: 'CA', bandeira: '🇨🇦', nome: 'Canadá' },
  { codigo: '+238', pais: 'CV', bandeira: '🇨🇻', nome: 'Cabo Verde' },
  { codigo: '+56', pais: 'CL', bandeira: '🇨🇱', nome: 'Chile' },
  { codigo: '+86', pais: 'CN', bandeira: '🇨🇳', nome: 'China' },
  { codigo: '+57', pais: 'CO', bandeira: '🇨🇴', nome: 'Colômbia' },
  { codigo: '+506', pais: 'CR', bandeira: '🇨🇷', nome: 'Costa Rica' },
  { codigo: '+385', pais: 'HR', bandeira: '🇭🇷', nome: 'Croácia' },
  { codigo: '+53', pais: 'CU', bandeira: '🇨🇺', nome: 'Cuba' },
  { codigo: '+357', pais: 'CY', bandeira: '🇨🇾', nome: 'Chipre' },
  { codigo: '+420', pais: 'CZ', bandeira: '🇨🇿', nome: 'Tchéquia' },
  { codigo: '+45', pais: 'DK', bandeira: '🇩🇰', nome: 'Dinamarca' },
  { codigo: '+593', pais: 'EC', bandeira: '🇪🇨', nome: 'Equador' },
  { codigo: '+20', pais: 'EG', bandeira: '🇪🇬', nome: 'Egito' },
  { codigo: '+503', pais: 'SV', bandeira: '🇸🇻', nome: 'El Salvador' },
  { codigo: '+372', pais: 'EE', bandeira: '🇪🇪', nome: 'Estônia' },
  { codigo: '+251', pais: 'ET', bandeira: '🇪🇹', nome: 'Etiópia' },
  { codigo: '+358', pais: 'FI', bandeira: '🇫🇮', nome: 'Finlândia' },
  { codigo: '+33', pais: 'FR', bandeira: '🇫🇷', nome: 'França' },
  { codigo: '+995', pais: 'GE', bandeira: '🇬🇪', nome: 'Geórgia' },
  { codigo: '+49', pais: 'DE', bandeira: '🇩🇪', nome: 'Alemanha' },
  { codigo: '+233', pais: 'GH', bandeira: '🇬🇭', nome: 'Gana' },
  { codigo: '+30', pais: 'GR', bandeira: '🇬🇷', nome: 'Grécia' },
  { codigo: '+502', pais: 'GT', bandeira: '🇬🇹', nome: 'Guatemala' },
  { codigo: '+504', pais: 'HN', bandeira: '🇭🇳', nome: 'Honduras' },
  { codigo: '+852', pais: 'HK', bandeira: '🇭🇰', nome: 'Hong Kong' },
  { codigo: '+36', pais: 'HU', bandeira: '🇭🇺', nome: 'Hungria' },
  { codigo: '+354', pais: 'IS', bandeira: '🇮🇸', nome: 'Islândia' },
  { codigo: '+91', pais: 'IN', bandeira: '🇮🇳', nome: 'Índia' },
  { codigo: '+62', pais: 'ID', bandeira: '🇮🇩', nome: 'Indonésia' },
  { codigo: '+98', pais: 'IR', bandeira: '🇮🇷', nome: 'Irã' },
  { codigo: '+964', pais: 'IQ', bandeira: '🇮🇶', nome: 'Iraque' },
  { codigo: '+353', pais: 'IE', bandeira: '🇮🇪', nome: 'Irlanda' },
  { codigo: '+972', pais: 'IL', bandeira: '🇮🇱', nome: 'Israel' },
  { codigo: '+39', pais: 'IT', bandeira: '🇮🇹', nome: 'Itália' },
  { codigo: '+81', pais: 'JP', bandeira: '🇯🇵', nome: 'Japão' },
  { codigo: '+962', pais: 'JO', bandeira: '🇯🇴', nome: 'Jordânia' },
  { codigo: '+7', pais: 'KZ', bandeira: '🇰🇿', nome: 'Cazaquistão' },
  { codigo: '+254', pais: 'KE', bandeira: '🇰🇪', nome: 'Quênia' },
  { codigo: '+965', pais: 'KW', bandeira: '🇰🇼', nome: 'Kuwait' },
  { codigo: '+371', pais: 'LV', bandeira: '🇱🇻', nome: 'Letônia' },
  { codigo: '+961', pais: 'LB', bandeira: '🇱🇧', nome: 'Líbano' },
  { codigo: '+218', pais: 'LY', bandeira: '🇱🇾', nome: 'Líbia' },
  { codigo: '+423', pais: 'LI', bandeira: '🇱🇮', nome: 'Liechtenstein' },
  { codigo: '+370', pais: 'LT', bandeira: '🇱🇹', nome: 'Lituânia' },
  { codigo: '+352', pais: 'LU', bandeira: '🇱🇺', nome: 'Luxemburgo' },
  { codigo: '+853', pais: 'MO', bandeira: '🇲🇴', nome: 'Macau' },
  { codigo: '+60', pais: 'MY', bandeira: '🇲🇾', nome: 'Malásia' },
  { codigo: '+356', pais: 'MT', bandeira: '🇲🇹', nome: 'Malta' },
  { codigo: '+52', pais: 'MX', bandeira: '🇲🇽', nome: 'México' },
  { codigo: '+373', pais: 'MD', bandeira: '🇲🇩', nome: 'Moldávia' },
  { codigo: '+377', pais: 'MC', bandeira: '🇲🇨', nome: 'Mônaco' },
  { codigo: '+976', pais: 'MN', bandeira: '🇲🇳', nome: 'Mongólia' },
  { codigo: '+382', pais: 'ME', bandeira: '🇲🇪', nome: 'Montenegro' },
  { codigo: '+212', pais: 'MA', bandeira: '🇲🇦', nome: 'Marrocos' },
  { codigo: '+258', pais: 'MZ', bandeira: '🇲🇿', nome: 'Moçambique' },
  { codigo: '+264', pais: 'NA', bandeira: '🇳🇦', nome: 'Namíbia' },
  { codigo: '+977', pais: 'NP', bandeira: '🇳🇵', nome: 'Nepal' },
  { codigo: '+31', pais: 'NL', bandeira: '🇳🇱', nome: 'Países Baixos' },
  { codigo: '+64', pais: 'NZ', bandeira: '🇳🇿', nome: 'Nova Zelândia' },
  { codigo: '+505', pais: 'NI', bandeira: '🇳🇮', nome: 'Nicarágua' },
  { codigo: '+234', pais: 'NG', bandeira: '🇳🇬', nome: 'Nigéria' },
  { codigo: '+47', pais: 'NO', bandeira: '🇳🇴', nome: 'Noruega' },
  { codigo: '+968', pais: 'OM', bandeira: '🇴🇲', nome: 'Omã' },
  { codigo: '+92', pais: 'PK', bandeira: '🇵🇰', nome: 'Paquistão' },
  { codigo: '+507', pais: 'PA', bandeira: '🇵🇦', nome: 'Panamá' },
  { codigo: '+595', pais: 'PY', bandeira: '🇵🇾', nome: 'Paraguai' },
  { codigo: '+51', pais: 'PE', bandeira: '🇵🇪', nome: 'Peru' },
  { codigo: '+63', pais: 'PH', bandeira: '🇵🇭', nome: 'Filipinas' },
  { codigo: '+48', pais: 'PL', bandeira: '🇵🇱', nome: 'Polônia' },
  { codigo: '+351', pais: 'PT', bandeira: '🇵🇹', nome: 'Portugal' },
  { codigo: '+974', pais: 'QA', bandeira: '🇶🇦', nome: 'Catar' },
  { codigo: '+40', pais: 'RO', bandeira: '🇷🇴', nome: 'Romênia' },
  { codigo: '+7', pais: 'RU', bandeira: '🇷🇺', nome: 'Rússia' },
  { codigo: '+966', pais: 'SA', bandeira: '🇸🇦', nome: 'Arábia Saudita' },
  { codigo: '+381', pais: 'RS', bandeira: '🇷🇸', nome: 'Sérvia' },
  { codigo: '+65', pais: 'SG', bandeira: '🇸🇬', nome: 'Singapura' },
  { codigo: '+421', pais: 'SK', bandeira: '🇸🇰', nome: 'Eslováquia' },
  { codigo: '+386', pais: 'SI', bandeira: '🇸🇮', nome: 'Eslovênia' },
  { codigo: '+27', pais: 'ZA', bandeira: '🇿🇦', nome: 'África do Sul' },
  { codigo: '+82', pais: 'KR', bandeira: '🇰🇷', nome: 'Coreia do Sul' },
  { codigo: '+34', pais: 'ES', bandeira: '🇪🇸', nome: 'Espanha' },
  { codigo: '+94', pais: 'LK', bandeira: '🇱🇰', nome: 'Sri Lanka' },
  { codigo: '+46', pais: 'SE', bandeira: '🇸🇪', nome: 'Suécia' },
  { codigo: '+41', pais: 'CH', bandeira: '🇨🇭', nome: 'Suíça' },
  { codigo: '+886', pais: 'TW', bandeira: '🇹🇼', nome: 'Taiwan' },
  { codigo: '+66', pais: 'TH', bandeira: '🇹🇭', nome: 'Tailândia' },
  { codigo: '+90', pais: 'TR', bandeira: '🇹🇷', nome: 'Turquia' },
  { codigo: '+380', pais: 'UA', bandeira: '🇺🇦', nome: 'Ucrânia' },
  { codigo: '+971', pais: 'AE', bandeira: '🇦🇪', nome: 'Emirados Árabes' },
  { codigo: '+44', pais: 'GB', bandeira: '🇬🇧', nome: 'Reino Unido' },
  { codigo: '+598', pais: 'UY', bandeira: '🇺🇾', nome: 'Uruguai' },
  { codigo: '+998', pais: 'UZ', bandeira: '🇺🇿', nome: 'Uzbequistão' },
  { codigo: '+58', pais: 'VE', bandeira: '🇻🇪', nome: 'Venezuela' },
  { codigo: '+84', pais: 'VN', bandeira: '🇻🇳', nome: 'Vietnã' },
  { codigo: '+967', pais: 'YE', bandeira: '🇾🇪', nome: 'Iêmen' },
  { codigo: '+260', pais: 'ZM', bandeira: '🇿🇲', nome: 'Zâmbia' },
  { codigo: '+263', pais: 'ZW', bandeira: '🇿🇼', nome: 'Zimbábue' },
];

const profileSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  telefone: z.string().optional(),
});

const passwordSchema = z.object({
  novaSenha: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve ter ao menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve ter ao menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve ter ao menos um número'),
  confirmarSenha: z.string(),
}).refine((data) => data.novaSenha === data.confirmarSenha, {
  message: 'As senhas não conferem',
  path: ['confirmarSenha'],
});

export default function PerfilPage() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [paisSelecionado, setPaisSelecionado] = useState(PAISES[0]);
  const [telefoneLocal, setTelefoneLocal] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profileSchema),
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    watch: watchPassword,
    formState: { errors: errorsPassword },
  } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const watchedNovaSenha = watchPassword('novaSenha', '');

  useEffect(() => {
    carregarPerfil();
  }, []);

  const carregarPerfil = async () => {
    try {
      const res = await api.get('/auth/me');
      const userData = res.data.user;

      setValue('nome', userData.nome || '');

      // Processar telefone
      if (userData.telefone) {
        // Tentar identificar o pais pelo codigo
        const paisEncontrado = PAISES.find(p =>
          userData.telefone.startsWith(p.codigo)
        );

        if (paisEncontrado) {
          setPaisSelecionado(paisEncontrado);
          const numeroSemCodigo = userData.telefone.replace(paisEncontrado.codigo, '').trim();
          setTelefoneLocal(numeroSemCodigo);
        } else {
          setTelefoneLocal(userData.telefone);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast.error('Erro ao carregar dados do perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleTelefoneChange = (e) => {
    // Aplica máscara brasileira se o país selecionado for Brasil
    if (paisSelecionado.pais === 'BR') {
      setTelefoneLocal(mascaraTelefone(e.target.value));
    } else {
      // Permite apenas numeros, espacos, parenteses e hifens
      const valor = e.target.value.replace(/[^\d\s()-]/g, '');
      setTelefoneLocal(valor);
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      // Montar telefone completo
      const telefoneCompleto = telefoneLocal
        ? `${paisSelecionado.codigo} ${telefoneLocal}`
        : null;

      const payload = {
        nome: data.nome,
        telefone: telefoneCompleto,
      };

      const res = await api.put('/auth/profile', payload);

      // Atualizar contexto do usuario
      if (setUser && res.data.user) {
        setUser(res.data.user);
      }

      toast.success('Perfil atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast.error(error.message || 'Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const onSubmitPassword = async (data) => {
    setSavingPassword(true);
    try {
      await api.put('/auth/change-password', {
        newPassword: data.novaSenha,
      });

      toast.success('Senha alterada com sucesso');
      resetPassword();
      setShowPasswordForm(false);
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      toast.error(error.response?.data?.error || 'Erro ao alterar senha');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-quatrelati-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <Header
        title="Meu Perfil"
        subtitle="Gerencie suas informacoes pessoais"
      />

      <div className="grid md:grid-cols-3 gap-6">
        {/* Card com avatar e info do Gravatar */}
        <Card className="p-6 md:col-span-1">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <Gravatar
                email={user?.email}
                name={user?.nome}
                size={120}
                className="ring-4 ring-quatrelati-blue-100 dark:ring-quatrelati-gold-900/30"
              />
            </div>

            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {user?.nome}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user?.email}
              </p>
              <span className="inline-block mt-2 px-3 py-1 text-xs font-medium bg-quatrelati-blue-100 dark:bg-quatrelati-gold-900/30 text-quatrelati-blue-700 dark:text-quatrelati-gold-400 rounded-full capitalize">
                {user?.nivel}
              </span>
            </div>

            {/* Info sobre Gravatar */}
            <div className="w-full p-4 bg-blue-50 dark:bg-gray-800 rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-quatrelati-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Foto de Perfil
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    Sua foto e carregada automaticamente do Gravatar usando seu email.
                    Para alterar, acesse o Gravatar.
                  </p>
                  <a
                    href="https://gravatar.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-quatrelati-blue-600 dark:text-quatrelati-gold-400 hover:underline"
                  >
                    Acessar Gravatar
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Formulario de edicao */}
        <Card className="p-6 md:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-quatrelati-blue-500" />
                Informacoes Pessoais
              </h3>

              <div className="space-y-4">
                <Input
                  label="Nome completo"
                  placeholder="Seu nome"
                  error={errors.nome?.message}
                  {...register('nome')}
                />

                {/* Email (somente leitura) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="input-glass pl-10 bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-70"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    O email nao pode ser alterado
                  </p>
                </div>

                {/* Telefone com bandeira */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Telefone
                  </label>
                  <div className="flex gap-2">
                    {/* Seletor de pais */}
                    <div className="relative">
                      <select
                        value={paisSelecionado.pais}
                        onChange={(e) => {
                          const novoPais = PAISES.find(p => p.pais === e.target.value);
                          if (novoPais) {
                            setPaisSelecionado(novoPais);
                          }
                        }}
                        className="input-glass pr-2 pl-10 w-32 appearance-none cursor-pointer"
                      >
                        {PAISES.map((pais) => (
                          <option key={pais.pais} value={pais.pais}>
                            {pais.codigo}
                          </option>
                        ))}
                      </select>
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
                        {paisSelecionado.bandeira}
                      </span>
                    </div>

                    {/* Input do telefone */}
                    <div className="flex-1 relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={telefoneLocal}
                        onChange={handleTelefoneChange}
                        placeholder="Numero do telefone"
                        className="input-glass pl-10 w-full"
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {paisSelecionado.nome} ({paisSelecionado.codigo})
                  </p>
                </div>
              </div>
            </div>

            {/* Informacoes da conta */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-quatrelati-blue-500" />
                Informacoes da Conta
              </h3>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Nivel de acesso:</span>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">
                    {user?.nivel}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Status:</span>
                  <p className="font-medium text-green-600 dark:text-green-400">
                    Ativo
                  </p>
                </div>
              </div>
            </div>

            {/* Botao salvar */}
            <div className="flex justify-end pt-4">
              <Button type="submit" loading={saving}>
                <Save className="w-4 h-4" />
                Salvar Alteracoes
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Card de alteração de senha */}
      <Card className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-quatrelati-blue-500" />
            Seguranca
          </h3>

          {!showPasswordForm && (
            <Button
              variant="outline"
              onClick={() => setShowPasswordForm(true)}
            >
              <Lock className="w-4 h-4" />
              Alterar Senha
            </Button>
          )}
        </div>

        {showPasswordForm && (
          <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="mt-6 space-y-6">
            <div className="space-y-4 max-w-md">
              <div>
                <Input
                  label="Nova Senha"
                  type="password"
                  placeholder="Digite a nova senha"
                  error={errorsPassword.novaSenha?.message}
                  {...registerPassword('novaSenha')}
                />
                <PasswordStrength password={watchedNovaSenha} />
              </div>

              <Input
                label="Confirmar Nova Senha"
                type="password"
                placeholder="Confirme a nova senha"
                error={errorsPassword.confirmarSenha?.message}
                {...registerPassword('confirmarSenha')}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPasswordForm(false);
                  resetPassword();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={savingPassword}>
                <Lock className="w-4 h-4" />
                Salvar Nova Senha
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
