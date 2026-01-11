'use client';

import { clsx } from 'clsx';
import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, error, className = '', ...props },
  ref
) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-gray-600">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={clsx(
          'input-glass',
          error && 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
});

export default Input;
