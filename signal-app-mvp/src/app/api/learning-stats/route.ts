import { NextResponse } from 'next/server';
import {
  getLearnedPatterns,
  getActionableLosingPatterns,
  getActionableWinningPatterns,
} from '@/services/learning/tradeAnalyzer';

/**
 * GET /api/learning-stats?symbol=BTC
 *
 * Returns the adaptive learning system's accumulated knowledge for a symbol:
 * - Total patterns learned
 * - Top 5 losing patterns with confidence scores
 * - Top 5 winning patterns with confidence scores
 * - Total trades analyzed
 * - When the patterns were last updated
 * - How many patterns are actionable (meet minimum-trade threshold)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolParam = searchParams.get('symbol');

    if (!symbolParam || typeof symbolParam !== 'string') {
      return NextResponse.json(
        { error: 'Missing required query parameter: symbol' },
        { status: 400 },
      );
    }

    const symbol = symbolParam.toUpperCase();
    const patterns = getLearnedPatterns(symbol);

    if (!patterns) {
      return NextResponse.json({
        symbol,
        status: 'no_data',
        message: 'No learned patterns for this symbol yet. Run a backtest or paper trade session first.',
        totalPatternsLearned: 0,
        totalTradesAnalyzed: 0,
        topLosingPatterns: [],
        topWinningPatterns: [],
        actionableLosingCount: 0,
        actionableWinningCount: 0,
        lastUpdated: null,
      });
    }

    const actionableLosing = getActionableLosingPatterns(symbol);
    const actionableWinning = getActionableWinningPatterns(symbol);

    return NextResponse.json({
      symbol,
      status: 'active',
      totalPatternsLearned:
        patterns.losingPatterns.length + patterns.winningPatterns.length,
      totalTradesAnalyzed: patterns.totalTrades,
      lastUpdated: patterns.lastUpdated,

      topLosingPatterns: patterns.losingPatterns.slice(0, 5).map((p) => ({
        condition: p.condition,
        lossCount: p.lossCount,
        winCount: p.winCount,
        avgLoss: p.avgLoss,
        confidence: p.confidence,
        actionable: (p.lossCount + p.winCount) >= 5 && p.confidence > 0.65,
      })),

      topWinningPatterns: patterns.winningPatterns.slice(0, 5).map((p) => ({
        condition: p.condition,
        winCount: p.winCount,
        lossCount: p.lossCount,
        avgWin: p.avgWin,
        confidence: p.confidence,
        actionable: (p.lossCount + p.winCount) >= 5 && p.confidence > 0.65,
      })),

      actionableLosingCount: actionableLosing.length,
      actionableWinningCount: actionableWinning.length,

      filterBehavior: {
        description:
          'BUY signals are blocked when 2+ high-confidence losing patterns match the current market context, unless a winning pattern also matches.',
        confidenceThreshold: 0.65,
        minTradesRequired: 5,
        maxPatternsPerSymbol: 20,
        decayAfterDays: 30,
        paperTradeWeight: '2x (paper trade outcomes count double)',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to retrieve learning stats: ${message}` },
      { status: 500 },
    );
  }
}
