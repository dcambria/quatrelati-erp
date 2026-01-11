'use client';

import { clsx } from 'clsx';

const variants = {
  success: 'badge-success',
  warning: 'badge-warning',
  info: 'badge-info',
  error: 'inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-full border border-red-500/20',
};

export default function Badge({ children, variant = 'info', dot = false, className = '' }) {
  return (
    <span className={clsx(variants[variant], className)}>
      {dot && (
        <span
          className={clsx(
            'w-1.5 h-1.5 rounded-full',
            variant === 'success' && 'bg-quatrelati-green-500 animate-pulse',
            variant === 'warning' && 'bg-quatrelati-gold-500',
            variant === 'info' && 'bg-quatrelati-blue-500',
            variant === 'error' && 'bg-red-500'
          )}
        />
      )}
      {children}
    </span>
  );
}
