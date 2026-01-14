'use client';
// =====================================================
// Modal de Primeiro Acesso
// v1.0.0 - Solicita atualização de dados no primeiro login
// =====================================================

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import {
  User,
  Phone,
  Lock,
  Sparkles,
  ArrowRight,
  Check,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import PhoneInput from './PhoneInput';
import PasswordStrength from './PasswordStrength';

const firstAccessSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  telefone: z.string().optional(),
  senha: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve ter ao menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve ter ao menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve ter ao menos um número'),
  confirmarSenha: z.string(),
}).refine((data) => data.senha === data.confirmarSenha, {
  message: 'As senhas não conferem',
  path: ['confirmarSenha'],
});

export default function FirstAccessModal({ isOpen, onComplete }) {
  const { user, setUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1); // 1: dados, 2: senha

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(firstAccessSchema),
    defaultValues: {
      nome: user?.nome || '',
      telefone: user?.telefone || '',
      senha: '',
      confirmarSenha: '',
    },
  });

  const watchedPassword = watch('senha', '');

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      // Atualizar perfil (nome e telefone)
      const profileRes = await api.put('/auth/profile', {
        nome: data.nome,
        telefone: data.telefone || null,
      });

      // Atualizar senha
      // Para primeiro acesso, não precisa da senha atual
      await api.post('/auth/set-initial-password', {
        newPassword: data.senha,
      });

      // Atualizar contexto do usuário
      if (setUser && profileRes.data.user) {
        setUser({
          ...profileRes.data.user,
          primeiro_acesso: false,
        });
      }

      toast.success('Dados atualizados com sucesso! Bem-vindo ao sistema.');
      onComplete?.();
    } catch (error) {
      console.error('Erro ao salvar dados:', error);

      // Se o endpoint de senha inicial não existir, tentar criar a senha de outra forma
      if (error.response?.status === 404) {
        try {
          // Fallback: atualizar apenas o perfil
          const profileRes = await api.put('/auth/profile', {
            nome: data.nome,
            telefone: data.telefone || null,
          });

          if (setUser && profileRes.data.user) {
            setUser({
              ...profileRes.data.user,
              primeiro_acesso: false,
            });
          }

          toast.success('Perfil atualizado! Configure sua senha na página de perfil.');
          onComplete?.();
        } catch (profileError) {
          toast.error(profileError.message || 'Erro ao salvar dados');
        }
      } else {
        toast.error(error.message || 'Erro ao salvar dados');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Não permite fechar sem completar
      title=""
      size="md"
      showCloseButton={false}
    >
      <div className="text-center mb-6">
        {/* Ícone de boas-vindas */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-quatrelati-gold-400 to-quatrelati-gold-600 mb-4">
          <Sparkles className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Bem-vindo ao Quatrelati!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Complete seu cadastro para começar a usar o sistema.
        </p>
      </div>

      {/* Indicador de passos */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
          step >= 1 ? 'bg-quatrelati-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
        }`}>
          {step > 1 ? <Check className="w-4 h-4" /> : '1'}
        </div>
        <div className={`w-12 h-1 rounded transition-colors ${
          step > 1 ? 'bg-quatrelati-blue-500' : 'bg-gray-200 dark:bg-gray-700'
        }`} />
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
          step >= 2 ? 'bg-quatrelati-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
        }`}>
          2
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {step === 1 && (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="w-4 h-4 text-quatrelati-blue-500" />
                Dados Pessoais
              </div>

              <Input
                label="Nome completo"
                placeholder="Seu nome"
                error={errors.nome?.message}
                {...register('nome')}
              />

              <Controller
                name="telefone"
                control={control}
                render={({ field }) => (
                  <PhoneInput
                    label="Telefone / WhatsApp"
                    error={errors.telefone?.message}
                    {...field}
                  />
                )}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="button"
                onClick={() => setStep(2)}
              >
                Próximo
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Lock className="w-4 h-4 text-quatrelati-blue-500" />
                Defina sua Senha
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Crie uma senha segura para proteger sua conta.
              </p>

              <div>
                <Input
                  label="Nova Senha"
                  type="password"
                  placeholder="Digite sua senha"
                  error={errors.senha?.message}
                  {...register('senha')}
                />
                <PasswordStrength password={watchedPassword} />
              </div>

              <Input
                label="Confirmar Senha"
                type="password"
                placeholder="Confirme sua senha"
                error={errors.confirmarSenha?.message}
                {...register('confirmarSenha')}
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
              >
                Voltar
              </Button>
              <Button
                type="submit"
                loading={saving}
              >
                <Check className="w-4 h-4 mr-1" />
                Concluir Cadastro
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
