'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from 'recharts';

export interface SignalMarker {
  date: string;
  price: number;
  type: 'BUY' | 'SELL';
  strength?: number;
}

interface PriceChartProps {
  data: Array<{ date: string; price: number; sma9?: number; sma21?: number }>;
  signals?: SignalMarker[];
  height?: number;
}

function SignalTooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-lg">
      <div className="text-slate-300 font-medium">{item.date}</div>
      <div className="text-white font-mono">${Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      {item.sma9 != null && !isNaN(item.sma9) && (
        <div className="text-emerald-400">SMA 9: ${Number(item.sma9).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      )}
      {item.sma21 != null && !isNaN(item.sma21) && (
        <div className="text-amber-400">SMA 21: ${Number(item.sma21).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      )}
    </div>
  );
}

export function PriceChart({ data, signals, height = 400 }: PriceChartProps) {
  // Merge signal markers into the data by matching dates
  const signalsByDate = new Map<string, SignalMarker>();
  if (signals) {
    for (const sig of signals) {
      signalsByDate.set(sig.date, sig);
    }
  }

  const chartData = data.map((point) => {
    const signal = signalsByDate.get(point.date);
    return {
      ...point,
      buySignal: signal?.type === 'BUY' ? point.price : undefined,
      sellSignal: signal?.type === 'SELL' ? point.price : undefined,
    };
  });

  // Calculate Y-axis domain with some padding
  const prices = data.map((d) => d.price).filter((p) => p != null && !isNaN(p));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.05;

  // Default brush start: show last 30 days if dataset has 90+ points
  const defaultBrushStart = useMemo(
    () => (chartData.length >= 90 ? chartData.length - 30 : 0),
    [chartData.length],
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={{ stroke: '#475569' }}
          axisLine={{ stroke: '#475569' }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minPrice - padding, maxPrice + padding]}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={{ stroke: '#475569' }}
          axisLine={{ stroke: '#475569' }}
          tickFormatter={(v: number) =>
            v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(2)}`
          }
        />
        <Tooltip content={<SignalTooltipContent />} />
        <Legend
          wrapperStyle={{ color: '#94a3b8', fontSize: 12 }}
        />

        {/* Price line */}
        <Line
          type="monotone"
          dataKey="price"
          stroke="#3b82f6"
          name="Price"
          dot={false}
          strokeWidth={2}
        />

        {/* SMA lines */}
        <Line
          type="monotone"
          dataKey="sma9"
          stroke="#10b981"
          name="SMA 9"
          strokeDasharray="5 5"
          dot={false}
          strokeWidth={1}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="sma21"
          stroke="#f59e0b"
          name="SMA 21"
          strokeDasharray="5 5"
          dot={false}
          strokeWidth={1}
          connectNulls={false}
        />

        {/* Buy signal markers (green dots) */}
        <Line
          type="monotone"
          dataKey="buySignal"
          stroke="none"
          name="Buy Signal"
          dot={{ r: 6, fill: '#22c55e', stroke: '#166534', strokeWidth: 2 }}
          activeDot={{ r: 8, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
          connectNulls={false}
          legendType="circle"
        />

        {/* Sell signal markers (red dots) */}
        <Line
          type="monotone"
          dataKey="sellSignal"
          stroke="none"
          name="Sell Signal"
          dot={{ r: 6, fill: '#ef4444', stroke: '#991b1b', strokeWidth: 2 }}
          activeDot={{ r: 8, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
          connectNulls={false}
          legendType="circle"
        />
        {/* Zoom / pan brush */}
        <Brush
          dataKey="date"
          height={24}
          stroke="#10b981"
          fill="#1e293b"
          travellerWidth={10}
          startIndex={defaultBrushStart}
          endIndex={chartData.length - 1}
          tickFormatter={() => ''}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
