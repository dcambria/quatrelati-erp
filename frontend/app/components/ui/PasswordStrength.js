'use client';

// =====================================================
// Componente de Força de Senha
// v1.0.0 - Indicador visual de requisitos de senha
// =====================================================

import { useMemo } from 'react';
import { Check, X } from 'lucide-react';

const PASSWORD_RULES = [
  { id: 'length', label: 'Mínimo 8 caracteres', test: (val) => val.length >= 8 },
  { id: 'uppercase', label: 'Uma letra maiúscula', test: (val) => /[A-Z]/.test(val) },
  { id: 'lowercase', label: 'Uma letra minúscula', test: (val) => /[a-z]/.test(val) },
  { id: 'number', label: 'Um número', test: (val) => /[0-9]/.test(val) },
];

export default function PasswordStrength({ password = '' }) {
  const results = useMemo(() => {
    return PASSWORD_RULES.map(rule => ({
      ...rule,
      passed: password ? rule.test(password) : false,
    }));
  }, [password]);

  const passedCount = results.filter(r => r.passed).length;
  const totalRules = PASSWORD_RULES.length;
  const strength = password ? (passedCount / totalRules) * 100 : 0;

  const getStrengthLabel = () => {
    if (!password) return { text: '', color: '' };
    if (passedCount === 0) return { text: 'Muito fraca', color: 'text-red-500' };
    if (passedCount === 1) return { text: 'Fraca', color: 'text-red-500' };
    if (passedCount === 2) return { text: 'Média', color: 'text-orange-500' };
    if (passedCount === 3) return { text: 'Boa', color: 'text-yellow-500' };
    return { text: 'Forte', color: 'text-green-500' };
  };

  const getBarColor = () => {
    if (passedCount <= 1) return 'bg-red-500';
    if (passedCount === 2) return 'bg-orange-500';
    if (passedCount === 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const strengthInfo = getStrengthLabel();

  // Não mostrar nada se não há senha
  if (!password) {
    return (
      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          Requisitos da senha:
        </p>
        <ul className="space-y-1">
          {PASSWORD_RULES.map(rule => (
            <li key={rule.id} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center">
                <span className="text-[10px]">-</span>
              </div>
              {rule.label}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Barra de força */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Força da senha:
        </span>
        <span className={`text-xs font-semibold ${strengthInfo.color}`}>
          {strengthInfo.text}
        </span>
      </div>

      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full transition-all duration-300 rounded-full ${getBarColor()}`}
          style={{ width: `${strength}%` }}
        />
      </div>

      {/* Lista de requisitos */}
      <ul className="space-y-1">
        {results.map(rule => (
          <li
            key={rule.id}
            className={`flex items-center gap-2 text-xs transition-colors ${
              rule.passed
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
              rule.passed
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              {rule.passed ? (
                <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
              ) : (
                <X className="w-3 h-3 text-gray-400" />
              )}
            </div>
            <span className={rule.passed ? 'line-through opacity-70' : ''}>
              {rule.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
