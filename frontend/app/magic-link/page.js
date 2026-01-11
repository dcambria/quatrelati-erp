'use client';

/**
 * ===========================================
 * Quatrelati - Validacao de Magic Link
 * Design Apple HIG com Glassmorphism
 * v1.1.0
 * ===========================================
 */

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import BureauFooter from '../components/common/BureauFooter';

function MagicLinkContent() {
  const [status, setStatus] = useState('validating'); // 'validating' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [hasValidated, setHasValidated] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading: authLoading } = useAuth();

  useEffect(() => {
    const validateToken = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setErrorMessage('Token nao fornecido');
        return;
      }

      try {
        console.log('[MagicLink] Validando token:', token.substring(0, 20) + '...');
        const response = await api.post('/auth/verify-magic-link', { token });
        console.log('[MagicLink] Resposta:', response.data);
        const { user, accessToken, refreshToken } = response.data;

        // Salvar tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);

        setStatus('success');
        toast.success(`Bem-vindo, ${user.nome}!`);

        // Redirecionar apos 2 segundos
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } catch (error) {
        console.error('[MagicLink] Erro ao validar:', error);
        setStatus('error');
        setErrorMessage(error.message || 'Link invalido ou expirado');
      }
    };

    // Prevenir dupla execucao (React Strict Mode)
    if (!authLoading && !hasValidated) {
      setHasValidated(true);
      validateToken();
    }
  }, [searchParams, authLoading, hasValidated]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-quatrelati-blue-950 via-quatrelati-blue-900 to-quatrelati-blue-950 p-4">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-quatrelati-blue-800/40 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-quatrelati-blue-900/50 via-transparent to-transparent" />
        <div className="absolute top-[10%] right-[15%] w-[500px] h-[500px] bg-quatrelati-gold-500/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-[15%] left-[10%] w-[400px] h-[400px] bg-quatrelati-gold-400/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative flex-1 flex flex-col justify-center">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/logo-quatrelati-login.png"
            alt="Quatrelati"
            width={220}
            height={100}
            className="object-contain mx-auto drop-shadow-[0_0_30px_rgba(212,160,23,0.3)]"
            priority
          />
        </div>

        {/* Card */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-quatrelati-gold-500/20 via-quatrelati-blue-600/10 to-quatrelati-gold-500/20 rounded-3xl blur-xl opacity-60" />

          <div className="relative bg-white/[0.07] backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-2xl">
            {/* Validando */}
            {status === 'validating' && (
              <div className="text-center py-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-quatrelati-gold-500/20 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-quatrelati-gold-400 animate-spin" />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">
                  Validando acesso...
                </h2>
                <p className="text-white/50 text-sm">
                  Aguarde enquanto verificamos seu link
                </p>
              </div>
            )}

            {/* Sucesso */}
            {status === 'success' && (
              <div className="text-center py-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center animate-bounce-once">
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">
                  Acesso autorizado!
                </h2>
                <p className="text-white/50 text-sm mb-6">
                  Redirecionando para o sistema...
                </p>
                <div className="flex justify-center">
                  <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
                </div>
              </div>
            )}

            {/* Erro */}
            {status === 'error' && (
              <div className="text-center py-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-red-400" />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">
                  Link invalido
                </h2>
                <p className="text-white/50 text-sm mb-6">
                  {errorMessage}
                </p>
                <button
                  onClick={() => router.push('/login')}
                  className="
                    inline-flex items-center gap-2 px-6 py-3 rounded-xl
                    bg-gradient-to-r from-quatrelati-gold-500 to-quatrelati-gold-600
                    text-white font-semibold
                    hover:from-quatrelati-gold-400 hover:to-quatrelati-gold-500
                    transform hover:scale-[1.02] active:scale-[0.98]
                    transition-all duration-200
                    shadow-lg shadow-quatrelati-gold-500/25
                  "
                >
                  Voltar ao login
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <BureauFooter className="relative z-10 mt-8" variant="dark" />
    </div>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-quatrelati-blue-950 via-quatrelati-blue-900 to-quatrelati-blue-950">
        <Loader2 className="w-8 h-8 text-quatrelati-gold-400 animate-spin" />
      </div>
    }>
      <MagicLinkContent />
    </Suspense>
  );
}
