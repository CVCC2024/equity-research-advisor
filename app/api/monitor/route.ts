import { NextRequest, NextResponse } from 'next/server';
import { calculateAlertScore, shouldTriggerMaterialEvent } from '@/lib/thresholds/alerts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      ticker,
      movePercent,
      atr14,
      isEarningsWindow = false,
      isIndexRebalance = false,
      isOptionsExpiration = false,
      isExDividendDate = false,
      dividendAmount,
      vix = 15,
      isAfterHours = false,
      isTradingHalt = false,
      movePercentSinceLastSession = 0,
      hasNewSecFiling = false,
      epsRevisionPct = 0,
      hasTier12BreakingNews = false,
      daysToEarnings = null,
      hasConfirmedMaterialFactor = false,
    } = body;

    if (!ticker || movePercent === undefined || atr14 === undefined) {
      return NextResponse.json({ error: 'ticker, movePercent, and atr14 are required' }, { status: 400 });
    }

    const alertResult = calculateAlertScore({
      movePercent,
      atr14,
      isEarningsWindow,
      isIndexRebalance,
      isOptionsExpiration,
      isExDividendDate,
      dividendAmount,
      vix,
      isAfterHours,
      isTradingHalt,
    });

    const materialEvent = shouldTriggerMaterialEvent({
      movePercentSinceLastSession,
      hasNewSecFiling,
      epsRevisionPct,
      hasTier12BreakingNews,
      daysToEarnings,
      hasConfirmedMaterialFactor,
    });

    return NextResponse.json({
      ticker,
      alertLevel: alertResult.level,
      atrScore: alertResult.atrScore,
      adjustedAtrScore: alertResult.adjustedAtrScore,
      reason: alertResult.reason,
      triggerFullRebuild: alertResult.triggerFullRebuild || materialEvent.trigger,
      triggerIncremental: alertResult.triggerIncremental,
      materialEventTriggered: materialEvent.trigger,
      materialEventReason: materialEvent.reason,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
