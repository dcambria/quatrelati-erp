'use client';
// =====================================================
// Componente de Input de Telefone com DDI
// v2.0.0 - Suporte a colagem inteligente de números
// =====================================================

import { useState, useRef, useEffect, forwardRef, useCallback } from 'react';
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
  { code: 'AU', ddi: '+61', name: 'Austrália', flag: '🇦🇺' },
  { code: 'CA', ddi: '+1', name: 'Canadá', flag: '🇨🇦' },
  { code: 'NL', ddi: '+31', name: 'Países Baixos', flag: '🇳🇱' },
  { code: 'BE', ddi: '+32', name: 'Bélgica', flag: '🇧🇪' },
  { code: 'CH', ddi: '+41', name: 'Suíça', flag: '🇨🇭' },
  { code: 'AT', ddi: '+43', name: 'Áustria', flag: '🇦🇹' },
  { code: 'SE', ddi: '+46', name: 'Suécia', flag: '🇸🇪' },
  { code: 'NO', ddi: '+47', name: 'Noruega', flag: '🇳🇴' },
  { code: 'DK', ddi: '+45', name: 'Dinamarca', flag: '🇩🇰' },
  { code: 'FI', ddi: '+358', name: 'Finlândia', flag: '🇫🇮' },
  { code: 'IE', ddi: '+353', name: 'Irlanda', flag: '🇮🇪' },
  { code: 'PL', ddi: '+48', name: 'Polônia', flag: '🇵🇱' },
  { code: 'RU', ddi: '+7', name: 'Rússia', flag: '🇷🇺' },
  { code: 'IN', ddi: '+91', name: 'Índia', flag: '🇮🇳' },
  { code: 'ZA', ddi: '+27', name: 'África do Sul', flag: '🇿🇦' },
  { code: 'AE', ddi: '+971', name: 'Emirados Árabes', flag: '🇦🇪' },
  { code: 'SA', ddi: '+966', name: 'Arábia Saudita', flag: '🇸🇦' },
  { code: 'IL', ddi: '+972', name: 'Israel', flag: '🇮🇱' },
  { code: 'TR', ddi: '+90', name: 'Turquia', flag: '🇹🇷' },
  { code: 'GR', ddi: '+30', name: 'Grécia', flag: '🇬🇷' },
  { code: 'CZ', ddi: '+420', name: 'Tchéquia', flag: '🇨🇿' },
  { code: 'HU', ddi: '+36', name: 'Hungria', flag: '🇭🇺' },
  { code: 'RO', ddi: '+40', name: 'Romênia', flag: '🇷🇴' },
  { code: 'UA', ddi: '+380', name: 'Ucrânia', flag: '🇺🇦' },
  { code: 'TH', ddi: '+66', name: 'Tailândia', flag: '🇹🇭' },
  { code: 'MY', ddi: '+60', name: 'Malásia', flag: '🇲🇾' },
  { code: 'SG', ddi: '+65', name: 'Singapura', flag: '🇸🇬' },
  { code: 'PH', ddi: '+63', name: 'Filipinas', flag: '🇵🇭' },
  { code: 'ID', ddi: '+62', name: 'Indonésia', flag: '🇮🇩' },
  { code: 'VN', ddi: '+84', name: 'Vietnã', flag: '🇻🇳' },
  { code: 'KR', ddi: '+82', name: 'Coreia do Sul', flag: '🇰🇷' },
  { code: 'HK', ddi: '+852', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'TW', ddi: '+886', name: 'Taiwan', flag: '🇹🇼' },
  { code: 'NZ', ddi: '+64', name: 'Nova Zelândia', flag: '🇳🇿' },
  { code: 'EG', ddi: '+20', name: 'Egito', flag: '🇪🇬' },
  { code: 'NG', ddi: '+234', name: 'Nigéria', flag: '🇳🇬' },
  { code: 'KE', ddi: '+254', name: 'Quênia', flag: '🇰🇪' },
  { code: 'MA', ddi: '+212', name: 'Marrocos', flag: '🇲🇦' },
  { code: 'VE', ddi: '+58', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'EC', ddi: '+593', name: 'Equador', flag: '🇪🇨' },
  { code: 'BO', ddi: '+591', name: 'Bolívia', flag: '🇧🇴' },
  { code: 'CR', ddi: '+506', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'PA', ddi: '+507', name: 'Panamá', flag: '🇵🇦' },
  { code: 'DO', ddi: '+1', name: 'Rep. Dominicana', flag: '🇩🇴' },
  { code: 'PR', ddi: '+1', name: 'Porto Rico', flag: '🇵🇷' },
  { code: 'CU', ddi: '+53', name: 'Cuba', flag: '🇨🇺' },
  { code: 'GT', ddi: '+502', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'HN', ddi: '+504', name: 'Honduras', flag: '🇭🇳' },
  { code: 'SV', ddi: '+503', name: 'El Salvador', flag: '🇸🇻' },
  { code: 'NI', ddi: '+505', name: 'Nicarágua', flag: '🇳🇮' },
];

// Ordenar países por tamanho do DDI (maior primeiro) para match correto
const COUNTRIES_BY_DDI_LENGTH = [...COUNTRIES].sort((a, b) => b.ddi.length - a.ddi.length);

/**
 * Detecta o país a partir de um número de telefone
 * Suporta formatos: +55..., 55..., 0055...
 */
const detectCountryFromNumber = (value) => {
  if (!value) return null;

  // Limpar o valor - remover tudo exceto números e +
  let cleaned = value.replace(/[^\d+]/g, '');

  // Se começa com 00, substituir por +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // Se não começa com +, adicionar
  if (!cleaned.startsWith('+') && cleaned.length > 8) {
    cleaned = '+' + cleaned;
  }

  // Tentar encontrar o país pelo DDI (do maior para o menor)
  for (const country of COUNTRIES_BY_DDI_LENGTH) {
    if (cleaned.startsWith(country.ddi)) {
      const phoneWithoutDdi = cleaned.slice(country.ddi.length);
      return { country, phone: phoneWithoutDdi };
    }
  }

  return null;
};

/**
 * Formata número brasileiro: (XX) XXXXX-XXXX
 */
const formatBrazilianPhone = (value) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

/**
 * Formata número português: XXX XXX XXX
 */
const formatPortuguesePhone = (value) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)} ${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)} ${numbers.slice(3, 6)} ${numbers.slice(6, 9)}`;
};

/**
 * Formata número genérico: XXX XXX XXXX
 */
const formatGenericPhone = (value) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)} ${numbers.slice(3)}`;
  if (numbers.length <= 10) return `${numbers.slice(0, 3)} ${numbers.slice(3, 6)} ${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)} ${numbers.slice(3, 6)} ${numbers.slice(6, 10)}`;
};

/**
 * Formata o número de acordo com o país
 */
const formatPhoneByCountry = (value, countryCode) => {
  const numbers = value.replace(/\D/g, '');

  switch (countryCode) {
    case 'BR':
      return formatBrazilianPhone(numbers);
    case 'PT':
      return formatPortuguesePhone(numbers);
    default:
      return formatGenericPhone(numbers);
  }
};

const PhoneInput = forwardRef(({
  label,
  error,
  value = '',
  onChange,
  onBlur,
  name,
  placeholder,
  className = '',
  disabled = false,
  variant = 'default',
  ...props
}, ref) => {
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

  const countryTextStyles = isDark
    ? 'text-white/90'
    : 'text-gray-800 dark:text-gray-200';

  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [localPhone, setLocalPhone] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const inputRef = useRef(null);
  const isInitialized = useRef(false);

  // Combina ref externo com interno
  const setRefs = useCallback((node) => {
    inputRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }, [ref]);

  // Parse valor inicial
  useEffect(() => {
    if (isInitialized.current) return;

    if (value) {
      const detected = detectCountryFromNumber(value);
      if (detected) {
        setSelectedCountry(detected.country);
        setLocalPhone(formatPhoneByCountry(detected.phone, detected.country.code));
      } else {
        // Se não detectou DDI, assume que é só o número local
        setLocalPhone(value.replace(/[^\d\s()-]/g, ''));
      }
    }
    isInitialized.current = true;
  }, [value]);

  // Fechar dropdown ao clicar fora
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

  // Focar input de busca ao abrir dropdown
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

  // Notifica o parent sobre mudanças
  const notifyChange = useCallback((phone, country) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullValue = cleanPhone ? `${country.ddi} ${phone}` : '';

    if (onChange) {
      const syntheticEvent = {
        target: { name, value: fullValue }
      };
      onChange(syntheticEvent);
    }
  }, [name, onChange]);

  // Handler para colagem de texto
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');

    // Tentar detectar país do número colado
    const detected = detectCountryFromNumber(pastedText);

    if (detected) {
      // Detectou DDI - atualiza país e número
      setSelectedCountry(detected.country);
      const formatted = formatPhoneByCountry(detected.phone, detected.country.code);
      setLocalPhone(formatted);
      notifyChange(formatted, detected.country);
    } else {
      // Não detectou DDI - usa apenas os números
      const numbers = pastedText.replace(/\D/g, '');
      const formatted = formatPhoneByCountry(numbers, selectedCountry.code);
      setLocalPhone(formatted);
      notifyChange(formatted, selectedCountry);
    }
  }, [selectedCountry, notifyChange]);

  // Handler para digitação
  const handlePhoneChange = useCallback((e) => {
    const rawValue = e.target.value;

    // Verifica se o usuário está digitando um DDI (começa com +)
    if (rawValue.startsWith('+') && rawValue.length > 1) {
      const detected = detectCountryFromNumber(rawValue);
      if (detected) {
        setSelectedCountry(detected.country);
        const formatted = formatPhoneByCountry(detected.phone, detected.country.code);
        setLocalPhone(formatted);
        notifyChange(formatted, detected.country);
        return;
      }
    }

    // Formatação normal
    const formatted = formatPhoneByCountry(rawValue, selectedCountry.code);
    setLocalPhone(formatted);
    notifyChange(formatted, selectedCountry);
  }, [selectedCountry, notifyChange]);

  // Handler para seleção de país
  const handleCountrySelect = useCallback((country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearch('');

    // Re-formata o número para o novo país
    if (localPhone) {
      const formatted = formatPhoneByCountry(localPhone, country.code);
      setLocalPhone(formatted);
      notifyChange(formatted, country);
    }
  }, [localPhone, notifyChange]);

  // Placeholder dinâmico por país
  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    switch (selectedCountry.code) {
      case 'BR': return '(11) 99999-9999';
      case 'PT': return '912 345 678';
      case 'US': return '(555) 123-4567';
      default: return '123 456 7890';
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
        {/* Seletor de país */}
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
                    Selecionar país
                  </span>
                </div>
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar país ou código..."
                    className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl focus:outline-none transition-all ${searchInputStyles}`}
                  />
                </div>
              </div>

              {/* Lista de países */}
              <div className="max-h-52 overflow-y-auto py-1">
                {filteredCountries.map((country) => (
                  <button
                    key={`${country.code}-${country.ddi}`}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150
                      ${countryItemStyles}
                      ${selectedCountry.code === country.code && selectedCountry.ddi === country.ddi
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
                    <p className="text-sm">Nenhum país encontrado</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Separador */}
        <div className={`w-px ${isDark ? 'bg-white/10' : 'bg-gray-200 dark:bg-gray-700'}`} />

        {/* Input do telefone */}
        <input
          ref={setRefs}
          type="tel"
          name={name}
          value={localPhone}
          onChange={handlePhoneChange}
          onPaste={handlePaste}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={getPlaceholder()}
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

      {/* Dica de uso */}
      <p className={`mt-1.5 text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
        Cole números completos como +351 912 345 678
      </p>

      {error && (
        <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
          {error}
        </p>
      )}
    </div>
  );
});

PhoneInput.displayName = 'PhoneInput';

export default PhoneInput;
