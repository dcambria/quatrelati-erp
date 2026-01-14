'use client';

// =====================================================
// HorarioRecebimentoPicker - Seletor de dias e horários
// v1.0.0 - Mini agenda para horário de recebimento
// =====================================================

import { useState, useEffect, forwardRef } from 'react';
import { Clock, Calendar, X, Check } from 'lucide-react';

const DIAS_SEMANA = [
  { id: 'seg', label: 'Seg', full: 'Segunda' },
  { id: 'ter', label: 'Ter', full: 'Terça' },
  { id: 'qua', label: 'Qua', full: 'Quarta' },
  { id: 'qui', label: 'Qui', full: 'Quinta' },
  { id: 'sex', label: 'Sex', full: 'Sexta' },
  { id: 'sab', label: 'Sáb', full: 'Sábado' },
];

const HORARIOS_PREDEFINIDOS = [
  { id: 'comercial', label: 'Comercial', inicio: '08:00', fim: '18:00' },
  { id: 'manha', label: 'Manhã', inicio: '08:00', fim: '12:00' },
  { id: 'tarde', label: 'Tarde', inicio: '13:00', fim: '18:00' },
  { id: 'integral', label: 'Integral', inicio: '06:00', fim: '22:00' },
];

const HorarioRecebimentoPicker = forwardRef(({ value, onChange, error }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [horarioInicio, setHorarioInicio] = useState('08:00');
  const [horarioFim, setHorarioFim] = useState('18:00');

  // Parse do valor inicial
  useEffect(() => {
    if (value) {
      parseValue(value);
    }
  }, []);

  const parseValue = (val) => {
    // Tenta fazer parse de formatos como:
    // "Seg-Sex 08:00-18:00"
    // "Segunda a Sexta, 08:00 às 18:00"
    // "08:00 às 17:00"
    const match = val.match(/(\d{2}:\d{2})\s*(?:às|a|-)\s*(\d{2}:\d{2})/i);
    if (match) {
      setHorarioInicio(match[1]);
      setHorarioFim(match[2]);
    }

    // Verifica dias mencionados
    const diasEncontrados = [];
    if (/seg|segunda/i.test(val)) diasEncontrados.push('seg');
    if (/ter|terça/i.test(val)) diasEncontrados.push('ter');
    if (/qua|quarta/i.test(val)) diasEncontrados.push('qua');
    if (/qui|quinta/i.test(val)) diasEncontrados.push('qui');
    if (/sex|sexta/i.test(val)) diasEncontrados.push('sex');
    if (/sab|sábado/i.test(val)) diasEncontrados.push('sab');

    if (diasEncontrados.length > 0) {
      setDiasSelecionados(diasEncontrados);
    }
  };

  const toggleDia = (diaId) => {
    setDiasSelecionados(prev => {
      if (prev.includes(diaId)) {
        return prev.filter(d => d !== diaId);
      }
      return [...prev, diaId];
    });
  };

  const selecionarTodosDiasUteis = () => {
    setDiasSelecionados(['seg', 'ter', 'qua', 'qui', 'sex']);
  };

  const aplicarHorarioPredefinido = (preset) => {
    setHorarioInicio(preset.inicio);
    setHorarioFim(preset.fim);
  };

  const formatarValor = () => {
    if (diasSelecionados.length === 0) {
      return `${horarioInicio} às ${horarioFim}`;
    }

    const diasOrdenados = DIAS_SEMANA
      .filter(d => diasSelecionados.includes(d.id))
      .map(d => d.label);

    // Verifica se são dias consecutivos
    const indices = diasSelecionados.map(d => DIAS_SEMANA.findIndex(dia => dia.id === d)).sort((a, b) => a - b);
    const saoConsecutivos = indices.every((val, i, arr) => i === 0 || val === arr[i - 1] + 1);

    let diasStr;
    if (diasSelecionados.length === 5 && !diasSelecionados.includes('sab')) {
      diasStr = 'Seg-Sex';
    } else if (diasSelecionados.length === 6) {
      diasStr = 'Seg-Sáb';
    } else if (saoConsecutivos && diasSelecionados.length > 2) {
      diasStr = `${diasOrdenados[0]}-${diasOrdenados[diasOrdenados.length - 1]}`;
    } else {
      diasStr = diasOrdenados.join(', ');
    }

    return `${diasStr} ${horarioInicio}-${horarioFim}`;
  };

  const confirmar = () => {
    const novoValor = formatarValor();
    onChange?.(novoValor);
    setIsOpen(false);
  };

  const limpar = () => {
    setDiasSelecionados([]);
    setHorarioInicio('08:00');
    setHorarioFim('18:00');
    onChange?.('');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Horário de Recebimento
      </label>

      {/* Campo de input */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2.5 text-left rounded-xl border transition-all duration-200
          ${error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-200 dark:border-gray-700 focus:ring-quatrelati-blue-500'
          }
          bg-white dark:bg-gray-800 text-gray-900 dark:text-white
          hover:border-quatrelati-blue-400 dark:hover:border-quatrelati-gold-600
          focus:outline-none focus:ring-2`}
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className={value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
            {value || 'Selecionar dias e horários'}
          </span>
        </div>
      </button>

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      {/* Dropdown da mini agenda */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full sm:w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Dias da semana */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Dias da Semana
              </span>
              <button
                type="button"
                onClick={selecionarTodosDiasUteis}
                className="text-xs text-quatrelati-blue-600 dark:text-quatrelati-gold-400 hover:underline"
              >
                Seg-Sex
              </button>
            </div>
            <div className="flex gap-1">
              {DIAS_SEMANA.map((dia) => (
                <button
                  key={dia.id}
                  type="button"
                  onClick={() => toggleDia(dia.id)}
                  className={`flex-1 py-2 px-1 text-xs font-medium rounded-lg transition-all duration-200
                    ${diasSelecionados.includes(dia.id)
                      ? 'bg-quatrelati-blue-500 dark:bg-quatrelati-gold-500 text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  title={dia.full}
                >
                  {dia.label}
                </button>
              ))}
            </div>
          </div>

          {/* Horários predefinidos */}
          <div className="mb-4">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase block mb-2">
              Horário Rápido
            </span>
            <div className="grid grid-cols-2 gap-2">
              {HORARIOS_PREDEFINIDOS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => aplicarHorarioPredefinido(preset)}
                  className={`py-1.5 px-3 text-xs rounded-lg border transition-all duration-200
                    ${horarioInicio === preset.inicio && horarioFim === preset.fim
                      ? 'border-quatrelati-blue-500 dark:border-quatrelati-gold-500 bg-quatrelati-blue-50 dark:bg-quatrelati-gold-900/20 text-quatrelati-blue-700 dark:text-quatrelati-gold-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Horário personalizado */}
          <div className="mb-4">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase block mb-2">
              Horário Personalizado
            </span>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input
                  type="time"
                  value={horarioInicio}
                  onChange={(e) => setHorarioInicio(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-quatrelati-blue-500"
                />
              </div>
              <span className="text-gray-400">às</span>
              <div className="flex-1">
                <input
                  type="time"
                  value={horarioFim}
                  onChange={(e) => setHorarioFim(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-quatrelati-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Resultado:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formatarValor() || 'Selecione os dias e horários'}
            </span>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={limpar}
              className="flex-1 py-2 px-3 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4 inline mr-1" />
              Limpar
            </button>
            <button
              type="button"
              onClick={confirmar}
              className="flex-1 py-2 px-3 text-sm font-medium rounded-lg bg-quatrelati-blue-500 dark:bg-quatrelati-gold-500 text-white dark:text-gray-900 hover:bg-quatrelati-blue-600 dark:hover:bg-quatrelati-gold-600 transition-colors"
            >
              <Check className="w-4 h-4 inline mr-1" />
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

HorarioRecebimentoPicker.displayName = 'HorarioRecebimentoPicker';

export default HorarioRecebimentoPicker;
