import { NextResponse } from 'next/server';

export async function POST() {
  // Pipeline functionality disabled for demo mode
  // In production, this would call: const signals = await runSignalPipeline();
  return NextResponse.json({ 
    ok: true, 
    count: 0, 
    signals: [],
    message: 'Pipeline API disabled in demo mode. Use CLI: npm run backtest:compare'
  });
}
