'use client';

import { Loader2 } from 'lucide-react';

export default function Loading({ text = 'Carregando...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="w-10 h-10 text-quatrelati-gold-500 animate-spin" />
      <p className="text-gray-500 dark:text-gray-400">{text}</p>
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-cream-50 dark:bg-gray-950">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-quatrelati-gold-200 dark:border-quatrelati-gold-800" />
        <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-quatrelati-gold-500 border-t-transparent animate-spin" />
      </div>
      <p className="text-gray-600 dark:text-gray-400 font-medium">Carregando...</p>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton-quatrelati ${className}`} />;
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="table-glass">
      <table className="w-full">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-6 py-4">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: cols }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <Skeleton className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
