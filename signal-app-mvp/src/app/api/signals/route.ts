import { NextResponse } from 'next/server';

export async function GET() {
  // Database functionality disabled for demo mode
  // In production, this would call: const signals = await getLatestSignals(50);
  return NextResponse.json({ 
    signals: [],
    message: 'Signals API disabled in demo mode. Use the test interface to run backtests.'
  });
}
