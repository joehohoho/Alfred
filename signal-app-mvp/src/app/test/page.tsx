'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TestPage() {
  const [symbol, setSymbol] = useState('BTC');
  const [strategy, setStrategy] = useState('SMA_RSI_IMPROVED');
  const [days, setDays] = useState('90');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRunBacktest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          strategy,
          days: parseInt(days),
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Market Signals App - Backtest Interface</h1>

        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Test Strategies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Symbol</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  placeholder="BTC, ETH, AAPL, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Strategy</label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                >
                  <option>SMA_RSI_IMPROVED</option>
                  <option>MACD</option>
                  <option>BOLLINGER</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Days</label>
                <input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  min="7"
                  max="365"
                />
              </div>
            </div>
            <Button
              onClick={handleRunBacktest}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? 'Running...' : 'Run Backtest'}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Results</CardTitle>
            </CardHeader>
            <CardContent>
              {result.error ? (
                <p className="text-red-400">{result.error}</p>
              ) : (
                <pre className="bg-slate-900 p-4 rounded overflow-auto text-slate-300 text-sm">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-8 p-4 bg-slate-800 border border-slate-700 rounded text-slate-300 text-sm">
          <h3 className="font-semibold text-white mb-2">About This Interface</h3>
          <ul className="space-y-1 list-disc list-inside">
            <li>3 proven strategies: SMA+RSI, MACD, Bollinger Bands</li>
            <li>Backtests against historical price data</li>
            <li>Shows win rate, profit factor, Sharpe ratio, max drawdown</li>
            <li>Supports any symbol (crypto: BTC, ETH, stocks: AAPL, MSFT, etc.)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
