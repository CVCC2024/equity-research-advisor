import { runFundamentalsMaker } from './maker-fundamentals';
import { runMacroMaker } from './maker-macro';
import { runIndustryMaker } from './maker-industry';
import { runRegulatoryMaker } from './maker-regulatory';
import { runChecker } from './checker';
import { runCorrelation } from './correlation';
import { runSynthesis } from './synthesis';
import { callClaudeForJson } from '@/lib/claude/client';
import {
  upsertTicker,
  getTicker,
  createSession,
  updateSessionOutputs,
  getLatestSession,
  insertSignals,
  insertExternalFactors,
  insertBreakingClaims,
  insertSources,
  upsertFilingDigest,
} from '@/lib/db/queries';
import {
  getReport,
  setReport,
  getLastSessionId,
  setLastSessionId,
} from '@/lib/cache/redis';
import type {
  MakerFundamentalsOutput,
  MakerMacroOutput,
  MakerIndustryOutput,
  MakerRegulatoryOutput,
  CorrelationOutput,
  CheckerOutput,
  BreakingClaim,
  PipelineResult,
} from './types';

const HOUR_MS = 3_600_000;

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

function accumulate(usage: TokenUsage, add: { inputTokens: number; outputTokens: number }) {
  usage.inputTokens += add.inputTokens;
  usage.outputTokens += add.outputTokens;
}

async function runBreakingNewsGate(params: {
  ticker: string;
  claim: string;
  originatingAgent: string;
  failureReason: string;
  earliestSourceTimestamp: string | null;
}): Promise<BreakingClaim> {
  const ageMs = params.earliestSourceTimestamp
    ? Date.now() - new Date(params.earliestSourceTimestamp).getTime()
    : Infinity;

  if (ageMs > 4 * HOUR_MS) {
    return {
      claim_id: crypto.randomUUID(),
      original_claim: params.claim,
      originating_agent: params.originatingAgent,
      failure_reason: params.failureReason,
      earliest_source_timestamp: params.earliestSourceTimestamp,
      classification: 'EXCLUDED',
      current_status: 'EXCLUDED',
      confidence_score: null,
    };
  }

  try {
    const result = await callClaudeForJson<{
      classification: 'BREAKING_CONFIRMED' | 'BREAKING_UNCONFIRMED' | 'BREAKING_RUMOR';
      confidence_score: number;
      evidence: string;
    }>({
      systemPrompt:
        'You are a breaking news verification agent. Verify the claim via web search and classify it.',
      userMessage: `Verify this claim about ${params.ticker}: "${params.claim}". Search for corroborating sources. Return JSON with fields: classification (BREAKING_CONFIRMED|BREAKING_UNCONFIRMED|BREAKING_RUMOR), confidence_score (0-1), evidence (string).`,
      maxTokens: 2000,
      timeoutMs: 120_000,
    });

    return {
      claim_id: crypto.randomUUID(),
      original_claim: params.claim,
      originating_agent: params.originatingAgent,
      failure_reason: params.failureReason,
      earliest_source_timestamp: params.earliestSourceTimestamp,
      classification: result.data.classification,
      current_status: 'ACTIVE',
      confidence_score: result.data.confidence_score,
    };
  } catch {
    return {
      claim_id: crypto.randomUUID(),
      original_claim: params.claim,
      originating_agent: params.originatingAgent,
      failure_reason: params.failureReason,
      earliest_source_timestamp: params.earliestSourceTimestamp,
      classification: 'BREAKING_UNCONFIRMED',
      current_status: 'ACTIVE',
      confidence_score: null,
    };
  }
}

async function runMakerRetry(params: {
  ticker: string;
  originatingAgent: string;
  originalClaim: string;
  correctionPrompt: string;
  companyName?: string;
}): Promise<{ correctedData: unknown; success: boolean }> {
  try {
    const result = await callClaudeForJson<unknown>({
      systemPrompt: `You are correcting a specific data point for ${params.ticker}. Return ONLY a JSON object with the corrected field(s).`,
      userMessage: params.correctionPrompt,
      maxTokens: 2000,
      timeoutMs: 120_000,
    });
    return { correctedData: result.data, success: true };
  } catch {
    return { correctedData: null, success: false };
  }
}

export type PipelineProgressEvent =
  | { step: 'agent_done'; agent: string; status: 'ok' | 'error' }
  | { step: 'phase'; label: string };

export async function runResearchPipeline(
  ticker: string,
  onProgress?: (event: PipelineProgressEvent) => void
): Promise<PipelineResult> {
  const symbol = ticker.toUpperCase();
  const start = Date.now();
  const usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  const errorLog: unknown[] = [];
  const breakingClaims: BreakingClaim[] = [];

  // Check cache first
  const cached = await getReport(symbol).catch(() => null);
  if (cached) {
    const lastSessionId = await getLastSessionId(symbol).catch(() => null);
    return {
      sessionId: lastSessionId ?? '',
      ticker: symbol,
      synthesisMarkdown: cached,
      session: {} as never,
      breakingClaims: [],
    };
  }

  // Determine session type
  const existingTicker = await getTicker(symbol).catch(() => null);
  let sessionType: 'FULL' | 'INCREMENTAL' | 'REFRESH' = 'FULL';
  let priorSessionSummary: string | null = null;

  if (existingTicker) {
    const lastResearched = existingTicker.last_researched_at
      ? new Date(existingTicker.last_researched_at).getTime()
      : 0;
    const hoursSince = (Date.now() - lastResearched) / HOUR_MS;

    if (hoursSince < 24) {
      sessionType = 'INCREMENTAL';
    }

    const latestSession = await getLatestSession(existingTicker.ticker_id).catch(() => null);
    if (latestSession?.synthesis_markdown) {
      priorSessionSummary = latestSession.synthesis_markdown.slice(0, 2000);
    }
  }

  const tickerRecord = await upsertTicker(symbol, existingTicker?.company_name ?? undefined).catch(() => ({
    ticker_id: crypto.randomUUID(),
    symbol,
    company_name: null as string | null,
  }));
  const session = await createSession(tickerRecord.ticker_id, sessionType).catch(() => ({
    session_id: crypto.randomUUID(),
  }));
  const sessionId = session.session_id;

  // Step 1: Run 4 Makers in parallel
  const [fundResult, macroResult, industryResult, regulatoryResult] = await Promise.allSettled([
    runFundamentalsMaker(symbol, tickerRecord.company_name ?? undefined),
    runMacroMaker(symbol, tickerRecord.company_name ?? undefined),
    runIndustryMaker(symbol, tickerRecord.company_name ?? undefined),
    runRegulatoryMaker(symbol, tickerRecord.company_name ?? undefined),
  ]);

  let fundamentals: MakerFundamentalsOutput | null = null;
  let macro: MakerMacroOutput | null = null;
  let industry: MakerIndustryOutput | null = null;
  let regulatory: MakerRegulatoryOutput | null = null;

  if (fundResult.status === 'fulfilled') {
    fundamentals = fundResult.value.output;
    accumulate(usage, fundResult.value);
    // Update company name from fundamentals
    if (fundamentals.company_name && !tickerRecord.company_name) {
      await upsertTicker(symbol, fundamentals.company_name).catch(() => null);
    }
  } else {
    errorLog.push({ agent: 'maker-fundamentals', error: String(fundResult.reason) });
  }

  if (macroResult.status === 'fulfilled') {
    macro = macroResult.value.output;
    accumulate(usage, macroResult.value);
  } else {
    errorLog.push({ agent: 'maker-macro', error: String(macroResult.reason) });
  }

  if (industryResult.status === 'fulfilled') {
    industry = industryResult.value.output;
    accumulate(usage, industryResult.value);
  } else {
    errorLog.push({ agent: 'maker-industry', error: String(industryResult.reason) });
  }

  if (regulatoryResult.status === 'fulfilled') {
    regulatory = regulatoryResult.value.output;
    accumulate(usage, regulatoryResult.value);
  } else {
    errorLog.push({ agent: 'maker-regulatory', error: String(regulatoryResult.reason) });
  }

  // Store partial maker results
  await updateSessionOutputs(sessionId, {
    maker_fundamentals_output: fundamentals,
    maker_macro_output: macro,
    maker_industry_output: industry,
    maker_regulatory_output: regulatory,
  }).catch(() => null);

  // Step 2: First Checker pass
  let checkerFirst: CheckerOutput | null = null;
  try {
    const checkerResult = await runChecker({
      ticker: symbol,
      fundamentals,
      macro,
      industry,
      regulatory,
    });
    checkerFirst = checkerResult.output;
    accumulate(usage, checkerResult);
  } catch (err) {
    errorLog.push({ agent: 'checker-first', error: String(err) });
  }

  // Step 3: Process reroutes and breaking news
  if (checkerFirst) {
    for (const reroute of checkerFirst.reroute_requests ?? []) {
      const retry = await runMakerRetry({
        ticker: symbol,
        originatingAgent: reroute.originating_agent,
        originalClaim: reroute.original_claim,
        correctionPrompt: reroute.correction_prompt,
      });
      if (!retry.success) {
        // Enter breaking news gate
        const breaking = await runBreakingNewsGate({
          ticker: symbol,
          claim: reroute.original_claim,
          originatingAgent: reroute.originating_agent,
          failureReason: reroute.failure_reason,
          earliestSourceTimestamp: null,
        });
        breakingClaims.push(breaking);
      }
    }

    for (const critical of checkerFirst.critical_failures ?? []) {
      if (critical.breaking_news_gate_eligible) {
        const breaking = await runBreakingNewsGate({
          ticker: symbol,
          claim: critical.claim,
          originatingAgent: critical.originating_agent,
          failureReason: critical.failure_type,
          earliestSourceTimestamp: critical.earliest_source_timestamp,
        });
        breakingClaims.push(breaking);
      }
    }
  }

  // Step 4: Correlation Agent
  let correlation: CorrelationOutput | null = null;
  try {
    const corrResult = await runCorrelation({
      ticker: symbol,
      fundamentals,
      macro,
      industry,
      regulatory,
      checkerSummary: checkerFirst?.summary ?? null,
    });
    correlation = corrResult.output;
    accumulate(usage, corrResult);
  } catch (err) {
    errorLog.push({ agent: 'correlation', error: String(err) });
  }

  // Step 5: Second Checker pass (validates Correlation output)
  let checkerSecond: CheckerOutput | null = null;
  try {
    const checker2Result = await runChecker({
      ticker: symbol,
      fundamentals,
      macro,
      industry,
      regulatory,
      correlation,
      maxTokens: 6000,
      timeoutMs: 180_000,
    });
    checkerSecond = checker2Result.output;
    accumulate(usage, checker2Result);
  } catch (err) {
    errorLog.push({ agent: 'checker-second', error: String(err) });
  }

  // Step 6: Synthesis
  let synthesisMarkdown = '';
  try {
    const synthResult = await runSynthesis({
      ticker: symbol,
      fundamentals,
      macro,
      industry,
      regulatory,
      correlation,
      checkerFirst,
      checkerSecond,
      breakingClaims,
      priorSessionSummary,
    });
    synthesisMarkdown = synthResult.markdown;
    accumulate(usage, synthResult);
  } catch (err) {
    errorLog.push({ agent: 'synthesis', error: String(err) });
    synthesisMarkdown = `# Research Error\n\nFailed to generate synthesis for ${symbol}.\n\nErrors: ${JSON.stringify(errorLog)}`;
  }

  // Step 7: Calculate composite confidence
  const allScores = [
    ...(checkerFirst?.confidence_scores ?? []),
    ...(checkerSecond?.confidence_scores ?? []),
  ].map((s) => s.composite_score);
  const confidenceComposite =
    allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : null;

  const durationMs = Date.now() - start;

  // Step 8: Persist to Supabase
  const finalStatus: 'COMPLETED' | 'PARTIAL' | 'FAILED' =
    synthesisMarkdown && !synthesisMarkdown.startsWith('# Research Error')
      ? 'COMPLETED'
      : errorLog.length > 0
      ? 'PARTIAL'
      : 'COMPLETED';

  await updateSessionOutputs(sessionId, {
    correlation_output: correlation,
    checker_output: checkerFirst,
    synthesis_markdown: synthesisMarkdown,
    confidence_composite: confidenceComposite,
    status: finalStatus,
    completed_at: new Date().toISOString(),
    total_claims_checked: checkerFirst?.summary.total_claims_checked ?? 0,
    claims_passed: checkerFirst?.summary.passed ?? 0,
    claims_corrected: checkerFirst?.summary.corrected_minor ?? 0,
    claims_excluded: checkerFirst?.summary.critical_failures ?? 0,
    claims_breaking: breakingClaims.length,
    duration_ms: durationMs,
    error_log: errorLog.length > 0 ? errorLog : null,
  }).catch(() => null);

  // Persist signals, factors, filings, sources
  if (correlation) {
    await insertSignals(
      sessionId,
      tickerRecord.ticker_id,
      correlation.signal_convergence_map ?? []
    ).catch(() => null);
    await insertExternalFactors(
      sessionId,
      tickerRecord.ticker_id,
      correlation.external_factors ?? []
    ).catch(() => null);
  }

  if (breakingClaims.length > 0) {
    await insertBreakingClaims(sessionId, tickerRecord.ticker_id, breakingClaims).catch(() => null);
  }

  if (checkerFirst?.source_tier_assignments) {
    const tierLabels = ['Audited/Regulatory', 'Institutional', 'Professional', 'Crowdsourced/Social', 'Unverified/Adversarial'];
    await insertSources(
      sessionId,
      checkerFirst.source_tier_assignments.map((s) => ({
        name: s.source_name,
        url: s.source_url,
        tier: s.assigned_tier,
        tier_label: s.tier_label || tierLabels[s.assigned_tier - 1] || 'Unknown',
      }))
    ).catch(() => null);
  }

  // Persist filing digests
  if (fundamentals?.filings) {
    const { most_recent_10k, most_recent_10q } = fundamentals.filings as {
      most_recent_10k?: { filed_date?: string; period_end?: string; accession_number?: string; summary?: string; key_risk_factors?: string[] };
      most_recent_10q?: { filed_date?: string; period_end?: string; accession_number?: string; summary?: string };
    };

    if (most_recent_10k?.filed_date && most_recent_10k.summary) {
      await upsertFilingDigest(tickerRecord.ticker_id, {
        filing_type: '10-K',
        filing_date: most_recent_10k.filed_date,
        period_end_date: most_recent_10k.period_end,
        accession_number: most_recent_10k.accession_number,
        summary: most_recent_10k.summary,
        risk_factors: most_recent_10k.key_risk_factors,
      }).catch(() => null);
    }

    if (most_recent_10q?.filed_date && most_recent_10q.summary) {
      await upsertFilingDigest(tickerRecord.ticker_id, {
        filing_type: '10-Q',
        filing_date: most_recent_10q.filed_date,
        period_end_date: most_recent_10q.period_end,
        accession_number: most_recent_10q.accession_number,
        summary: most_recent_10q.summary,
      }).catch(() => null);
    }
  }

  // Cache results
  await setReport(symbol, synthesisMarkdown).catch(() => null);
  await setLastSessionId(symbol, sessionId).catch(() => null);

  return {
    sessionId,
    ticker: symbol,
    synthesisMarkdown,
    session: { ...session, status: finalStatus } as never,
    breakingClaims,
  };
}
