'use client';

import React, { useState } from 'react';

interface Trade {
  id?: number;
  entry: number;
  exit: number;
  entryTime: string;
  exitTime: string;
  pnl: number;
  pnlPct: number;
  daysHeld: number;
  fee?: number;
  // Legacy field names (backward compat)
  entryPrice?: number;
  exitPrice?: number;
  entryDate?: string;
  exitDate?: string;
  profitLoss?: number;
  profitLossPercent?: number;
}

interface TradeTableProps {
  trades: Trade[];
  maxVisible?: number;
}

export function TradeTable({ trades, maxVisible = 10 }: TradeTableProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(trades.length / maxVisible);
  const visibleTrades = trades.slice(page * maxVisible, (page + 1) * maxVisible);

  const formatPrice = (price: number | undefined) => price != null ? `$${price.toFixed(2)}` : '—';
  const formatPercent = (pct: number | undefined) => pct != null ? `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%` : '—';

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-slate-700/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/50 border-b border-slate-700/50">
              <th className="px-4 py-3 text-left font-semibold text-slate-300">#</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Entry</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Exit</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-300">P&L</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-300">%</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-300">Days</th>
            </tr>
          </thead>
          <tbody>
            {visibleTrades.map((trade, idx) => (
              <tr
                key={idx}
                className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors"
              >
                <td className="px-4 py-3 text-slate-400">{page * maxVisible + idx + 1}</td>
                <td className="px-4 py-3">
                  <div className="text-slate-200">{formatPrice(trade.entry ?? trade.entryPrice)}</div>
                  <div className="text-xs text-slate-500">{new Date(trade.entryTime || trade.entryDate || '').toLocaleDateString()}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-slate-200">{formatPrice(trade.exit ?? trade.exitPrice)}</div>
                  <div className="text-xs text-slate-500">{new Date(trade.exitTime || trade.exitDate || '').toLocaleDateString()}</div>
                </td>
                <td className={`px-4 py-3 text-right font-semibold ${(trade.pnl ?? trade.profitLoss ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatPrice(trade.pnl ?? trade.profitLoss)}
                </td>
                <td className={`px-4 py-3 text-right font-semibold ${(trade.pnlPct ?? trade.profitLossPercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatPercent(trade.pnlPct ?? trade.profitLossPercent)}
                </td>
                <td className="px-4 py-3 text-right text-slate-400">{trade.daysHeld}d</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {trades.length > maxVisible && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <div>
            {page * maxVisible + 1}-{Math.min((page + 1) * maxVisible, trades.length)} of {trades.length} trades
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded bg-slate-800/50 border border-slate-700/50 disabled:opacity-50 hover:bg-slate-800 transition-colors"
            >
              ← Prev
            </button>
            <div className="px-3 py-1 text-slate-500">
              Page {page + 1} of {totalPages}
            </div>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page === totalPages - 1}
              className="px-3 py-1 rounded bg-slate-800/50 border border-slate-700/50 disabled:opacity-50 hover:bg-slate-800 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
