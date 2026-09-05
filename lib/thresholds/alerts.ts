export type AlertLevel = 'NORMAL' | 'ELEVATED' | 'NOTABLE' | 'SIGNIFICANT' | 'ABNORMAL';

export interface AlertContext {
  movePercent: number;
  atr14: number;
  isEarningsWindow: boolean;    // within 7 days before or 2 days after earnings
  isIndexRebalance: boolean;    // within 3 days of rebalance
  isOptionsExpiration: boolean; // options expiration day
  isExDividendDate: boolean;
  dividendAmount?: number;
  vix: number;
  isAfterHours: boolean;
  isTradingHalt: boolean;
}

export interface AlertResult {
  level: AlertLevel;
  atrScore: number;
  adjustedAtrScore: number;
  reason: string;
  triggerFullRebuild: boolean;
  triggerIncremental: boolean;
}

export function calculateAlertScore(ctx: AlertContext): AlertResult {
  if (ctx.isTradingHalt) {
    return {
      level: 'ABNORMAL',
      atrScore: Infinity,
      adjustedAtrScore: Infinity,
      reason: 'Trading halt detected — automatic full rebuild',
      triggerFullRebuild: true,
      triggerIncremental: false,
    };
  }

  let moveForScoring = Math.abs(ctx.movePercent);

  // Ex-dividend: suppress price drop equal to dividend amount
  if (ctx.isExDividendDate && ctx.dividendAmount && ctx.movePercent < 0) {
    moveForScoring = Math.max(0, moveForScoring - ctx.dividendAmount);
  }

  const rawScore = ctx.atr14 > 0 ? moveForScoring / ctx.atr14 : 0;

  let thresholdAdjustment = 0;
  if (ctx.isEarningsWindow) thresholdAdjustment -= 0.5;
  if (ctx.isOptionsExpiration) thresholdAdjustment += 0.5;
  if (ctx.vix > 30) thresholdAdjustment += 1.0;
  if (ctx.isAfterHours) {
    // After hours: apply 1.5x penalty (lower effective score)
    moveForScoring = moveForScoring / 1.5;
  }

  // Rebalance: suppress volume alerts, keep price alerts — no score change here
  const adjustedScore = rawScore - thresholdAdjustment;

  const thresholds = {
    ELEVATED: 1.0,
    NOTABLE: 1.5,
    SIGNIFICANT: 2.0,
    ABNORMAL: 3.0,
  };

  let level: AlertLevel;
  let triggerFullRebuild = false;
  let triggerIncremental = false;

  if (adjustedScore < thresholds.ELEVATED) {
    level = 'NORMAL';
  } else if (adjustedScore < thresholds.NOTABLE) {
    level = 'ELEVATED';
  } else if (adjustedScore < thresholds.SIGNIFICANT) {
    level = 'NOTABLE';
    triggerIncremental = true;
  } else if (adjustedScore < thresholds.ABNORMAL) {
    level = 'SIGNIFICANT';
    triggerIncremental = true;
    triggerFullRebuild = false;
  } else {
    level = 'ABNORMAL';
    triggerFullRebuild = true;
  }

  return {
    level,
    atrScore: rawScore,
    adjustedAtrScore: adjustedScore,
    reason: buildReason(ctx, rawScore, adjustedScore, level),
    triggerFullRebuild,
    triggerIncremental,
  };
}

export function shouldTriggerMaterialEvent(params: {
  movePercentSinceLastSession: number;
  hasNewSecFiling: boolean;
  epsRevisionPct: number;
  hasTier12BreakingNews: boolean;
  daysToEarnings: number | null;
  hasConfirmedMaterialFactor: boolean;
}): { trigger: boolean; reason: string } {
  const reasons: string[] = [];

  if (Math.abs(params.movePercentSinceLastSession) >= 5) {
    reasons.push(`Price moved ${params.movePercentSinceLastSession.toFixed(1)}% since last session`);
  }
  if (params.hasNewSecFiling) {
    reasons.push('New SEC filing detected');
  }
  if (Math.abs(params.epsRevisionPct) >= 10) {
    reasons.push(`EPS consensus revised ${params.epsRevisionPct > 0 ? '+' : ''}${params.epsRevisionPct.toFixed(1)}%`);
  }
  if (params.hasTier12BreakingNews) {
    reasons.push('Breaking news in Tier 1-2 source');
  }
  if (params.daysToEarnings !== null && params.daysToEarnings <= 7) {
    reasons.push(`Earnings in ${params.daysToEarnings} days`);
  }
  if (params.hasConfirmedMaterialFactor) {
    reasons.push('Confirmed material external factor');
  }

  return {
    trigger: reasons.length > 0,
    reason: reasons.join('; '),
  };
}

function buildReason(
  ctx: AlertContext,
  rawScore: number,
  adjustedScore: number,
  level: AlertLevel
): string {
  const parts = [`Raw ATR score: ${rawScore.toFixed(2)}`];
  if (ctx.isEarningsWindow) parts.push('earnings window (-0.5 threshold)');
  if (ctx.isOptionsExpiration) parts.push('options expiration (+0.5 threshold)');
  if (ctx.vix > 30) parts.push(`VIX ${ctx.vix.toFixed(0)} > 30 (+1.0 threshold)`);
  if (ctx.isAfterHours) parts.push('after hours (1.5x penalty)');
  parts.push(`Adjusted score: ${adjustedScore.toFixed(2)} → ${level}`);
  return parts.join(', ');
}
