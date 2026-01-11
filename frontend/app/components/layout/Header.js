'use client';

import { Menu, Bell } from 'lucide-react';

export default function Header({ title, subtitle, actions }) {
  return (
    <header className="header-glass">
      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-3">
          {actions}
        </div>
      </div>
    </header>
  );
}
