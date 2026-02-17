import type { Signal } from '@/models/Signal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpCircle, ArrowDownCircle, MinusCircle } from 'lucide-react';

interface SignalCardProps {
  signal: Signal;
}

export function SignalCard({ signal }: SignalCardProps) {
  const icon =
    signal.signalType === 'BUY' ? (
      <ArrowUpCircle className="h-6 w-6 text-green-500" />
    ) : signal.signalType === 'SELL' ? (
      <ArrowDownCircle className="h-6 w-6 text-red-500" />
    ) : (
      <MinusCircle className="h-6 w-6 text-gray-400" />
    );

  const bgColor =
    signal.signalType === 'BUY'
      ? 'bg-green-50'
      : signal.signalType === 'SELL'
      ? 'bg-red-50'
      : 'bg-gray-50';

  return (
    <Card className={bgColor}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{signal.symbol}</CardTitle>
          {icon}
        </div>
        <div className="text-sm text-gray-500">{signal.assetType.toUpperCase()}</div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="font-medium">Signal:</span>
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
          </div>
          <div className="flex justify-between">
            <span>Price:</span>
            <span className="font-mono">${signal.price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>RSI:</span>
            <span className="font-mono">{signal.rsi.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Confidence:</span>
            <span className="font-mono">{(signal.confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="pt-2 text-xs text-gray-600 border-t">{signal.rationale}</div>
        </div>
      </CardContent>
    </Card>
  );
}
