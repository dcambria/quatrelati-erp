'use client';

/**
 * ===========================================
 * Quatrelati - Tela de Login
 * Design Apple HIG com Glassmorphism
 * v2.8.1 - Corrige tratamento de erros da API
 * ===========================================
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  KeyRound,
  Phone,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import BureauFooter from '../../components/common/BureauFooter';
import PhoneInput from '../../components/ui/PhoneInput';
import api from '../../lib/api';
import { senhaForteSchema } from '../../lib/validations';

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'Senha e obrigatoria'),
});

const magicLinkSchema = z.object({
  email: z.string().email('Email invalido'),
});

const whatsappSchema = z.object({
  phone: z.string().min(10, 'Telefone deve ter no minimo 10 digitos'),
});

const codeSchema = z.object({
  code: z.string().length(6, 'Codigo deve ter 6 digitos'),
});

const resetSchema = z.object({
  newPassword: senhaForteSchema,
  confirmPassword: z.string().min(1, 'Confirmacao e obrigatoria'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Senhas nao conferem',
  path: ['confirmPassword'],
});

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'recovery' | 'magic-sent' | 'whatsapp-code' | 'reset-password'
  const [recoveryMethod, setRecoveryMethod] = useState('email'); // 'email' | 'whatsapp'
  const [whatsappLink, setWhatsappLink] = useState(null);
  const [resetToken, setResetToken] = useState(null);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const magicForm = useForm({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: '' },
  });

  const whatsappForm = useForm({
    resolver: zodResolver(whatsappSchema),
    defaultValues: { phone: '' },
  });

  const codeForm = useForm({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  const resetForm = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  const onLoginSubmit = async (data) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Login realizado com sucesso!');
    } catch (error) {
      console.error('Erro no login:', error);
      toast.error(error.message || 'Credenciais invalidas');
      // Limpar apenas a senha, mantendo o email
      loginForm.setValue('password', '');
    } finally {
      setLoading(false);
    }
  };

  const onMagicLinkSubmit = async (data) => {
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: data.email });
      setMode('magic-sent');
      toast.success('Link enviado! Verifique seu email.');
    } catch (error) {
      console.error('Erro ao enviar magic link:', error);
      toast.error('Erro ao enviar link de acesso');
    } finally {
      setLoading(false);
    }
  };

  const onWhatsappSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password-whatsapp', { phone: data.phone });
      if (res.data.success && res.data.email) {
        // Usuário encontrado - salvar email e avançar
        setRecoveryEmail(res.data.email);
        setMode('whatsapp-code');
        toast.success(res.data.message || 'Codigo enviado via WhatsApp!');

        // Se devCode (modo dev), mostrar no toast
        if (res.data.devCode) {
          toast(`Codigo de desenvolvimento: ${res.data.devCode}`, { icon: '🔑', duration: 15000 });
        }
      } else {
        // Telefone não encontrado - mostrar mensagem genérica
        toast.success('Se o numero estiver cadastrado, voce recebera um codigo via WhatsApp');
      }
    } catch (error) {
      console.error('Erro ao solicitar recuperacao:', error);
      toast.error(error.message || 'Erro ao processar solicitacao');
    } finally {
      setLoading(false);
    }
  };

  const onCodeSubmit = async (data) => {
    setLoading(true);
    try {
      // Usa o recoveryEmail armazenado na etapa anterior
      const res = await api.post('/auth/verify-whatsapp-code', { email: recoveryEmail, code: data.code });
      setResetToken(res.data.resetToken);
      setMode('reset-password');
      toast.success('Codigo verificado! Defina sua nova senha.');
    } catch (error) {
      console.error('Erro ao verificar codigo:', error);
      toast.error(error.message || 'Codigo invalido ou expirado');
    } finally {
      setLoading(false);
    }
  };

  const onResetSubmit = async (data) => {
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token: resetToken, newPassword: data.newPassword });
      toast.success('Senha redefinida com sucesso!');
      setMode('login');
      setResetToken(null);
      setWhatsappLink(null);
      resetForm.reset();
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      toast.error(error.message || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-quatrelati-blue-950 via-quatrelati-blue-900 to-quatrelati-blue-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-quatrelati-gold-500/20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-quatrelati-gold-400 animate-spin" />
          </div>
          <p className="text-white/60 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-quatrelati-blue-950 via-quatrelati-blue-900 to-quatrelati-blue-950 p-4 overflow-hidden">
      {/* Background com efeitos */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Gradientes base */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-quatrelati-blue-800/40 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-quatrelati-blue-900/50 via-transparent to-transparent" />

        {/* Orbs dourados animados */}
        <div className="absolute top-[10%] right-[15%] w-[500px] h-[500px] bg-quatrelati-gold-500/15 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[15%] left-[10%] w-[400px] h-[400px] bg-quatrelati-gold-400/10 rounded-full blur-[100px] animate-pulse-slow [animation-delay:1s]" />
        <div className="absolute top-[40%] right-[5%] w-[300px] h-[300px] bg-quatrelati-gold-600/10 rounded-full blur-[80px] animate-pulse-slow [animation-delay:2s]" />

        {/* Orbs azuis */}
        <div className="absolute top-[5%] left-[25%] w-[600px] h-[600px] bg-quatrelati-blue-600/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-[10%] right-[20%] w-[400px] h-[400px] bg-quatrelati-blue-500/5 rounded-full blur-[100px]" />

        {/* Grid sutil */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="w-full max-w-md relative flex-1 flex flex-col justify-center">
        {/* Logo com animacao */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-block mb-6 transform hover:scale-105 transition-transform duration-300">
            <Image
              src="/logo-quatrelati-login.png"
              alt="Quatrelati"
              width={280}
              height={130}
              className="object-contain drop-shadow-[0_0_40px_rgba(212,160,23,0.4)]"
              priority
            />
          </div>
          <p className="text-quatrelati-gold-300/80 font-medium text-base tracking-wide">
            Sistema de Gestao de Pedidos
          </p>
        </div>

        {/* Card glassmorphism */}
        <div className="relative animate-fade-in-up [animation-delay:0.1s]">
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-quatrelati-gold-500/20 via-quatrelati-blue-600/10 to-quatrelati-gold-500/20 rounded-3xl blur-xl opacity-60" />

          {/* Card */}
          <div className="relative bg-white/[0.07] backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-2xl shadow-black/20">
            {/* Header do card */}
            {mode === 'login' && (
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-white mb-2">
                  Bem-vindo de volta
                </h2>
                <p className="text-white/50 text-sm">
                  Entre com suas credenciais para acessar o sistema
                </p>
              </div>
            )}

            {/* Form de Login */}
            {mode === 'login' && (
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                {/* Email */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/70">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      className={`
                        w-full pl-12 pr-4 py-3.5 rounded-xl
                        bg-white/[0.07] border border-white/10
                        text-white placeholder-white/30
                        focus:outline-none focus:border-quatrelati-gold-500/50 focus:ring-2 focus:ring-quatrelati-gold-500/20
                        transition-all duration-200
                        ${loginForm.formState.errors.email ? 'border-red-500/50' : ''}
                      `}
                      {...loginForm.register('email')}
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-red-400">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                {/* Senha */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/70">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="********"
                      className={`
                        w-full pl-12 pr-12 py-3.5 rounded-xl
                        bg-white/[0.07] border border-white/10
                        text-white placeholder-white/30
                        focus:outline-none focus:border-quatrelati-gold-500/50 focus:ring-2 focus:ring-quatrelati-gold-500/20
                        transition-all duration-200
                        ${loginForm.formState.errors.password ? 'border-red-500/50' : ''}
                      `}
                      {...loginForm.register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-red-400">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                {/* Botao de login */}
                <button
                  type="submit"
                  disabled={loading}
                  className="
                    w-full py-3.5 px-6 rounded-xl
                    bg-gradient-to-r from-quatrelati-gold-500 to-quatrelati-gold-600
                    text-white font-semibold
                    hover:from-quatrelati-gold-400 hover:to-quatrelati-gold-500
                    focus:outline-none focus:ring-2 focus:ring-quatrelati-gold-500/50
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transform hover:scale-[1.02] active:scale-[0.98]
                    transition-all duration-200
                    shadow-lg shadow-quatrelati-gold-500/25
                    flex items-center justify-center gap-2
                  "
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Entrar
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Esqueci minha senha */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setMode('recovery')}
                    className="text-sm text-white/50 hover:text-quatrelati-gold-400 transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </form>
            )}

            {/* Form de Recuperacao Unificado */}
            {mode === 'recovery' && (
              <div className="space-y-5">
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-semibold text-white mb-2">
                    Recuperar senha
                  </h2>
                  <p className="text-white/50 text-sm">
                    Escolha como deseja receber o codigo de recuperacao
                  </p>
                </div>

                {/* Seletor de metodo */}
                <div className="flex gap-2 p-1 bg-white/[0.05] rounded-xl">
                  <button
                    type="button"
                    onClick={() => setRecoveryMethod('email')}
                    className={`
                      flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200
                      flex items-center justify-center gap-2
                      ${recoveryMethod === 'email'
                        ? 'bg-quatrelati-gold-500 text-white shadow-lg'
                        : 'text-white/60 hover:text-white/80'
                      }
                    `}
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecoveryMethod('whatsapp')}
                    className={`
                      flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200
                      flex items-center justify-center gap-2
                      ${recoveryMethod === 'whatsapp'
                        ? 'bg-green-500 text-white shadow-lg'
                        : 'text-white/60 hover:text-white/80'
                      }
                    `}
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </button>
                </div>

                {/* Form por Email */}
                {recoveryMethod === 'email' && (
                  <form onSubmit={magicForm.handleSubmit(onMagicLinkSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-white/70">
                        Seu email cadastrado
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                        <input
                          type="email"
                          placeholder="seu@email.com"
                          className={`
                            w-full pl-12 pr-4 py-3.5 rounded-xl
                            bg-white/[0.07] border border-white/10
                            text-white placeholder-white/30
                            focus:outline-none focus:border-quatrelati-gold-500/50 focus:ring-2 focus:ring-quatrelati-gold-500/20
                            transition-all duration-200
                            ${magicForm.formState.errors.email ? 'border-red-500/50' : ''}
                          `}
                          {...magicForm.register('email')}
                        />
                      </div>
                      {magicForm.formState.errors.email && (
                        <p className="text-sm text-red-400">{magicForm.formState.errors.email.message}</p>
                      )}
                      <p className="text-xs text-white/40">
                        Voce recebera um link de recuperacao no seu email
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="
                        w-full py-3.5 px-6 rounded-xl
                        bg-gradient-to-r from-quatrelati-gold-500 to-quatrelati-gold-600
                        text-white font-semibold
                        hover:from-quatrelati-gold-400 hover:to-quatrelati-gold-500
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200
                        flex items-center justify-center gap-2
                      "
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Mail className="w-5 h-5" />
                          Enviar link
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Form por WhatsApp */}
                {recoveryMethod === 'whatsapp' && (
                  <form onSubmit={whatsappForm.handleSubmit(onWhatsappSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Controller
                        name="phone"
                        control={whatsappForm.control}
                        render={({ field }) => (
                          <PhoneInput
                            label="Numero de WhatsApp cadastrado"
                            variant="dark"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            onBlur={field.onBlur}
                            name={field.name}
                            error={whatsappForm.formState.errors.phone?.message}
                          />
                        )}
                      />
                      <p className="text-xs text-white/40">
                        Voce recebera um codigo de 6 digitos via WhatsApp
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="
                        w-full py-3.5 px-6 rounded-xl
                        bg-gradient-to-r from-green-500 to-green-600
                        text-white font-semibold
                        hover:from-green-400 hover:to-green-500
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200
                        flex items-center justify-center gap-2
                      "
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <MessageCircle className="w-5 h-5" />
                          Enviar codigo
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Voltar */}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full py-3 px-6 rounded-xl text-white/50 font-medium hover:text-white/70 transition-colors duration-200"
                >
                  Voltar ao login
                </button>
              </div>
            )}

            {/* Email enviado */}
            {mode === 'magic-sent' && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                  </div>
                  <h2 className="text-2xl font-semibold text-white mb-2">
                    Email enviado!
                  </h2>
                  <p className="text-white/50 text-sm">
                    Verifique sua caixa de entrada e clique no link para redefinir sua senha
                  </p>
                  <p className="text-white/40 text-xs mt-2">
                    O link expira em 15 minutos
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="
                    w-full py-3 px-6 rounded-xl
                    bg-white/[0.05] border border-white/10
                    text-white/70 font-medium
                    hover:bg-white/[0.08] hover:text-white
                    transition-all duration-200
                  "
                >
                  Voltar ao login
                </button>
              </div>
            )}

            {/* Form WhatsApp - Inserir codigo */}
            {mode === 'whatsapp-code' && (
              <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="space-y-5">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-500/20 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-sm text-green-300">
                    Enviamos um codigo de verificacao para o seu WhatsApp.
                  </p>
                  {recoveryEmail && (
                    <p className="text-xs text-white/40 mt-2">
                      Conta: {recoveryEmail}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/70">
                    Digite o codigo de 6 digitos
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      autoFocus
                      className={`
                        w-full px-4 py-4 rounded-xl text-center text-3xl tracking-[0.6em] font-mono
                        bg-white/[0.07] border border-white/10
                        text-white placeholder-white/20
                        focus:outline-none focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20
                        transition-all duration-200
                        ${codeForm.formState.errors.code ? 'border-red-500/50' : ''}
                      `}
                      {...codeForm.register('code')}
                    />
                  </div>
                  {codeForm.formState.errors.code && (
                    <p className="text-sm text-red-400 text-center">{codeForm.formState.errors.code.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="
                    w-full py-3.5 px-6 rounded-xl
                    bg-gradient-to-r from-green-500 to-green-600
                    text-white font-semibold
                    hover:from-green-400 hover:to-green-500
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200
                    flex items-center justify-center gap-2
                  "
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Verificar codigo
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setMode('recovery')}
                  className="w-full py-3 px-6 rounded-xl text-white/50 font-medium hover:text-white/70 transition-colors duration-200"
                >
                  Reenviar codigo
                </button>

                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full py-2 px-6 rounded-xl text-white/40 text-sm hover:text-white/60 transition-colors duration-200"
                >
                  Voltar ao login
                </button>
              </form>
            )}

            {/* Form Redefinir Senha */}
            {mode === 'reset-password' && (
              <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-5">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <KeyRound className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white text-center mb-4">
                  Defina sua nova senha
                </h3>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/70">
                    Nova senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="********"
                      className={`
                        w-full pl-12 pr-12 py-3.5 rounded-xl
                        bg-white/[0.07] border border-white/10
                        text-white placeholder-white/30
                        focus:outline-none focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20
                        transition-all duration-200
                        ${resetForm.formState.errors.newPassword ? 'border-red-500/50' : ''}
                      `}
                      {...resetForm.register('newPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {resetForm.formState.errors.newPassword && (
                    <p className="text-sm text-red-400">{resetForm.formState.errors.newPassword.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/70">
                    Confirmar senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="********"
                      className={`
                        w-full pl-12 pr-4 py-3.5 rounded-xl
                        bg-white/[0.07] border border-white/10
                        text-white placeholder-white/30
                        focus:outline-none focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20
                        transition-all duration-200
                        ${resetForm.formState.errors.confirmPassword ? 'border-red-500/50' : ''}
                      `}
                      {...resetForm.register('confirmPassword')}
                    />
                  </div>
                  {resetForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-400">{resetForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="
                    w-full py-3.5 px-6 rounded-xl
                    bg-gradient-to-r from-green-500 to-green-600
                    text-white font-semibold
                    hover:from-green-400 hover:to-green-500
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200
                    flex items-center justify-center gap-2
                  "
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Redefinir senha</>
                  )}
                </button>
              </form>
            )}

            {/* Footer do card */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-xs text-center text-white/30">
                Laticinio Quatrelati - Fabricando Manteiga para Industria e Food Service
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bureau footer */}
      <BureauFooter className="relative z-10 mt-8" variant="dark" />
    </div>
  );
}
