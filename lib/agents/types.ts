export type SignalClassification =
  | 'VERIFIED'
  | 'REPORTED'
  | 'RUMOR'
  | 'SPECULATION'
  | 'UNVERIFIED'
  | 'NOVEL_SIGNAL'
  | 'BREAKING_CONFIRMED'
  | 'BREAKING_UNCONFIRMED'
  | 'BREAKING_RUMOR';

export type Direction = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type ConvergenceStrength = 'STRONG' | 'MODERATE' | 'WEAK';
export type IndicatorType = 'LEADING' | 'COINCIDENT' | 'LAGGING';
export type ConfidenceLabel = 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT';

export interface MakerFundamentalsOutput {
  ticker: string;
  company_name: string;
  data_timestamp: string;
  quote: Record<string, unknown>;
  valuation: Record<string, unknown>;
  profitability: Record<string, unknown>;
  growth: Record<string, unknown>;
  balance_sheet: Record<string, unknown>;
  technical: Record<string, unknown>;
  risk_metrics: Record<string, unknown>;
  esg: Record<string, unknown>;
  filings: Record<string, unknown>;
}

export interface MakerMacroOutput {
  ticker: string;
  data_timestamp: string;
  interest_rate_environment: Record<string, unknown>;
  inflation: Record<string, unknown>;
  gdp_and_growth: Record<string, unknown>;
  employment: Record<string, unknown>;
  currency_exposure: unknown[];
  commodity_exposure: unknown[];
  yield_curve: Record<string, unknown>;
  global_central_bank_actions: unknown[];
  supply_chain_indicators: Record<string, unknown>;
  trade_policy: unknown[];
  adjacent_market_signals: unknown[];
}

export interface MakerIndustryOutput {
  ticker: string;
  data_timestamp: string;
  competitive_landscape: Record<string, unknown>;
  analyst_consensus: Record<string, unknown>;
  institutional_activity: Record<string, unknown>;
  news_analysis: Record<string, unknown>;
  social_sentiment: Record<string, unknown>;
}

export interface MakerRegulatoryOutput {
  ticker: string;
  data_timestamp: string;
  regulatory_actions: unknown[];
  legislative_pipeline: unknown[];
  patent_activity: Record<string, unknown>;
  hiring_signals: Record<string, unknown>;
  cftc_positioning: Record<string, unknown>;
  google_trends: Record<string, unknown>;
  upcoming_regulatory_calendar: unknown[];
}

export interface CorrelationOutput {
  ticker: string;
  analysis_timestamp: string;
  signal_convergence_map: ConvergenceSignal[];
  divergence_register: DivergenceEntry[];
  leading_indicators: LeadingIndicator[];
  catalyst_timeline: CatalystEvent[];
  cross_asset_correlations: Record<string, unknown>;
  anomaly_detection: AnomalyEntry[];
  scenario_framework: ScenarioFramework;
  external_factors: ExternalFactor[];
}

export interface ConvergenceSignal {
  signal_name: string;
  contributing_domains: string[];
  direction: Direction;
  convergence_strength: ConvergenceStrength;
  mechanism: string;
  classification: SignalClassification;
  indicator_type: IndicatorType;
  confidence_score: number;
  confidence_inputs: {
    source_tier_score: number;
    corroboration_score: number;
    freshness_score: number;
    consistency_score: number;
  };
  historical_precedent: {
    description: string;
    base_rate: string;
    average_magnitude: string;
    precedent_source: string;
    precedent_source_url: string;
  };
}

export interface DivergenceEntry {
  signal_a: string;
  signal_a_source_domain: string;
  signal_b: string;
  signal_b_source_domain: string;
  nature_of_conflict: 'TEMPORAL_MISMATCH' | 'METHODOLOGICAL_DIFFERENCE' | 'GENUINE_DISAGREEMENT';
  resolution_hypothesis: string;
  implication_if_a_correct: string;
  implication_if_b_correct: string;
}

export interface LeadingIndicator {
  indicator: string;
  current_reading: string;
  historical_reliability_for_sector: string;
  expected_lead_time: string;
  precedent: string;
}

export interface CatalystEvent {
  date: string;
  event: string;
  event_type: string;
  hypothesis_if_positive: string;
  hypothesis_if_negative: string;
  source: string;
}

export interface AnomalyEntry {
  anomaly: string;
  expected_behavior: string;
  actual_behavior: string;
  possible_explanations: string[];
  historical_precedent_for_this_type_of_anomaly: string;
}

export interface ScenarioFramework {
  bull_case: {
    probability_pct: number;
    primary_catalyst: string;
    supporting_signals: string[];
    outcome_range: string;
    what_increases_probability: string;
  };
  base_case: {
    probability_pct: number;
    description: string;
    outcome_range: string;
  };
  bear_case: {
    probability_pct: number;
    primary_risk: string;
    supporting_signals: string[];
    outcome_range: string;
    what_increases_probability: string;
  };
}

export interface ExternalFactor {
  factor_name: string;
  category: string;
  description: string;
  affected_entity: string;
  transmission_mechanism: string;
  direction: string;
  magnitude: string;
  magnitude_basis: string;
  timeline: string;
  probability: string;
  probability_basis: string;
  precedent: string;
  status: string;
  source_citations: Array<{ name: string; url: string; tier: number }>;
}

export interface CheckerOutput {
  ticker: string;
  validation_timestamp: string;
  summary: {
    total_claims_checked: number;
    passed: number;
    corrected_minor: number;
    reroute_moderate: number;
    critical_failures: number;
    quarantined_agents: string[];
    stale_data_points: number;
    unresolved_conflicts: number;
    unsourced_claims: number;
  };
  reroute_requests: RerouteRequest[];
  critical_failures: CriticalFailure[];
  corrections: Correction[];
  staleness_warnings: StalenessWarning[];
  conflicts: Conflict[];
  confidence_scores: ConfidenceScore[];
  source_tier_assignments: SourceTierAssignment[];
}

export interface RerouteRequest {
  originating_agent: string;
  original_claim: string;
  failure_reason: string;
  contradicting_source: { name: string; url: string; tier: number };
  correction_prompt: string;
}

export interface CriticalFailure {
  originating_agent: string;
  claim: string;
  failure_type: 'FABRICATED' | 'WRONG_COMPANY' | 'HALLUCINATED_FILING' | 'CONTRADICTS_PRIMARY_SOURCE';
  evidence: string;
  breaking_news_gate_eligible: boolean;
  earliest_source_timestamp: string | null;
}

export interface Correction {
  originating_agent: string;
  original_claim: string;
  corrected_value: string;
  correction_source: { name: string; url: string; tier: number };
  severity: 'MINOR';
}

export interface StalenessWarning {
  data_point: string;
  originating_agent: string;
  data_date: string;
  threshold: string;
  status: 'CURRENT' | 'APPROACHING' | 'STALE';
  note: string;
}

export interface Conflict {
  claim: string;
  agent_a: string;
  agent_a_value: string;
  agent_a_source_tier: number;
  agent_b: string;
  agent_b_value: string;
  agent_b_source_tier: number;
  resolution: 'OVERRIDDEN' | 'TIEBREAKER_FOUND' | 'UNRESOLVED';
  resolved_value: string | null;
  resolution_source: string | null;
}

export interface ConfidenceScore {
  claim_id: string;
  claim_summary: string;
  originating_agent: string;
  composite_score: number;
  score_breakdown: {
    source_tier: number;
    corroboration: number;
    freshness: number;
    checker_validation: number;
    internal_consistency: number;
  };
  confidence_label: ConfidenceLabel;
}

export interface SourceTierAssignment {
  source_name: string;
  source_url: string;
  assigned_tier: number;
  tier_label: string;
}

export interface BreakingClaim {
  claim_id: string;
  original_claim: string;
  originating_agent: string;
  failure_reason: string;
  earliest_source_timestamp: string | null;
  classification: 'BREAKING_CONFIRMED' | 'BREAKING_UNCONFIRMED' | 'BREAKING_RUMOR' | 'EXCLUDED';
  current_status: string;
  confidence_score: number | null;
}

export interface ResearchSession {
  session_id: string;
  ticker_id: string;
  session_type: 'FULL' | 'INCREMENTAL' | 'REFRESH';
  status: 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
  maker_fundamentals_output: MakerFundamentalsOutput | null;
  maker_macro_output: MakerMacroOutput | null;
  maker_industry_output: MakerIndustryOutput | null;
  maker_regulatory_output: MakerRegulatoryOutput | null;
  correlation_output: CorrelationOutput | null;
  checker_output: CheckerOutput | null;
  synthesis_markdown: string | null;
  confidence_composite: number | null;
  initiated_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}

export interface PipelineResult {
  sessionId: string;
  ticker: string;
  synthesisMarkdown: string;
  session: ResearchSession;
  breakingClaims: BreakingClaim[];
  error?: string;
}
