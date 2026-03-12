// ============================================================
// Indicator Settings Panel
// Allows users to enable/disable indicators and edit parameters
// Split into overlay (主图) and subchart (副图) sections
// ============================================================

import { useState, useCallback } from 'react';
import { X, ChevronRight, ChevronDown, Settings2, RotateCcw } from 'lucide-react';
import {
  type IndicatorKey,
  type IndicatorConfig,
  INDICATOR_REGISTRY,
} from '@/lib/indicators';

export interface ActiveIndicator {
  key: IndicatorKey;
  params: Record<string, unknown>;
  enabled: boolean;
}

interface Props {
  activeIndicators: ActiveIndicator[];
  onToggle: (key: IndicatorKey) => void;
  onParamsChange: (key: IndicatorKey, params: Record<string, unknown>) => void;
  onReset: (key: IndicatorKey) => void;
  onClose: () => void;
  lang: 'zh' | 'en';
}

export default function IndicatorSettings({
  activeIndicators,
  onToggle,
  onParamsChange,
  onReset,
  onClose,
  lang,
}: Props) {
  const [expandedKey, setExpandedKey] = useState<IndicatorKey | null>(null);

  const isActive = (key: IndicatorKey) =>
    activeIndicators.some(i => i.key === key && i.enabled);

  const getParams = (key: IndicatorKey) =>
    activeIndicators.find(i => i.key === key)?.params;

  const overlays = INDICATOR_REGISTRY.filter(c => c.type === 'overlay');
  const subcharts = INDICATOR_REGISTRY.filter(c => c.type === 'subchart');

  return (
    <div className="absolute inset-0 z-40 bg-[#0B0E11]/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-2">
          <Settings2 size={16} className="text-[#F0B90B]" />
          <span className="text-sm font-medium text-[#D1D4DC]">
            {lang === 'zh' ? '指标设置' : 'Indicator Settings'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 text-[#848E9C] hover:text-[#D1D4DC] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Overlay indicators */}
        <div className="px-4 pt-3 pb-1">
          <div className="text-[11px] text-[#F0B90B]/70 font-medium tracking-wider uppercase mb-2">
            {lang === 'zh' ? '主图指标' : 'Overlay Indicators'}
          </div>
        </div>
        {overlays.map(config => (
          <IndicatorRow
            key={config.key}
            config={config}
            active={isActive(config.key)}
            expanded={expandedKey === config.key}
            params={getParams(config.key)}
            lang={lang}
            onToggle={() => onToggle(config.key)}
            onExpand={() => setExpandedKey(expandedKey === config.key ? null : config.key)}
            onParamsChange={(p) => onParamsChange(config.key, p)}
            onReset={() => onReset(config.key)}
          />
        ))}

        {/* Divider */}
        <div className="mx-4 my-2 border-t border-[rgba(255,255,255,0.06)]" />

        {/* Sub-chart indicators */}
        <div className="px-4 pt-1 pb-1">
          <div className="text-[11px] text-[#F0B90B]/70 font-medium tracking-wider uppercase mb-2">
            {lang === 'zh' ? '副图指标' : 'Sub-chart Indicators'}
          </div>
        </div>
        {subcharts.map(config => (
          <IndicatorRow
            key={config.key}
            config={config}
            active={isActive(config.key)}
            expanded={expandedKey === config.key}
            params={getParams(config.key)}
            lang={lang}
            onToggle={() => onToggle(config.key)}
            onExpand={() => setExpandedKey(expandedKey === config.key ? null : config.key)}
            onParamsChange={(p) => onParamsChange(config.key, p)}
            onReset={() => onReset(config.key)}
          />
        ))}
        <div className="h-4" />
      </div>
    </div>
  );
}

// ─── Individual Indicator Row ───────────────────────────────

function IndicatorRow({
  config,
  active,
  expanded,
  params,
  lang,
  onToggle,
  onExpand,
  onParamsChange,
  onReset,
}: {
  config: IndicatorConfig;
  active: boolean;
  expanded: boolean;
  params?: Record<string, unknown>;
  lang: 'zh' | 'en';
  onToggle: () => void;
  onExpand: () => void;
  onParamsChange: (params: Record<string, unknown>) => void;
  onReset: () => void;
}) {
  const currentParams = params ?? config.defaultParams;
  const name = lang === 'zh' ? config.nameZh : config.nameEn;

  return (
    <div className="mx-2">
      {/* Main row */}
      <div className="flex items-center gap-2 px-2 py-2 rounded hover:bg-white/5 transition-colors group">
        {/* Toggle switch */}
        <button
          onClick={onToggle}
          className={`w-8 h-4 rounded-full relative transition-colors flex-shrink-0 ${
            active ? 'bg-[#F0B90B]' : 'bg-[#2A2D35]'
          }`}
        >
          <div
            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
              active ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>

        {/* Label */}
        <div className="flex-1 min-w-0" onClick={onExpand}>
          <div className="flex items-center gap-2 cursor-pointer">
            <span className={`text-sm font-medium ${active ? 'text-[#D1D4DC]' : 'text-[#848E9C]'}`}>
              {config.key}
            </span>
            <span className="text-[11px] text-[#848E9C] truncate">{name}</span>
          </div>
        </div>

        {/* Expand arrow */}
        <button
          onClick={onExpand}
          className="p-1 rounded hover:bg-white/10 text-[#848E9C] transition-colors"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* Expanded params editor */}
      {expanded && (
        <div className="ml-10 mr-2 mb-2 p-3 bg-[#12151C] rounded-lg border border-[rgba(255,255,255,0.06)]">
          {Object.entries(config.paramLabels).map(([paramKey, label]) => {
            const value = currentParams[paramKey];
            const isArray = Array.isArray(value);

            return (
              <div key={paramKey} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-[#848E9C]">
                    {lang === 'zh' ? label.zh : label.en}
                  </span>
                </div>
                {isArray ? (
                  <PeriodsEditor
                    values={value as number[]}
                    onChange={(newValues) =>
                      onParamsChange({ ...currentParams, [paramKey]: newValues })
                    }
                  />
                ) : (
                  <NumberInput
                    value={value as number}
                    min={label.min}
                    max={label.max}
                    step={label.step}
                    onChange={(v) =>
                      onParamsChange({ ...currentParams, [paramKey]: v })
                    }
                  />
                )}
              </div>
            );
          })}

          {/* Reset button */}
          <button
            onClick={onReset}
            className="flex items-center gap-1 mt-2 px-2 py-1 rounded text-[10px] text-[#848E9C] hover:text-[#D1D4DC] hover:bg-white/5 transition-colors"
          >
            <RotateCcw size={10} />
            {lang === 'zh' ? '恢复默认' : 'Reset'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Number Input ───────────────────────────────────────────

function NumberInput({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let v = parseFloat(e.target.value);
      if (isNaN(v)) return;
      if (min !== undefined) v = Math.max(min, v);
      if (max !== undefined) v = Math.min(max, v);
      onChange(v);
    },
    [min, max, onChange]
  );

  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={handleChange}
      className="w-full bg-[#1C2030] border border-[rgba(255,255,255,0.1)] rounded px-2 py-1.5 text-xs font-mono text-[#D1D4DC] focus:border-[#F0B90B]/50 focus:outline-none transition-colors"
    />
  );
}

// ─── Periods Array Editor (for MA/EMA) ──────────────────────

function PeriodsEditor({
  values,
  onChange,
}: {
  values: number[];
  onChange: (v: number[]) => void;
}) {
  const [inputValue, setInputValue] = useState('');

  const addPeriod = useCallback(() => {
    const v = parseInt(inputValue);
    if (isNaN(v) || v < 1 || values.includes(v)) return;
    onChange([...values, v].sort((a, b) => a - b));
    setInputValue('');
  }, [inputValue, values, onChange]);

  const removePeriod = useCallback(
    (period: number) => {
      onChange(values.filter(v => v !== period));
    },
    [values, onChange]
  );

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map(p => (
          <span
            key={p}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1C2030] border border-[rgba(255,255,255,0.1)] text-[11px] font-mono text-[#D1D4DC] group"
          >
            {p}
            <button
              onClick={() => removePeriod(p)}
              className="text-[#848E9C] hover:text-[#F6465D] transition-colors"
            >
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          type="number"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addPeriod()}
          placeholder="Add..."
          min={1}
          className="flex-1 bg-[#1C2030] border border-[rgba(255,255,255,0.1)] rounded px-2 py-1 text-[11px] font-mono text-[#D1D4DC] placeholder-[#848E9C]/50 focus:border-[#F0B90B]/50 focus:outline-none transition-colors"
        />
        <button
          onClick={addPeriod}
          className="px-2 py-1 rounded text-[11px] bg-[#F0B90B]/15 text-[#F0B90B] hover:bg-[#F0B90B]/25 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
