'use client';

import { clsx } from 'clsx';

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

  return (
    <div className={variants[variant]}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-3xl" />
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <p className={clsx('text-sm font-medium', textColors[variant].title)}>
            {title}
          </p>
          {Icon && <Icon className="w-5 h-5 text-white/70" />}
        </div>
        <p className={clsx('text-4xl font-bold mt-2', textColors[variant].value)}>
          {value}
        </p>
        {subtitle && (
          <p className={clsx('text-sm mt-1', textColors[variant].subtitle)}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
