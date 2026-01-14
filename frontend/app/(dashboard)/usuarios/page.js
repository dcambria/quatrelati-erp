'use client';

// =====================================================
// Página de Usuários
// v1.3.0 - Admin pode gerenciar usuários (exceto superadmin)
// =====================================================

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Edit2,
  Trash2,
  UserCog,
  Shield,
  ShieldCheck,
  User,
  Mail,
  Phone,
  Send,
  Lock,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/layout/Header';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Loading from '../../components/ui/Loading';
import Gravatar from '../../components/ui/Gravatar';
import PhoneInput from '../../components/ui/PhoneInput';
import PasswordStrength from '../../components/ui/PasswordStrength';
import { senhaForteOpcionalSchema } from '../../lib/validations';

const usuarioSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  telefone: z.string().optional(),
  senha: senhaForteOpcionalSchema,
  nivel: z.string().min(1, 'Nível é obrigatório'),
});

const NIVEIS = [
  { value: 'vendedor', label: 'Vendedor', icon: User },
  { value: 'admin', label: 'Administrador', icon: Shield },
  { value: 'superadmin', label: 'Super Administrador', icon: ShieldCheck },
];

export default function UsuariosPage() {
  const { isSuperAdmin, isAdmin, user: currentUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Admin ou superadmin pode acessar
  const canAccess = isSuperAdmin || isAdmin;

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(usuarioSchema),
  });

  const watchedPassword = watch('senha', '');

  // Verifica se pode editar/excluir um usuário
  const canEditUser = (usuario) => {
    // Não pode editar a si mesmo (exceto visualizar)
    if (usuario.id === currentUser?.id) return false;
    // Superadmin pode editar qualquer um
    if (isSuperAdmin) return true;
    // Admin não pode editar superadmin
    if (usuario.nivel === 'superadmin') return false;
    return true;
  };

  useEffect(() => {
    if (!canAccess) {
      toast.error('Acesso não autorizado');
      router.push('/');
      return;
    }
    carregarUsuarios();
  }, [canAccess, router]);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const res = await api.get('/usuarios');
      setUsuarios(res.data.usuarios);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (usuario = null) => {
    if (usuario) {
      setEditingUsuario(usuario);
      reset({
        nome: usuario.nome || '',
        email: usuario.email || '',
        telefone: usuario.telefone || '',
        senha: '',
        nivel: usuario.nivel || 'vendedor',
      });
    } else {
      setEditingUsuario(null);
      reset({
        nome: '',
        email: '',
        telefone: '',
        senha: '',
        nivel: 'vendedor',
      });
    }
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setEditingUsuario(null);
    reset();
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = {
        nome: data.nome,
        email: data.email,
        telefone: data.telefone || null,
        nivel: data.nivel,
      };

      if (data.senha) {
        payload.senha = data.senha;
      }

      if (editingUsuario) {
        await api.put(`/usuarios/${editingUsuario.id}`, payload);
        toast.success('Usuário atualizado com sucesso');
      } else {
        if (!data.senha) {
          toast.error('Senha é obrigatória para novos usuários');
          setSaving(false);
          return;
        }
        await api.post('/usuarios', payload);
        toast.success('Usuário criado com sucesso');
      }

      fecharModal();
      carregarUsuarios();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      toast.error(error.message || 'Erro ao salvar usuário');
    } finally {
      setSaving(false);
    }
  };

  const enviarConvite = async (data) => {
    setSendingInvite(true);
    try {
      const payload = {
        nome: data.nome,
        email: data.email,
        nivel: data.nivel,
      };

      await api.post('/usuarios/invite', payload);
      toast.success('Convite enviado com sucesso');

      fecharModal();
      carregarUsuarios();
    } catch (error) {
      console.error('Erro ao enviar convite:', error);
      toast.error(error.message || 'Erro ao enviar convite');
    } finally {
      setSendingInvite(false);
    }
  };

  const reenviarConvite = async (usuario) => {
    try {
      await api.post(`/usuarios/${usuario.id}/invite`);
      toast.success('Convite reenviado com sucesso');
    } catch (error) {
      console.error('Erro ao reenviar convite:', error);
      toast.error(error.message || 'Erro ao reenviar convite');
    }
  };

  const toggleAtivo = async (usuario) => {
    try {
      await api.put(`/usuarios/${usuario.id}`, { ativo: !usuario.ativo });
      toast.success(`Usuário ${usuario.ativo ? 'desativado' : 'ativado'} com sucesso`);
      carregarUsuarios();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error(error.message || 'Erro ao alterar status');
    }
  };

  const excluirUsuario = async (id) => {
    try {
      await api.delete(`/usuarios/${id}`);
      toast.success('Usuário excluído/desativado com sucesso');
      setDeleteConfirm(null);
      carregarUsuarios();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast.error(error.message || 'Erro ao excluir usuário');
    }
  };

  const getNivelInfo = (nivel) => {
    return NIVEIS.find(n => n.value === nivel) || NIVEIS[0];
  };

  if (!canAccess) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <Header
        title="Usuários"
        subtitle={`${usuarios.length} usuários cadastrados`}
        actions={
          <Button onClick={() => abrirModal()}>
            <Plus className="w-4 h-4" />
            Novo Usuário
          </Button>
        }
      />

      {/* Grid de Usuários */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="skeleton-quatrelati h-6 w-3/4 mb-4" />
              <div className="skeleton-quatrelati h-4 w-full mb-2" />
              <div className="skeleton-quatrelati h-4 w-2/3" />
            </Card>
          ))}
        </div>
      ) : usuarios.length === 0 ? (
        <Card className="p-12 text-center">
          <UserCog className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nenhum usuário encontrado</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {usuarios.map((usuario) => {
            const nivelInfo = getNivelInfo(usuario.nivel);
            const Icon = nivelInfo.icon;
            const isCurrentUser = usuario.id === currentUser?.id;

            return (
              <Card key={usuario.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Gravatar
                        email={usuario.email}
                        name={usuario.nome}
                        size={48}
                        className={`ring-2 ${
                          usuario.nivel === 'superadmin'
                            ? 'ring-quatrelati-gold-500'
                            : usuario.nivel === 'admin'
                            ? 'ring-quatrelati-blue-500'
                            : 'ring-gray-300 dark:ring-gray-600'
                        }`}
                      />
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                        usuario.nivel === 'superadmin'
                          ? 'bg-quatrelati-gold-500'
                          : usuario.nivel === 'admin'
                          ? 'bg-quatrelati-blue-500'
                          : 'bg-gray-500'
                      }`}>
                        <Icon className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        {usuario.nome}
                        {isCurrentUser && (
                          <span className="text-xs text-quatrelati-gold-600">(você)</span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {nivelInfo.label}
                      </p>
                    </div>
                  </div>
                  <Badge variant={usuario.ativo ? 'success' : 'error'}>
                    {usuario.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate flex-1">{usuario.email}</span>
                    {!isCurrentUser && usuario.ativo && (
                      <button
                        onClick={() => reenviarConvite(usuario)}
                        className="p-1.5 hover:bg-quatrelati-blue-100 dark:hover:bg-quatrelati-blue-900/30 rounded-lg transition-colors text-quatrelati-blue-600"
                        title="Reenviar email de acesso"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {usuario.telefone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span>{usuario.telefone}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {canEditUser(usuario) ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => abrirModal(usuario)}
                      >
                        <Edit2 className="w-4 h-4" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAtivo(usuario)}
                        className={usuario.ativo ? 'text-orange-600' : 'text-green-600'}
                      >
                        {usuario.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-500/10"
                        onClick={() => setDeleteConfirm(usuario)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  ) : isCurrentUser ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => abrirModal(usuario)}
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </Button>
                  ) : (
                    <div className="flex-1 flex items-center justify-center gap-2 text-sm text-gray-400">
                      <Lock className="w-4 h-4" />
                      <span>Protegido</span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Usuário */}
      <Modal
        isOpen={modalOpen}
        onClose={fecharModal}
        title={editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nome"
            error={errors.nome?.message}
            required
            {...register('nome')}
          />

          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            required
            {...register('email')}
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

          {editingUsuario && (
            <div>
              <Input
                label="Nova Senha (deixe em branco para manter)"
                type="password"
                error={errors.senha?.message}
                {...register('senha')}
              />
              <PasswordStrength password={watchedPassword} />
            </div>
          )}

          {!editingUsuario && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Dica:</strong> Ao enviar convite, o usuário receberá um email para configurar sua própria senha.
              </p>
            </div>
          )}

          <Select
            label="Nível de Acesso"
            error={errors.nivel?.message}
            required
            options={NIVEIS
              .filter(n => isSuperAdmin || n.value !== 'superadmin')
              .map(n => ({ value: n.value, label: n.label }))}
            {...register('nivel')}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={fecharModal}>
              Cancelar
            </Button>
            {!editingUsuario && (
              <Button
                type="button"
                variant="outline"
                loading={sendingInvite}
                onClick={handleSubmit(enviarConvite)}
                className="text-quatrelati-blue-600 border-quatrelati-blue-300 hover:bg-quatrelati-blue-50"
              >
                <Send className="w-4 h-4 mr-1" />
                Enviar Convite
              </Button>
            )}
            {editingUsuario && (
              <Button type="submit" loading={saving}>
                Salvar
              </Button>
            )}
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Tem certeza que deseja excluir/desativar o usuário <strong>{deleteConfirm?.nome}</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => excluirUsuario(deleteConfirm?.id)}>
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  );
}
