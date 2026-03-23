'use client';

interface MetricsCardProps {
  label: string;
  value: string | number;
  unit?: string;
  type?: 'positive' | 'negative' | 'neutral' | 'warning';
  explanation?: string;
}

export function MetricsCard({ label, value, unit, type = 'neutral', explanation }: MetricsCardProps) {
  const typeColors: Record<string, string> = {
    positive: 'text-emerald-400',
    negative: 'text-red-400',
    neutral: 'text-blue-400',
    warning: 'text-amber-400',
  };

  const bgColors: Record<string, string> = {
    positive: 'bg-emerald-500/10 border-emerald-500/30',
    negative: 'bg-red-500/10 border-red-500/30',
    neutral: 'bg-blue-500/10 border-blue-500/30',
    warning: 'bg-amber-500/10 border-amber-500/30',
  };

  return (
    <div className={`p-6 rounded-lg border transition-all hover:shadow-lg ${bgColors[type]}`} title={explanation}>
      <div className="text-sm text-slate-400 mb-2 font-medium">{label}</div>
      <div className={`text-4xl font-bold ${typeColors[type]} flex items-baseline gap-2`}>
        <span>{value}</span>
        {unit && <span className="text-lg text-slate-400">{unit}</span>}
      </div>
      {explanation && <div className="text-xs text-slate-500 mt-2">{explanation}</div>}
    </div>
  );
}
