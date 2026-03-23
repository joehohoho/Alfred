'use client';

import React from 'react';
import { BarChart3, TrendingUp, Zap } from 'lucide-react';

interface StrategyCardProps {
  id: string;
  title: string;
  description: string;
  metrics: string;
  icon?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
}

const defaultIcons: Record<string, React.ReactNode> = {
  sma: <BarChart3 className="w-6 h-6" />,
  macd: <TrendingUp className="w-6 h-6" />,
  bollinger: <Zap className="w-6 h-6" />,
};

export function StrategyCard({
  id,
  title,
  description,
  metrics,
  icon,
  selected = false,
  onClick,
}: StrategyCardProps) {
  return (
    <button
      onClick={onClick}
      className={`p-6 rounded-lg border transition-all duration-200 text-left cursor-pointer ${
        selected
          ? 'bg-emerald-500/20 border-emerald-500/60 ring-2 ring-emerald-500'
          : 'bg-slate-800/30 border-slate-700/50 hover:border-emerald-500/50 hover:bg-slate-800/50'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
          selected ? 'bg-emerald-500/40 text-emerald-300' : 'bg-slate-700/50 text-slate-400'
        }`}
      >
        {icon || defaultIcons[id] || defaultIcons.sma}
      </div>
      <h4 className="text-lg font-semibold mb-2">{title}</h4>
      <p className="text-sm text-slate-400 mb-3">{description}</p>
      <div className={`text-xs transition-colors ${selected ? 'text-emerald-300 font-medium' : 'text-slate-500'}`}>
        {metrics}
      </div>
    </button>
  );
}
