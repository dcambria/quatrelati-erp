'use client';
// =====================================================
// Tour Guiada do Sistema
// v1.0.0 - Tour interativa após primeiro acesso
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Settings,
  BarChart3,
  Sparkles,
} from 'lucide-react';

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao Quatrelati!',
    description: 'Vamos fazer um tour rápido pelo sistema para você conhecer as principais funcionalidades.',
    icon: Sparkles,
    position: 'center',
    target: null,
  },
  {
    id: 'sidebar',
    title: 'Menu de Navegação',
    description: 'Use o menu lateral para acessar todas as seções do sistema. Você pode recolher o menu clicando no botão flutuante.',
    icon: LayoutDashboard,
    position: 'right',
    target: 'aside',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'A tela inicial mostra um resumo dos seus pedidos, faturamento e métricas importantes do período.',
    icon: BarChart3,
    position: 'bottom',
    target: '[data-tour="dashboard-stats"]',
  },
  {
    id: 'pedidos',
    title: 'Pedidos',
    description: 'Gerencie todos os pedidos aqui. Você pode criar, editar, filtrar por período e exportar para PDF.',
    icon: ShoppingCart,
    position: 'right',
    target: 'a[href="/pedidos"]',
  },
  {
    id: 'clientes',
    title: 'Clientes',
    description: 'Cadastre e gerencie seus clientes. Use a busca e os filtros para encontrar rapidamente quem procura.',
    icon: Users,
    position: 'right',
    target: 'a[href="/clientes"]',
  },
  {
    id: 'produtos',
    title: 'Produtos',
    description: 'Visualize o catálogo de produtos disponíveis para pedidos.',
    icon: Package,
    position: 'right',
    target: 'a[href="/produtos"]',
  },
  {
    id: 'finish',
    title: 'Pronto para começar!',
    description: 'Você está pronto para usar o sistema. Se precisar de ajuda, fale com seu administrador.',
    icon: Sparkles,
    position: 'center',
    target: null,
  },
];

const STORAGE_KEY = 'quatrelati_tour_completed';

export default function GuidedTour({ isOpen, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState(null);
  const [mounted, setMounted] = useState(false);
  const overlayRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const updateHighlight = useCallback(() => {
    const step = TOUR_STEPS[currentStep];
    if (!step?.target) {
      setHighlightRect(null);
      return;
    }

    const element = document.querySelector(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setHighlightRect({
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16,
      });

      // Scroll into view se necessário
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setHighlightRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    if (isOpen) {
      updateHighlight();
      window.addEventListener('resize', updateHighlight);
      return () => window.removeEventListener('resize', updateHighlight);
    }
  }, [isOpen, currentStep, updateHighlight]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setCurrentStep(0);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setCurrentStep(0);
    onComplete?.();
  };

  if (!isOpen || !mounted) return null;

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  // Calcular posição do tooltip
  const getTooltipStyle = () => {
    if (step.position === 'center' || !highlightRect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 20;

    switch (step.position) {
      case 'right':
        return {
          position: 'fixed',
          top: Math.max(padding, Math.min(highlightRect.top, window.innerHeight - 300)),
          left: highlightRect.left + highlightRect.width + padding,
        };
      case 'bottom':
        return {
          position: 'fixed',
          top: highlightRect.top + highlightRect.height + padding,
          left: Math.max(padding, highlightRect.left),
        };
      case 'left':
        return {
          position: 'fixed',
          top: highlightRect.top,
          right: window.innerWidth - highlightRect.left + padding,
        };
      default:
        return {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  };

  const content = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999]"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Overlay escuro com recorte para elemento destacado */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {highlightRect && (
              <rect
                x={highlightRect.left}
                y={highlightRect.top}
                width={highlightRect.width}
                height={highlightRect.height}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Borda destacada no elemento */}
      {highlightRect && (
        <div
          className="absolute rounded-xl border-2 border-quatrelati-gold-400 shadow-lg shadow-quatrelati-gold-400/30 transition-all duration-300"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip/Card */}
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-md animate-fade-in"
        style={getTooltipStyle()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-quatrelati-gold-400 to-quatrelati-gold-600 flex items-center justify-center">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {step.title}
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Passo {currentStep + 1} de {TOUR_STEPS.length}
              </span>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Descrição */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {step.description}
        </p>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-quatrelati-blue-500 to-quatrelati-gold-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Botões de navegação */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Pular tour
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-quatrelati-blue-500 text-white hover:bg-quatrelati-blue-600 transition-colors"
            >
              {isLast ? 'Começar!' : 'Próximo'}
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// Hook para verificar se deve mostrar a tour
export function useShouldShowTour() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const tourCompleted = localStorage.getItem(STORAGE_KEY);
    setShouldShow(!tourCompleted);
  }, []);

  const resetTour = () => {
    localStorage.removeItem(STORAGE_KEY);
    setShouldShow(true);
  };

  return { shouldShow, resetTour };
}
