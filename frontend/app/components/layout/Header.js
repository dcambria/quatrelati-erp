'use client';

export default function Header({ title, subtitle, actions, stats }) {
  return (
    <header className="header-glass">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {stats && (
            <div className="hidden sm:flex items-center gap-3">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl
                    ${stat.color || 'bg-quatrelati-gold-500/10 text-quatrelati-gold-600 dark:text-quatrelati-gold-400'}
                  `}
                >
                  {stat.icon && <stat.icon className="w-4 h-4" />}
                  <span className="text-sm font-medium">{stat.label}</span>
                  <span className="text-lg font-bold">{stat.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {actions}
        </div>
      </div>
    </header>
  );
}
