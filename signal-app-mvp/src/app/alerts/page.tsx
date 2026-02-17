'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Alert {
  id: string;
  symbol: string;
  threshold: number;
  enabled: boolean;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [newThreshold, setNewThreshold] = useState(0.05);

  async function fetchAlerts() {
    const res = await fetch('/api/alerts');
    const data = await res.json();
    setAlerts(data.alerts ?? []);
  }

  async function addAlert() {
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: newSymbol.toUpperCase(), threshold: newThreshold, enabled: true })
    });
    setNewSymbol('');
    await fetchAlerts();
  }

  useEffect(() => {
    fetchAlerts();
  }, []);

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Alert Settings</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Alert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Symbol (e.g., BTC, AAPL)"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-md"
              />
              <input
                type="number"
                step="0.01"
                value={newThreshold}
                onChange={(e) => setNewThreshold(Number(e.target.value))}
                className="w-32 px-4 py-2 border rounded-md"
              />
              <Button onClick={addAlert}>Add Alert</Button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Threshold: confidence level required to trigger alert (0-1)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No alerts configured yet</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                  >
                    <div>
                      <div className="font-semibold">{alert.symbol}</div>
                      <div className="text-sm text-gray-600">
                        Threshold: {(alert.threshold * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div
                      className={`px-3 py-1 rounded text-sm ${
                        alert.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {alert.enabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
