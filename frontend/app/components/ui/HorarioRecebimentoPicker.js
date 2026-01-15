'use client';

// =====================================================
// HorarioRecebimentoPicker - Seletor de dias e horários
// v1.4.0 - Adiciona Domingo
// =====================================================

import { useState, useEffect, forwardRef } from 'react';
import { Clock } from 'lucide-react';

const DIAS_SEMANA = [
  { id: 'dom', label: 'Dom', full: 'Domingo' },
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

const HorarioRecebimentoPicker = forwardRef(({ value, onChange, error, label = 'Horário de Recebimento' }, ref) => {
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
    const match = val.match(/(\d{2}:\d{2})\s*(?:às|a|-)\s*(\d{2}:\d{2})/i);
    if (match) {
      setHorarioInicio(match[1]);
      setHorarioFim(match[2]);
    }

    const diasEncontrados = [];
    if (/dom|domingo/i.test(val)) diasEncontrados.push('dom');
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
      const novosDias = prev.includes(diaId)
        ? prev.filter(d => d !== diaId)
        : [...prev, diaId];

      // Atualiza o valor automaticamente
      setTimeout(() => atualizarValor(novosDias, horarioInicio, horarioFim), 0);
      return novosDias;
    });
  };

  const selecionarTodosDiasUteis = () => {
    const novosDias = ['seg', 'ter', 'qua', 'qui', 'sex'];
    setDiasSelecionados(novosDias);
    atualizarValor(novosDias, horarioInicio, horarioFim);
  };

  const aplicarHorarioPredefinido = (preset) => {
    setHorarioInicio(preset.inicio);
    setHorarioFim(preset.fim);
    atualizarValor(diasSelecionados, preset.inicio, preset.fim);
  };

  const handleHorarioInicioChange = (e) => {
    const novoInicio = e.target.value;
    setHorarioInicio(novoInicio);
    atualizarValor(diasSelecionados, novoInicio, horarioFim);
  };

  const handleHorarioFimChange = (e) => {
    const novoFim = e.target.value;
    setHorarioFim(novoFim);
    atualizarValor(diasSelecionados, horarioInicio, novoFim);
  };

  const formatarValor = (dias, inicio, fim) => {
    if (dias.length === 0) {
      return `${inicio} às ${fim}`;
    }

    const diasOrdenados = DIAS_SEMANA
      .filter(d => dias.includes(d.id))
      .map(d => d.label);

    const indices = dias.map(d => DIAS_SEMANA.findIndex(dia => dia.id === d)).sort((a, b) => a - b);
    const saoConsecutivos = indices.every((val, i, arr) => i === 0 || val === arr[i - 1] + 1);

    let diasStr;
    if (dias.length === 7) {
      diasStr = 'Todos os dias';
    } else if (dias.length === 5 && !dias.includes('sab') && !dias.includes('dom')) {
      diasStr = 'Seg-Sex';
    } else if (dias.length === 6 && !dias.includes('dom')) {
      diasStr = 'Seg-Sáb';
    } else if (saoConsecutivos && dias.length > 2) {
      diasStr = `${diasOrdenados[0]}-${diasOrdenados[diasOrdenados.length - 1]}`;
    } else {
      diasStr = diasOrdenados.join(', ');
    }

    return `${diasStr} ${inicio}-${fim}`;
  };

  const atualizarValor = (dias, inicio, fim) => {
    const novoValor = formatarValor(dias, inicio, fim);
    onChange?.(novoValor);
  };

  const limpar = () => {
    setDiasSelecionados([]);
    setHorarioInicio('08:00');
    setHorarioFim('18:00');
    onChange?.('');
  };

  return (
    <div ref={ref} className="space-y-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      {/* Card da mini agenda */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-4 border border-gray-200 dark:border-gray-700">
        {/* Dias da semana */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              Dias
            </span>
            <button
              type="button"
              onClick={selecionarTodosDiasUteis}
              className="text-xs text-quatrelati-blue-600 dark:text-quatrelati-gold-400 hover:underline"
            >
              Seg-Sex
            </button>
          </div>
          <div className="flex gap-1.5">
            {DIAS_SEMANA.map((dia) => (
              <button
                key={dia.id}
                type="button"
                onClick={() => toggleDia(dia.id)}
                className={`flex-1 py-2 px-1 text-xs font-medium rounded-lg transition-all duration-200
                  ${diasSelecionados.includes(dia.id)
                    ? 'bg-quatrelati-blue-500 dark:bg-quatrelati-gold-500 text-white dark:text-gray-900 shadow-sm'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                  }`}
                title={dia.full}
              >
                {dia.label}
              </button>
            ))}
          </div>
        </div>

        {/* Horários predefinidos */}
        <div>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase block mb-2">
            Horário
          </span>
          <div className="grid grid-cols-4 gap-2">
            {HORARIOS_PREDEFINIDOS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => aplicarHorarioPredefinido(preset)}
                className={`py-2 px-2 text-xs rounded-lg border transition-all duration-200
                  ${horarioInicio === preset.inicio && horarioFim === preset.fim
                    ? 'border-quatrelati-blue-500 dark:border-quatrelati-gold-500 bg-quatrelati-blue-50 dark:bg-quatrelati-gold-900/20 text-quatrelati-blue-700 dark:text-quatrelati-gold-300 font-medium'
                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Horário personalizado */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-quatrelati-blue-500 dark:text-quatrelati-gold-400" />
            <input
              type="time"
              value={horarioInicio}
              onChange={handleHorarioInicioChange}
              className="w-full pl-10 pr-3 py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-quatrelati-blue-500 dark:focus:ring-quatrelati-gold-500"
            />
          </div>
          <span className="text-gray-400 font-medium text-sm">às</span>
          <div className="flex-1 relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-quatrelati-blue-500 dark:text-quatrelati-gold-400" />
            <input
              type="time"
              value={horarioFim}
              onChange={handleHorarioFimChange}
              className="w-full pl-10 pr-3 py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-quatrelati-blue-500 dark:focus:ring-quatrelati-gold-500"
            />
          </div>
          {value && (
            <button
              type="button"
              onClick={limpar}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Limpar"
            >
              <span className="text-xs">Limpar</span>
            </button>
          )}
        </div>

        {/* Resultado */}
        {value && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {value}
            </span>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
});

HorarioRecebimentoPicker.displayName = 'HorarioRecebimentoPicker';

export default HorarioRecebimentoPicker;
