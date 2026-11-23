import React, { useId } from 'react';
import { AlertTriangle } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, actions }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
      <div className="min-w-0">
        <h1 className="font-display text-xl sm:text-2xl font-semibold text-slate-100 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-4xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
};

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  formatValue?: (val: number) => string;
  disabled?: boolean;
  hint?: string;
  onChange: (val: number) => void;
}

export const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  formatValue,
  disabled = false,
  hint,
  onChange,
}) => {
  const inputId = useId();
  const displayVal = formatValue ? formatValue(value) : String(value);

  return (
    <div className={`space-y-1.5 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <label htmlFor={inputId} className="text-slate-300 font-medium">
          {label}
        </label>
        <span className="font-mono tabular-nums text-cyan-300">
          {displayVal}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value);
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
        className="w-full accent-cyan-400 cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-2 rounded"
      />
      {hint && <p className="text-[11px] text-slate-500 leading-snug">{hint}</p>}
    </div>
  );
};

interface WarningNoticeProps {
  tone?: 'amber' | 'rose' | 'cyan';
  title: string;
  children: React.ReactNode;
}

const WARNING_STYLES: Record<NonNullable<WarningNoticeProps['tone']>, string> = {
  amber: 'bg-amber-950/35 border-amber-500/45 text-amber-200',
  rose: 'bg-rose-950/40 border-rose-500/50 text-rose-200',
  cyan: 'bg-cyan-950/35 border-cyan-500/45 text-cyan-200',
};

export const WarningNotice: React.FC<WarningNoticeProps> = ({
  tone = 'amber',
  title,
  children,
}) => {
  return (
    <div className={`border rounded-md p-3.5 text-xs ${WARNING_STYLES[tone]}`}>
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="font-semibold">{title}</div>
          <div className="leading-relaxed opacity-90">{children}</div>
        </div>
      </div>
    </div>
  );
};
