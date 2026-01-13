// =====================================================
// Componentes Card e StatCard
// v1.2.0 - Formatação compacta para valores grandes
//          R$ 2,17M | 111,4 t | Tooltip com valor completo
// =====================================================
'use client';

import { clsx } from 'clsx';
import { useState } from 'react';

/**
 * Formata valores grandes de forma abreviada e compacta
 * R$ 2.169.611,50 → R$ 2,17M
 * 111.350,5 kg → 111,4 t (toneladas)
 */
function formatCompactValue(value) {
  if (typeof value !== 'string') return { display: value, full: value };

  const original = value;

  // Detectar se é moeda (R$)
  const currencyMatch = value.match(/^R\$\s*([\d.,]+)/);
  if (currencyMatch) {
    const numStr = currencyMatch[1].replace(/\./g, '').replace(',', '.');
    const num = parseFloat(numStr);
    if (!isNaN(num)) {
      if (num >= 1000000) {
        const formatted = (num / 1000000).toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        return { display: `R$ ${formatted}M`, full: original };
      }
      if (num >= 10000) {
        const formatted = (num / 1000).toLocaleString('pt-BR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 1
        });
        return { display: `R$ ${formatted}K`, full: original };
      }
    }
  }

  // Detectar se é peso (kg) - converter para toneladas se grande
  const weightMatch = value.match(/^([\d.,]+)\s*kg/i);
  if (weightMatch) {
    const numStr = weightMatch[1].replace(/\./g, '').replace(',', '.');
    const num = parseFloat(numStr);
    if (!isNaN(num)) {
      if (num >= 1000) {
        // Converter para toneladas
        const tons = num / 1000;
        const formatted = tons.toLocaleString('pt-BR', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        });
        return { display: `${formatted} t`, full: original };
      }
    }
  }

  return { display: value, full: value };
}

export default function Card({ children, className = '', hover = true, ...props }) {
  return (
    <div
      className={clsx(
        'glass-card p-6',
        !hover && 'hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:border-white/20',
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent dark:from-white/5 pointer-events-none rounded-3xl" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function StatCard({ title, value, subtitle, icon: Icon, variant = 'gold' }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const variants = {
    gold: 'stat-card-gold',
    blue: 'stat-card-blue',
    green: 'stat-card-green',
  };

  const textColors = {
    gold: {
      title: 'text-quatrelati-gold-100',
      value: 'text-white',
      subtitle: 'text-quatrelati-gold-200',
    },
    blue: {
      title: 'text-quatrelati-blue-100',
      value: 'text-white',
      subtitle: 'text-quatrelati-blue-200',
    },
    green: {
      title: 'text-green-100',
      value: 'text-white',
      subtitle: 'text-green-200',
    },
  };

  // Formatar valor de forma compacta
  const { display, full } = formatCompactValue(value);
  const isAbbreviated = display !== full;

  return (
    <div className={clsx(variants[variant], 'min-w-0')}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-3xl" />
      <div className="relative z-10 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={clsx('text-sm font-medium whitespace-nowrap', textColors[variant].title)}>
            {title}
          </p>
          {Icon && <Icon className="w-5 h-5 text-white/70 flex-shrink-0" />}
        </div>
        <div
          className="mt-2 relative"
          onMouseEnter={() => isAbbreviated && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <p className={clsx(
            'text-3xl sm:text-4xl font-bold whitespace-nowrap',
            isAbbreviated && 'cursor-help',
            textColors[variant].value
          )}>
            {display}
          </p>
          {/* Tooltip com valor completo */}
          {showTooltip && isAbbreviated && (
            <div className="absolute left-0 -bottom-8 z-50 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg shadow-lg whitespace-nowrap">
              {full}
              <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 rotate-45" />
            </div>
          )}
        </div>
        {subtitle && (
          <p className={clsx('text-sm mt-1 whitespace-nowrap', textColors[variant].subtitle)}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
