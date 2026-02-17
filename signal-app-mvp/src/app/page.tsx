'use client';

import { useEffect, useState } from 'react';
import { SignalCard } from '@/components/dashboard/SignalCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Signal } from '@/models/Signal';

export default function DashboardPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchSignals() {
    setLoading(true);
    const res = await fetch('/api/signals');
    const data = await res.json();
    setSignals(data.signals ?? []);
    setLoading(false);
  }

  async function runPipeline() {
    setLoading(true);
    await fetch('/api/pipeline', { method: 'POST' });
    await fetchSignals();
  }

  useEffect(() => {
    fetchSignals();
  }, []);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Signal Dashboard</h1>
            <p className="text-gray-600 mt-2">Real-time buy/sell signals for crypto & stocks</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={fetchSignals} variant="outline">
              Refresh
            </Button>
            <Button onClick={runPipeline}>Run Pipeline</Button>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">Loading signals...</CardContent>
          </Card>
        ) : signals.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-600 mb-4">No signals yet. Run the pipeline to generate signals.</p>
              <Button onClick={runPipeline}>Run Pipeline Now</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {signals.slice(0, 9).map((signal, idx) => (
                <SignalCard key={idx} signal={signal} />
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Signals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-3">Symbol</th>
                        <th className="text-left p-3">Type</th>
                        <th className="text-left p-3">Signal</th>
                        <th className="text-left p-3">Price</th>
                        <th className="text-left p-3">RSI</th>
                        <th className="text-left p-3">Confidence</th>
                        <th className="text-left p-3">Generated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {signals.map((signal, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{signal.symbol}</td>
                          <td className="p-3 text-gray-600">{signal.assetType}</td>
                          <td className="p-3">
                            <span
                              className={
                                signal.signalType === 'BUY'
                                  ? 'text-green-600 font-bold'
                                  : signal.signalType === 'SELL'
                                  ? 'text-red-600 font-bold'
                                  : 'text-gray-600'
                              }
                            >
                              {signal.signalType}
                            </span>
                          </td>
                          <td className="p-3 font-mono">${signal.price.toFixed(2)}</td>
                          <td className="p-3 font-mono">{signal.rsi.toFixed(2)}</td>
                          <td className="p-3 font-mono">{(signal.confidence * 100).toFixed(0)}%</td>
                          <td className="p-3 text-gray-600 text-xs">
                            {new Date(signal.generatedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
