// =====================================================
// Sidebar - Menu lateral responsivo
// v1.3.0 - Botão flutuante de recolher/expandir
//          Filtro "Ver como" expande sidebar ao clicar
// =====================================================
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  UserCog,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  X,
  Settings,
  Eye,
  XCircle,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { useVendedorFilter } from '../../contexts/VendedorFilterContext';
import Gravatar from '../ui/Gravatar';

const menuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pedidos', label: 'Pedidos', icon: ShoppingCart },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/produtos', label: 'Produtos', icon: Package },
];

const adminItems = [
  { href: '/usuarios', label: 'Usuarios', icon: UserCog, adminOnly: true },
];

const superadminItems = [
  { href: '/atividades', label: 'Atividades', icon: Activity, superadminOnly: true },
  { href: '/configuracoes', label: 'Configuracoes', icon: Settings, superadminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isCollapsed, isMobileOpen, isMobile, toggleCollapsed, closeMobile } = useSidebar();
  const {
    vendedores,
    vendedorSelecionado,
    selecionarVendedor,
    limparFiltro,
    canFilter,
    isFiltering,
  } = useVendedorFilter();

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleNavClick = () => {
    if (isMobile) {
      closeMobile();
    }
  };

  const sidebarWidth = isCollapsed && !isMobile ? 'w-20' : 'w-72';

  return (
    <>
      {/* Overlay mobile */}
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-white dark:bg-gray-900
          border-r border-blue-200 dark:border-gray-800
          transition-all duration-300 ease-in-out z-50
          ${sidebarWidth}
          ${isMobile ? (isMobileOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header com logo */}
          <div className="p-4 border-b border-blue-200 dark:border-gray-800">
            <div className="flex items-center justify-between gap-2">
              {/* Logo */}
              <div className={`flex items-center justify-center ${isCollapsed && !isMobile ? 'w-full' : 'flex-1'}`}>
                {isCollapsed && !isMobile ? (
                  <div className="w-10 h-10 rounded-full bg-quatrelati-blue-500 dark:bg-quatrelati-gold-500 flex items-center justify-center">
                    <span className="text-white dark:text-gray-900 font-bold text-lg">Q</span>
                  </div>
                ) : (
                  <Image
                    src={theme === 'dark' ? '/logo-quatrelati-dark.png' : '/logo-quatrelati.png'}
                    alt="Quatrelati"
                    width={160}
                    height={70}
                    className="object-contain"
                    priority
                  />
                )}
              </div>

              {/* Botao fechar (mobile) */}
              {isMobile && isMobileOpen && (
                <button
                  onClick={closeMobile}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              )}
            </div>
          </div>

          {/* Botão flutuante de recolher/expandir (desktop only) */}
          {!isMobile && (
            <button
              onClick={toggleCollapsed}
              className="absolute -right-3 top-20 z-50
                         w-6 h-6 rounded-full
                         bg-white dark:bg-gray-800
                         border border-blue-200 dark:border-gray-700
                         shadow-md hover:shadow-lg
                         flex items-center justify-center
                         text-gray-500 dark:text-gray-400
                         hover:text-quatrelati-blue-600 dark:hover:text-quatrelati-gold-400
                         hover:border-quatrelati-blue-400 dark:hover:border-quatrelati-gold-600
                         transition-all duration-200
                         hover:scale-110"
              title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Filtro Global de Vendedor */}
          {canFilter && (!isCollapsed || isMobile) && (
            <div className="px-3 py-2 border-b border-blue-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-quatrelati-blue-600 dark:text-quatrelati-gold-500" />
                <span className="text-xs font-semibold text-quatrelati-blue-600 dark:text-quatrelati-gold-500 uppercase tracking-wider">
                  Ver como
                </span>
              </div>
              <div className="relative">
                <select
                  value={vendedorSelecionado?.id || ''}
                  onChange={(e) => {
                    const vendedor = vendedores.find(v => v.id === parseInt(e.target.value));
                    selecionarVendedor(vendedor);
                  }}
                  className={`w-full px-3 py-2 pr-8 text-sm rounded-lg border transition-all duration-200
                    ${isFiltering
                      ? 'bg-quatrelati-blue-50 dark:bg-quatrelati-gold-900/30 border-quatrelati-blue-300 dark:border-quatrelati-gold-700 text-quatrelati-blue-800 dark:text-quatrelati-gold-200'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                    }
                    focus:outline-none focus:ring-2 focus:ring-quatrelati-blue-500 dark:focus:ring-quatrelati-gold-500`}
                >
                  <option value="">Todos os vendedores</option>
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nome}
                    </option>
                  ))}
                </select>
                {isFiltering && (
                  <button
                    onClick={limparFiltro}
                    className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-quatrelati-blue-600 dark:text-quatrelati-gold-400 hover:text-quatrelati-blue-800 dark:hover:text-quatrelati-gold-200 transition-colors"
                    title="Limpar filtro"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
              {isFiltering && (
                <p className="mt-1.5 text-xs text-quatrelati-blue-600 dark:text-quatrelati-gold-400 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Visualizando: {vendedorSelecionado?.nome}
                </p>
              )}
            </div>
          )}

          {/* Filtro Global de Vendedor (collapsed) - expande ao clicar */}
          {canFilter && isCollapsed && !isMobile && (
            <div className="px-2 py-2 border-b border-blue-200 dark:border-gray-800">
              <button
                onClick={() => {
                  // Expande o sidebar para permitir seleção do vendedor
                  toggleCollapsed();
                }}
                className={`w-full p-2 rounded-lg transition-all duration-200 flex items-center justify-center
                  ${isFiltering
                    ? 'bg-quatrelati-blue-100 dark:bg-quatrelati-gold-900/50 text-quatrelati-blue-700 dark:text-quatrelati-gold-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                title={isFiltering ? `Ver como: ${vendedorSelecionado?.nome}` : 'Filtrar por vendedor'}
              >
                <Eye className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Menu */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-thin">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                    ${isCollapsed && !isMobile ? 'justify-center' : ''}
                    ${active
                      ? 'bg-quatrelati-blue-500 text-white dark:bg-quatrelati-gold-500 dark:text-gray-900'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                  title={isCollapsed && !isMobile ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {(!isCollapsed || isMobile) && <span className="font-medium">{item.label}</span>}
                </Link>
              );
            })}

            {/* Admin section */}
            {isAdmin && (
              <>
                <div className={`pt-4 mt-4 border-t border-blue-200 dark:border-gray-800 ${isCollapsed && !isMobile ? 'px-0' : ''}`}>
                  {(!isCollapsed || isMobile) && (
                    <p className="px-3 text-xs font-semibold text-quatrelati-blue-600 dark:text-quatrelati-gold-500 uppercase tracking-wider mb-2">
                      Administracao
                    </p>
                  )}
                  {adminItems.map((item) => {
                    if (item.adminOnly && !isAdmin) return null;
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={handleNavClick}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                          ${isCollapsed && !isMobile ? 'justify-center' : ''}
                          ${active
                            ? 'bg-quatrelati-blue-500 text-white dark:bg-quatrelati-gold-500 dark:text-gray-900'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }
                        `}
                        title={isCollapsed && !isMobile ? item.label : undefined}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {(!isCollapsed || isMobile) && <span className="font-medium">{item.label}</span>}
                      </Link>
                    );
                  })}
                  {/* Superadmin items */}
                  {user?.nivel === 'superadmin' && superadminItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={handleNavClick}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                          ${isCollapsed && !isMobile ? 'justify-center' : ''}
                          ${active
                            ? 'bg-quatrelati-blue-500 text-white dark:bg-quatrelati-gold-500 dark:text-gray-900'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }
                        `}
                        title={isCollapsed && !isMobile ? item.label : undefined}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {(!isCollapsed || isMobile) && <span className="font-medium">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </nav>

          {/* Footer: Theme toggle, user info, collapse button */}
          <div className="p-3 border-t border-blue-200 dark:border-gray-800 space-y-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`
                w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium
                bg-gray-100 dark:bg-gray-800
                text-gray-600 dark:text-gray-300
                hover:bg-gray-200 dark:hover:bg-gray-700
                rounded-xl transition-all duration-200
                ${isCollapsed && !isMobile ? 'justify-center' : 'justify-center'}
              `}
              title={isCollapsed && !isMobile ? (theme === 'light' ? 'Modo Escuro' : 'Modo Claro') : undefined}
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-4 h-4 flex-shrink-0" />
                  {(!isCollapsed || isMobile) && <span>Modo Escuro</span>}
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 flex-shrink-0" />
                  {(!isCollapsed || isMobile) && <span>Modo Claro</span>}
                </>
              )}
            </button>

            {/* User info */}
            <div className={`p-3 rounded-xl bg-blue-50 dark:bg-gray-800/80 ${isCollapsed && !isMobile ? 'p-2' : ''}`}>
              {isCollapsed && !isMobile ? (
                <div className="flex flex-col items-center gap-2">
                  <Link href="/perfil" className="hover:opacity-80 transition-opacity" title="Meu Perfil">
                    <Gravatar
                      email={user?.email}
                      name={user?.nome}
                      size={40}
                      className="ring-2 ring-quatrelati-blue-200 dark:ring-quatrelati-gold-800"
                    />
                  </Link>
                  <button
                    onClick={logout}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Sair"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Link href="/perfil" className="flex items-center gap-3 group" title="Meu Perfil">
                    <Gravatar
                      email={user?.email}
                      name={user?.nome}
                      size={40}
                      className="ring-2 ring-quatrelati-blue-200 dark:ring-quatrelati-gold-800 flex-shrink-0 group-hover:ring-quatrelati-blue-400 dark:group-hover:ring-quatrelati-gold-600 transition-all"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-quatrelati-blue-600 dark:group-hover:text-quatrelati-gold-400 transition-colors">
                        {user?.nome}
                      </p>
                      <p className="text-xs text-quatrelati-blue-600 dark:text-quatrelati-gold-500 truncate capitalize">
                        {user?.nivel}
                      </p>
                    </div>
                    <Settings className="w-4 h-4 text-gray-400 group-hover:text-quatrelati-blue-500 dark:group-hover:text-quatrelati-gold-400 transition-colors flex-shrink-0" />
                  </Link>
                  <button
                    onClick={logout}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      </aside>
    </>
  );
}
