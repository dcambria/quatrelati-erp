'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { SidebarProvider, useSidebar } from '../contexts/SidebarContext';
import { VendedorFilterProvider } from '../contexts/VendedorFilterContext';
import Sidebar from '../components/layout/Sidebar';
import BureauLogo from '../components/common/BureauLogo';
import { LoadingPage } from '../components/ui/Loading';
import { Menu } from 'lucide-react';

function MobileHeader() {
  const { isMobile, toggleMobileOpen } = useSidebar();
  const { theme } = useTheme();

  if (!isMobile) return null;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-blue-200 dark:border-gray-800 z-30 flex items-center justify-between px-4">
      <button
        onClick={toggleMobileOpen}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
      </button>
      <Image
        src={theme === 'dark' ? '/logo-quatrelati-dark.png' : '/logo-quatrelati.png'}
        alt="Quatrelati"
        width={120}
        height={50}
        className="object-contain"
        priority
      />
      <div className="w-10" /> {/* Spacer para centralizar logo */}
    </header>
  );
}

function DashboardContent({ children }) {
  const { isCollapsed, isMobile } = useSidebar();

  const mainMargin = isMobile ? 'ml-0 pt-16' : (isCollapsed ? 'ml-20' : 'ml-72');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:bg-gradient-to-br dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <MobileHeader />
      <Sidebar />
      <main className={`${mainMargin} min-h-screen flex flex-col transition-all duration-300`}>
        <div className="flex-1">
          {children}
        </div>
        <BureauLogo />
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <VendedorFilterProvider>
        <DashboardContent>{children}</DashboardContent>
      </VendedorFilterProvider>
    </SidebarProvider>
  );
}
