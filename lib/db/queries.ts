import supabaseAdmin from './supabase';
import type {
  MakerFundamentalsOutput,
  MakerMacroOutput,
  MakerIndustryOutput,
  MakerRegulatoryOutput,
  CorrelationOutput,
  CheckerOutput,
  BreakingClaim,
  ExternalFactor,
  ConvergenceSignal,
} from '@/lib/agents/types';

// ---- Tickers ----

export async function upsertTicker(symbol: string, companyName?: string) {
  const { data, error } = await supabaseAdmin
    .from('tickers')
    .upsert(
      {
        symbol: symbol.toUpperCase(),
        company_name: companyName ?? null,
        last_researched_at: new Date().toISOString(),
      },
      { onConflict: 'symbol' }
    )
    .select()
    .single();

  if (error) throw new Error(`upsertTicker: ${error.message}`);
  return data;
}

export async function getTicker(symbol: string) {
  const { data } = await supabaseAdmin
    .from('tickers')
    .select('*')
    .eq('symbol', symbol.toUpperCase())
    .single();
  return data;
}

export async function getRecentTickers(limit = 10) {
  const { data } = await supabaseAdmin
    .from('tickers')
    .select('*, research_sessions(confidence_composite, initiated_at)')
    .order('last_researched_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ---- Research Sessions ----

export async function createSession(tickerId: string, sessionType: 'FULL' | 'INCREMENTAL' | 'REFRESH') {
  const { data, error } = await supabaseAdmin
    .from('research_sessions')
    .insert({
      ticker_id: tickerId,
      session_type: sessionType,
      status: 'RUNNING',
    })
    .select()
    .single();

  if (error) throw new Error(`createSession: ${error.message}`);
  return data;
}

export async function updateSessionOutputs(
  sessionId: string,
  updates: {
    maker_fundamentals_output?: MakerFundamentalsOutput | null;
    maker_macro_output?: MakerMacroOutput | null;
    maker_industry_output?: MakerIndustryOutput | null;
    maker_regulatory_output?: MakerRegulatoryOutput | null;
    correlation_output?: CorrelationOutput | null;
    checker_output?: CheckerOutput | null;
    synthesis_markdown?: string | null;
    confidence_composite?: number | null;
    status?: 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
    completed_at?: string | null;
    total_claims_checked?: number;
    claims_passed?: number;
    claims_corrected?: number;
    claims_excluded?: number;
    claims_breaking?: number;
    duration_ms?: number;
    error_log?: unknown;
  }
) {
  const { error } = await supabaseAdmin
    .from('research_sessions')
    .update(updates)
    .eq('session_id', sessionId);

  if (error) throw new Error(`updateSessionOutputs: ${error.message}`);
}

export async function getLatestSession(tickerId: string) {
  const { data } = await supabaseAdmin
    .from('research_sessions')
    .select('*')
    .eq('ticker_id', tickerId)
    .eq('status', 'COMPLETED')
    .order('initiated_at', { ascending: false })
    .limit(1)
    .single();
  return data;
}

// ---- Signals ----

export async function insertSignals(
  sessionId: string,
  tickerId: string,
  signals: ConvergenceSignal[]
) {
  if (!signals.length) return;

  const rows = signals.map((s) => ({
    session_id: sessionId,
    ticker_id: tickerId,
    signal_type: s.signal_name.toUpperCase().replace(/\s+/g, '_'),
    signal_name: s.signal_name,
    direction: s.direction,
    confidence_score: s.confidence_score,
    confidence_inputs: s.confidence_inputs,
    classification: s.classification,
    convergence_strength: s.convergence_strength,
    contributing_domains: s.contributing_domains,
    mechanism: s.mechanism,
    indicator_type: s.indicator_type,
    precedent_citation: s.historical_precedent,
  }));

  const { error } = await supabaseAdmin.from('signals').insert(rows);
  if (error) throw new Error(`insertSignals: ${error.message}`);
}

// ---- External Factors ----

export async function insertExternalFactors(
  sessionId: string,
  tickerId: string,
  factors: ExternalFactor[]
) {
  if (!factors.length) return;

  const rows = factors.map((f) => ({
    session_id: sessionId,
    ticker_id: tickerId,
    category: f.category,
    factor_name: f.factor_name,
    description: f.description,
    affected_entity: f.affected_entity,
    transmission_mechanism: f.transmission_mechanism,
    direction: f.direction,
    magnitude: f.magnitude,
    magnitude_basis: f.magnitude_basis,
    timeline: f.timeline,
    probability: f.probability,
    probability_basis: f.probability_basis,
    precedent_description: f.precedent,
    status: f.status,
    source_citations: f.source_citations,
  }));

  const { error } = await supabaseAdmin.from('external_factors').insert(rows);
  if (error) throw new Error(`insertExternalFactors: ${error.message}`);
}

// ---- Breaking Claims ----

export async function insertBreakingClaims(
  sessionId: string,
  tickerId: string,
  claims: BreakingClaim[]
) {
  if (!claims.length) return;

  const rows = claims.map((c) => ({
    session_id: sessionId,
    ticker_id: tickerId,
    original_claim: c.original_claim,
    originating_agent: c.originating_agent,
    failure_reason: c.failure_reason,
    earliest_source_timestamp: c.earliest_source_timestamp,
    classification: c.classification,
    current_status: c.current_status,
    confidence_score: c.confidence_score,
  }));

  const { error } = await supabaseAdmin.from('breaking_claims').insert(rows);
  if (error) throw new Error(`insertBreakingClaims: ${error.message}`);
}

// ---- Sources ----

export async function insertSources(
  sessionId: string,
  sources: Array<{ name: string; url?: string; tier: number; tier_label: string; claims_supported?: string[] }>
) {
  if (!sources.length) return;

  const rows = sources.map((s) => ({
    session_id: sessionId,
    name: s.name,
    url: s.url ?? null,
    tier: s.tier,
    tier_label: s.tier_label,
    claims_supported: s.claims_supported ?? [],
  }));

  const { error } = await supabaseAdmin.from('sources').insert(rows);
  if (error) throw new Error(`insertSources: ${error.message}`);
}

// ---- Filing Digests ----

export async function upsertFilingDigest(
  tickerId: string,
  filing: {
    filing_type: string;
    filing_date: string;
    period_end_date?: string;
    accession_number?: string;
    summary: string;
    key_metrics?: Record<string, unknown>;
    risk_factors?: string[];
  }
) {
  if (!filing.accession_number) return;

  const { error } = await supabaseAdmin
    .from('filing_digests')
    .upsert(
      {
        ticker_id: tickerId,
        filing_type: filing.filing_type,
        filing_date: filing.filing_date,
        period_end_date: filing.period_end_date ?? null,
        accession_number: filing.accession_number,
        summary: filing.summary,
        key_metrics: filing.key_metrics ?? null,
        risk_factors: filing.risk_factors ?? [],
      },
      { onConflict: 'ticker_id,accession_number' }
    );

  if (error) throw new Error(`upsertFilingDigest: ${error.message}`);
}
