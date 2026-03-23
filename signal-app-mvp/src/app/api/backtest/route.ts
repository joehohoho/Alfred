import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, strategy, days } = body;

    // Return a sample result structure for testing
    // In production, this would call the actual backtest engine
    return NextResponse.json({
      symbol,
      strategy,
      days,
      status: 'success',
      metrics: {
        winRate: '62.5%',
        profitFactor: 1.89,
        sharpeRatio: 1.42,
        maxDrawdown: '8.5%',
        totalPnL: '$1,234.56',
        totalTrades: 16,
      },
      trades: [
        {
          id: 1,
          entry: 28500,
          exit: 29200,
          pnl: 700,
          pnlPct: 2.45,
          daysHeld: 3,
        },
        {
          id: 2,
          entry: 29100,
          exit: 28800,
          pnl: -315,
          pnlPct: -1.03,
          daysHeld: 2,
        },
      ],
      message: 'Backtest completed (demo data). Run `npm run backtest:compare` in the CLI for real results.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 400 }
    );
  }
}
