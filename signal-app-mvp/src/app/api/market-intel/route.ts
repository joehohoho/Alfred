import { NextResponse } from 'next/server';
import { getFearGreedIndex } from '@/services/data/sentimentClient';
import { getSentimentRegime } from '@/services/strategies/sentimentFilter';
import {
  getFundingRate,
  getOpenInterest,
  getLongShortRatio,
} from '@/services/data/derivativesClient';

/**
 * GET /api/market-intel?symbol=BTC
 *
 * Returns current market intelligence: sentiment, funding rate, open interest
 * trend, long/short ratio, and an overall market bias assessment.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol')?.toUpperCase() || 'BTC';

  const result: Record<string, unknown> = { symbol };

  // --- Fear & Greed Index ---
  try {
    const fgi = await getFearGreedIndex();
    result.sentiment = {
      value: fgi.value,
      classification: fgi.classification,
      regime: getSentimentRegime(fgi.value),
      timestamp: fgi.timestamp,
    };
  } catch (err) {
    result.sentiment = { error: 'Failed to fetch Fear & Greed Index' };
  }

  // --- Funding Rate ---
  try {
    const fundingHistory = await getFundingRate(symbol);
    if (fundingHistory.length > 0) {
      const latest = fundingHistory[fundingHistory.length - 1];
      const ratePercent = latest.rate * 100;
      let fundingBias: string;
      if (latest.rate > 0.0005) fundingBias = 'extreme_positive (overleveraged longs)';
      else if (latest.rate > 0.0001) fundingBias = 'positive (mild long bias)';
      else if (latest.rate < -0.0003) fundingBias = 'extreme_negative (overleveraged shorts)';
      else if (latest.rate < -0.0001) fundingBias = 'negative (mild short bias)';
      else fundingBias = 'neutral';

      result.fundingRate = {
        rate: latest.rate,
        ratePercent: Number(ratePercent.toFixed(4)),
        bias: fundingBias,
        timestamp: latest.timestamp,
      };
    }
  } catch (err) {
    result.fundingRate = { error: 'Failed to fetch funding rate' };
  }

  // --- Open Interest Trend ---
  try {
    const oiHistory = await getOpenInterest(symbol);
    if (oiHistory.length >= 2) {
      const recent = oiHistory[oiHistory.length - 1];
      const previous = oiHistory[oiHistory.length - 2];
      const changePct = ((recent.oi - previous.oi) / previous.oi) * 100;
      let oiTrend: string;
      if (changePct > 5) oiTrend = 'rising_sharply';
      else if (changePct > 1) oiTrend = 'rising';
      else if (changePct < -5) oiTrend = 'falling_sharply';
      else if (changePct < -1) oiTrend = 'falling';
      else oiTrend = 'flat';

      result.openInterest = {
        current: recent.oi,
        previous: previous.oi,
        changePercent: Number(changePct.toFixed(2)),
        trend: oiTrend,
        timestamp: recent.timestamp,
      };
    }
  } catch (err) {
    result.openInterest = { error: 'Failed to fetch open interest' };
  }

  // --- Long/Short Ratio ---
  try {
    const lsHistory = await getLongShortRatio(symbol);
    if (lsHistory.length > 0) {
      const latest = lsHistory[lsHistory.length - 1];
      let crowdBias: string;
      if (latest.longRatio > 68) crowdBias = 'crowded_long';
      else if (latest.longRatio > 55) crowdBias = 'lean_long';
      else if (latest.longRatio < 45) crowdBias = 'crowded_short';
      else if (latest.longRatio < 50) crowdBias = 'lean_short';
      else crowdBias = 'balanced';

      result.longShortRatio = {
        longPercent: Number(latest.longRatio.toFixed(1)),
        shortPercent: Number(latest.shortRatio.toFixed(1)),
        bias: crowdBias,
        timestamp: latest.timestamp,
      };
    }
  } catch (err) {
    result.longShortRatio = { error: 'Failed to fetch long/short ratio' };
  }

  // --- Overall Market Bias ---
  let bullishSignals = 0;
  let bearishSignals = 0;

  // Sentiment contribution
  const sentiment = result.sentiment as any;
  if (sentiment && !sentiment.error) {
    const regime = sentiment.regime;
    if (regime === 'extreme_fear' || regime === 'fear') bullishSignals += 2; // contrarian
    if (regime === 'extreme_greed' || regime === 'greed') bearishSignals += 2; // contrarian
  }

  // Funding rate contribution
  const funding = result.fundingRate as any;
  if (funding && !funding.error) {
    if (funding.rate > 0.0005) bearishSignals += 1; // overleveraged longs = crash risk
    if (funding.rate < -0.0003) bullishSignals += 1; // overleveraged shorts = squeeze risk
  }

  // OI trend contribution
  const oi = result.openInterest as any;
  if (oi && !oi.error) {
    if (oi.trend === 'rising_sharply' || oi.trend === 'rising') bullishSignals += 1; // new money
    if (oi.trend === 'falling_sharply' || oi.trend === 'falling') bearishSignals += 1; // unwinding
  }

  // Long/short ratio contribution (contrarian)
  const ls = result.longShortRatio as any;
  if (ls && !ls.error) {
    if (ls.bias === 'crowded_long') bearishSignals += 1; // too many longs = contrarian bearish
    if (ls.bias === 'crowded_short') bullishSignals += 1; // too many shorts = contrarian bullish
  }

  let overallBias: 'bullish' | 'bearish' | 'neutral';
  if (bullishSignals > bearishSignals + 1) overallBias = 'bullish';
  else if (bearishSignals > bullishSignals + 1) overallBias = 'bearish';
  else overallBias = 'neutral';

  result.overallBias = {
    direction: overallBias,
    bullishSignals,
    bearishSignals,
    reasoning: buildReasoning(result),
  };

  return NextResponse.json(result);
}

function buildReasoning(data: Record<string, unknown>): string[] {
  const reasons: string[] = [];
  const sentiment = data.sentiment as any;
  const funding = data.fundingRate as any;
  const oi = data.openInterest as any;
  const ls = data.longShortRatio as any;

  if (sentiment && !sentiment.error) {
    reasons.push(`Sentiment: ${sentiment.classification} (FGI ${sentiment.value})`);
  }
  if (funding && !funding.error) {
    reasons.push(`Funding rate: ${funding.ratePercent}% — ${funding.bias}`);
  }
  if (oi && !oi.error) {
    reasons.push(`Open interest: ${oi.trend} (${oi.changePercent > 0 ? '+' : ''}${oi.changePercent}%)`);
  }
  if (ls && !ls.error) {
    reasons.push(`Long/Short ratio: ${ls.longPercent}% long — ${ls.bias}`);
  }

  return reasons;
}
