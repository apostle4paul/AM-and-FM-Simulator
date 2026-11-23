import React from 'react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  sublabel?: string;
  subtext?: string;
  tone?: 'default' | 'neutral' | 'cyan' | 'blue' | 'amber' | 'emerald' | 'rose';
}

const VALUE_TONE_CLASSES: Record<NonNullable<MetricCardProps['tone']>, string> = {
  default: 'text-slate-100',
  neutral: 'text-slate-100',
  cyan: 'text-cyan-400',
  blue: 'text-blue-400',
  amber: 'text-amber-400',
  emerald: 'text-emerald-400',
  rose: 'text-rose-400',
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  sublabel,
  subtext,
  tone = 'default',
}) => {
  const secondaryText = sublabel ?? subtext;

  return (
    <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4 flex flex-col justify-between">
      <div className="text-xs font-medium text-slate-400 tracking-wide truncate">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={`text-2xl font-semibold font-mono tabular-nums ${VALUE_TONE_CLASSES[tone]}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-mono text-slate-400 uppercase">{unit}</span>}
      </div>
      {secondaryText && (
        <div className="mt-1.5 text-xs text-slate-400 font-mono tabular-nums truncate">
          {secondaryText}
        </div>
      )}
    </div>
  );
};
