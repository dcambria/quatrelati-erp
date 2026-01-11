'use client';
// =====================================================
// Componente de Input de Telefone com DDI
// v1.2.1 - Visual aprimorado + variante dark
// =====================================================

import { useState, useRef, useEffect, forwardRef } from 'react';
import { ChevronDown, Search, Globe } from 'lucide-react';

const COUNTRIES = [
  { code: 'BR', ddi: '+55', name: 'Brasil', flag: '🇧🇷' },
  { code: 'US', ddi: '+1', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'PT', ddi: '+351', name: 'Portugal', flag: '🇵🇹' },
  { code: 'AR', ddi: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: 'UY', ddi: '+598', name: 'Uruguai', flag: '🇺🇾' },
  { code: 'PY', ddi: '+595', name: 'Paraguai', flag: '🇵🇾' },
  { code: 'CL', ddi: '+56', name: 'Chile', flag: '🇨🇱' },
  { code: 'CO', ddi: '+57', name: 'Colômbia', flag: '🇨🇴' },
  { code: 'MX', ddi: '+52', name: 'México', flag: '🇲🇽' },
  { code: 'PE', ddi: '+51', name: 'Peru', flag: '🇵🇪' },
  { code: 'ES', ddi: '+34', name: 'Espanha', flag: '🇪🇸' },
  { code: 'FR', ddi: '+33', name: 'França', flag: '🇫🇷' },
  { code: 'DE', ddi: '+49', name: 'Alemanha', flag: '🇩🇪' },
  { code: 'IT', ddi: '+39', name: 'Itália', flag: '🇮🇹' },
  { code: 'GB', ddi: '+44', name: 'Reino Unido', flag: '🇬🇧' },
  { code: 'JP', ddi: '+81', name: 'Japão', flag: '🇯🇵' },
  { code: 'CN', ddi: '+86', name: 'China', flag: '🇨🇳' },
];

// Função para formatar número brasileiro
const formatBrazilianPhone = (value) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

// Função para formatar número genérico
const formatGenericPhone = (value) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)} ${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)} ${numbers.slice(3, 6)} ${numbers.slice(6, 10)}`;
};

const PhoneInput = forwardRef(({
  label,
  error,
  value = '',
  onChange,
  onBlur,
  name,
  placeholder = '(00) 00000-0000',
  className = '',
  disabled = false,
  variant = 'default', // 'default' | 'dark' (glassmorphism)
  ...props
}, ref) => {
  // Styles based on variant
  const isDark = variant === 'dark';

  const buttonStyles = isDark
    ? 'bg-white/[0.07] border border-white/10 hover:bg-white/[0.12]'
    : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700';

  const inputStyles = isDark
    ? 'bg-white/[0.07] border border-white/10 text-white placeholder-white/30 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20'
    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-quatrelati-gold-500/50 focus:border-quatrelati-gold-500';

  const dropdownStyles = isDark
    ? 'bg-quatrelati-blue-900/95 backdrop-blur-xl border border-white/10 shadow-2xl'
    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl';

  const searchInputStyles = isDark
    ? 'bg-white/[0.07] border border-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-green-500/30'
    : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-quatrelati-gold-500/50';

  const countryItemStyles = isDark
    ? 'hover:bg-white/[0.1]'
    : 'hover:bg-gray-100 dark:hover:bg-gray-700';

  const labelStyles = isDark
    ? 'text-white/70'
    : 'text-gray-700 dark:text-gray-300';

  const textStyles = isDark
    ? 'text-white/60'
    : 'text-gray-600 dark:text-gray-400';

  const countryTextStyles = isDark
    ? 'text-white/90'
    : 'text-gray-800 dark:text-gray-200';
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [localPhone, setLocalPhone] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Parse initial value (may contain DDI)
  useEffect(() => {
    if (value) {
      // Check if value starts with a known DDI
      const matchingCountry = COUNTRIES.find(c => value.startsWith(c.ddi));
      if (matchingCountry) {
        setSelectedCountry(matchingCountry);
        setLocalPhone(value.slice(matchingCountry.ddi.length).trim());
      } else {
        setLocalPhone(value);
      }
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(search.toLowerCase()) ||
    country.ddi.includes(search) ||
    country.code.toLowerCase().includes(search.toLowerCase())
  );

  const handlePhoneChange = (e) => {
    const rawValue = e.target.value;
    let formatted = rawValue;

    if (selectedCountry.code === 'BR') {
      formatted = formatBrazilianPhone(rawValue);
    } else {
      formatted = formatGenericPhone(rawValue);
    }

    setLocalPhone(formatted);

    // Send full value with DDI to parent
    const fullValue = formatted ? `${selectedCountry.ddi} ${formatted}` : '';
    if (onChange) {
      const syntheticEvent = {
        target: { name, value: fullValue }
      };
      onChange(syntheticEvent);
    }
  };

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearch('');

    // Update full value
    const fullValue = localPhone ? `${country.ddi} ${localPhone}` : '';
    if (onChange) {
      const syntheticEvent = {
        target: { name, value: fullValue }
      };
      onChange(syntheticEvent);
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className={`block text-sm font-medium mb-2 ${labelStyles}`}>
          {label}
        </label>
      )}
      <div className="relative flex items-stretch">
        {/* Country selector */}
        <div ref={dropdownRef} className="relative flex-shrink-0">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            className={`
              h-full flex items-center gap-2 px-4 py-3.5 rounded-l-xl
              ${buttonStyles} transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-red-500' : ''}
              ${isOpen ? (isDark ? 'bg-white/[0.15]' : 'bg-gray-100 dark:bg-gray-700') : ''}
            `}
          >
            <span className="text-xl leading-none">{selectedCountry.flag}</span>
            <span className={`text-sm font-semibold tracking-wide ${isDark ? 'text-white/80' : 'text-gray-700 dark:text-gray-300'}`}>
              {selectedCountry.ddi}
            </span>
            <ChevronDown className={`w-4 h-4 ml-0.5 ${isDark ? 'text-white/50' : 'text-gray-400'} transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div className={`absolute z-50 top-full left-0 mt-2 w-72 rounded-2xl overflow-hidden ${dropdownStyles}`}>
              {/* Header */}
              <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Globe className={`w-4 h-4 ${isDark ? 'text-green-400' : 'text-quatrelati-gold-500'}`} />
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                    Selecionar pais
                  </span>
                </div>
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar pais ou codigo..."
                    className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl focus:outline-none transition-all ${searchInputStyles}`}
                  />
                </div>
              </div>

              {/* Country list */}
              <div className="max-h-52 overflow-y-auto py-1">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150
                      ${countryItemStyles}
                      ${selectedCountry.code === country.code
                        ? (isDark ? 'bg-green-500/20 border-l-2 border-green-400' : 'bg-quatrelati-gold-50 dark:bg-quatrelati-gold-900/20 border-l-2 border-quatrelati-gold-500')
                        : 'border-l-2 border-transparent'}
                    `}
                  >
                    <span className="text-xl">{country.flag}</span>
                    <span className={`flex-1 text-sm font-medium ${countryTextStyles}`}>{country.name}</span>
                    <span className={`text-sm font-mono ${isDark ? 'text-white/50' : 'text-gray-400'}`}>{country.ddi}</span>
                  </button>
                ))}
                {filteredCountries.length === 0 && (
                  <div className={`px-4 py-6 text-center ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                    <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum pais encontrado</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className={`w-px ${isDark ? 'bg-white/10' : 'bg-gray-200 dark:bg-gray-700'}`} />

        {/* Phone input */}
        <input
          ref={ref}
          type="tel"
          name={name}
          value={localPhone}
          onChange={handlePhoneChange}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={selectedCountry.code === 'BR' ? '(00) 00000-0000' : placeholder}
          className={`
            flex-1 px-4 py-3.5 rounded-r-xl
            ${inputStyles}
            focus:outline-none transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' : ''}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-400 flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
          {error}
        </p>
      )}
    </div>
  );
});

PhoneInput.displayName = 'PhoneInput';

export default PhoneInput;
