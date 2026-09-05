-- Tickers: master record for each researched company
CREATE TABLE tickers (
    ticker_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(10) NOT NULL UNIQUE,
    company_name TEXT,
    sector TEXT,
    industry TEXT,
    sic_code VARCHAR(10),
    naics_code VARCHAR(10),
    fiscal_year_end_month INTEGER, -- 1-12
    last_researched_at TIMESTAMPTZ,
    research_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Research sessions: one record per full or incremental research run
CREATE TABLE research_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker_id UUID REFERENCES tickers(ticker_id) ON DELETE CASCADE,
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('FULL', 'INCREMENTAL', 'REFRESH')),
    status VARCHAR(20) DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED')),
    maker_fundamentals_output JSONB,
    maker_macro_output JSONB,
    maker_industry_output JSONB,
    maker_regulatory_output JSONB,
    correlation_output JSONB,
    checker_output JSONB,
    synthesis_markdown TEXT,
    confidence_composite DECIMAL(4,3),
    total_claims_checked INTEGER DEFAULT 0,
    claims_passed INTEGER DEFAULT 0,
    claims_corrected INTEGER DEFAULT 0,
    claims_excluded INTEGER DEFAULT 0,
    claims_breaking INTEGER DEFAULT 0,
    duration_ms INTEGER,
    error_log JSONB
);

CREATE INDEX idx_sessions_ticker ON research_sessions(ticker_id);
CREATE INDEX idx_sessions_initiated ON research_sessions(initiated_at DESC);

-- Signals: every signal detected by the Correlation Agent
CREATE TABLE signals (
    signal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES research_sessions(session_id) ON DELETE CASCADE,
    ticker_id UUID REFERENCES tickers(ticker_id) ON DELETE CASCADE,
    signal_type VARCHAR(50) NOT NULL,
    signal_name TEXT NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('BULLISH', 'BEARISH', 'NEUTRAL')),
    confidence_score DECIMAL(4,3) NOT NULL,
    confidence_inputs JSONB NOT NULL,
    classification VARCHAR(20) NOT NULL CHECK (classification IN ('VERIFIED', 'REPORTED', 'RUMOR', 'SPECULATION', 'UNVERIFIED', 'BREAKING_CONFIRMED', 'BREAKING_UNCONFIRMED', 'BREAKING_RUMOR')),
    convergence_strength VARCHAR(10) CHECK (convergence_strength IN ('STRONG', 'MODERATE', 'WEAK')),
    contributing_domains TEXT[],
    mechanism TEXT NOT NULL,
    indicator_type VARCHAR(15) CHECK (indicator_type IN ('LEADING', 'COINCIDENT', 'LAGGING')),
    precedent_citation JSONB,
    expected_resolution_window TEXT,
    actual_outcome TEXT,
    outcome_magnitude DECIMAL(6,3),
    outcome_recorded_at TIMESTAMPTZ,
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signals_ticker ON signals(ticker_id);
CREATE INDEX idx_signals_type ON signals(signal_type);
CREATE INDEX idx_signals_unresolved ON signals(ticker_id) WHERE actual_outcome IS NULL;

-- External factors: geopolitical, regulatory, macro events affecting a ticker
CREATE TABLE external_factors (
    factor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker_id UUID REFERENCES tickers(ticker_id) ON DELETE SET NULL,
    session_id UUID REFERENCES research_sessions(session_id) ON DELETE CASCADE,
    category VARCHAR(30) NOT NULL CHECK (category IN ('GEOPOLITICAL', 'REGULATORY', 'MACROECONOMIC', 'SUPPLY_CHAIN', 'COMPETITIVE', 'TECHNOLOGICAL', 'ENVIRONMENTAL', 'SOCIAL', 'LABOR_MARKET')),
    factor_name TEXT NOT NULL,
    description TEXT NOT NULL,
    affected_entity VARCHAR(30) CHECK (affected_entity IN ('COMPANY', 'INDUSTRY', 'SECTOR', 'MARKET', 'SUPPLY_CHAIN_COMPONENT', 'CUSTOMER_BASE')),
    transmission_mechanism TEXT NOT NULL,
    direction VARCHAR(15) CHECK (direction IN ('POSITIVE', 'NEGATIVE', 'UNCERTAIN', 'MIXED')),
    magnitude VARCHAR(15) CHECK (magnitude IN ('MATERIAL', 'MODERATE', 'MINOR', 'UNKNOWN')),
    magnitude_basis TEXT,
    timeline VARCHAR(30) CHECK (timeline IN ('IMMEDIATE', 'NEAR_TERM_0_90_DAYS', 'MEDIUM_TERM_90_365_DAYS', 'LONG_TERM_1YR_PLUS')),
    probability VARCHAR(20) CHECK (probability IN ('CONFIRMED', 'HIGH', 'MODERATE', 'LOW', 'SPECULATIVE')),
    probability_basis TEXT,
    precedent_description TEXT,
    status VARCHAR(15) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DEVELOPING', 'PENDING', 'RESOLVED')),
    source_citations JSONB NOT NULL,
    first_detected_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolution_description TEXT
);

CREATE INDEX idx_factors_ticker ON external_factors(ticker_id);
CREATE INDEX idx_factors_active ON external_factors(status) WHERE status != 'RESOLVED';

-- Filing digests: parsed summaries of SEC filings
CREATE TABLE filing_digests (
    digest_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker_id UUID REFERENCES tickers(ticker_id) ON DELETE CASCADE,
    filing_type VARCHAR(10) NOT NULL CHECK (filing_type IN ('10-K', '10-Q', '8-K', 'DEF14A', 'SC13D', 'SC13G', 'FORM4', '10-KA', '10-QA')),
    filing_date DATE NOT NULL,
    period_end_date DATE,
    accession_number VARCHAR(30) UNIQUE,
    summary TEXT NOT NULL,
    key_metrics JSONB,
    risk_factors TEXT[],
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ticker_id, accession_number)
);

CREATE INDEX idx_filings_ticker ON filing_digests(ticker_id);
CREATE INDEX idx_filings_type_date ON filing_digests(ticker_id, filing_type, filing_date DESC);

-- Precedents: historical pattern library for confidence scoring
CREATE TABLE precedents (
    precedent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_type VARCHAR(50) NOT NULL,
    sector TEXT,
    ticker_id UUID REFERENCES tickers(ticker_id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    occurred_at DATE NOT NULL,
    outcome TEXT NOT NULL,
    outcome_direction VARCHAR(10) CHECK (outcome_direction IN ('BULLISH', 'BEARISH', 'NEUTRAL')),
    magnitude_pct DECIMAL(6,3),
    time_to_resolution_days INTEGER,
    source_citation TEXT NOT NULL,
    source_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_precedents_signal ON precedents(signal_type);
CREATE INDEX idx_precedents_sector ON precedents(sector);

-- Confidence calibration: tracks accuracy of confidence scores over time
CREATE TABLE confidence_calibration (
    calibration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_type VARCHAR(50) NOT NULL,
    confidence_bucket VARCHAR(15) NOT NULL,
    predictions_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    hit_rate DECIMAL(4,3),
    calibration_adjustment DECIMAL(4,3) DEFAULT 0,
    last_recalculated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(signal_type, confidence_bucket)
);

-- Sources: every source cited in any research session
CREATE TABLE sources (
    source_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES research_sessions(session_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT,
    tier INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 5),
    tier_label VARCHAR(40) NOT NULL,
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    claims_supported TEXT[],
    content_hash VARCHAR(64)
);

CREATE INDEX idx_sources_session ON sources(session_id);
CREATE INDEX idx_sources_tier ON sources(tier);

-- Breaking news queue: claims pending verification
CREATE TABLE breaking_claims (
    claim_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES research_sessions(session_id) ON DELETE CASCADE,
    ticker_id UUID REFERENCES tickers(ticker_id) ON DELETE CASCADE,
    original_claim TEXT NOT NULL,
    originating_agent VARCHAR(30) NOT NULL,
    failure_reason TEXT NOT NULL,
    earliest_source_timestamp TIMESTAMPTZ,
    breaking_search_result JSONB,
    classification VARCHAR(25) NOT NULL CHECK (classification IN ('BREAKING_CONFIRMED', 'BREAKING_UNCONFIRMED', 'BREAKING_RUMOR', 'EXCLUDED')),
    current_status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (current_status IN ('ACTIVE', 'DEVELOPING', 'AGING', 'LIKELY_INACCURATE', 'CONFIRMED', 'EXCLUDED')),
    confidence_score DECIMAL(4,3),
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    last_checked_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_breaking_active ON breaking_claims(current_status) WHERE current_status NOT IN ('CONFIRMED', 'EXCLUDED');

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickers_updated_at BEFORE UPDATE ON tickers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER factors_updated_at BEFORE UPDATE ON external_factors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
