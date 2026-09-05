const BASE = 'https://api.massive.com';
const KEY = process.env.MASSIVE_API_KEY ?? '';

async function get(path: string, params?: Record<string, string>): Promise<unknown> {
  const url = new URL(`${BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${KEY}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  return res.json();
}

export interface MarketContext {
  ticker: string;
  companyName: string;
  marketCapB: number | null;       // billions
  employees: number | null;
  exchange: string | null;
  description: string | null;
  sector: string | null;
  currentPrice: number | null;
  priceChange1M: number | null;    // percent
  avgVolume30d: number | null;
  high52w: number | null;
  low52w: number | null;
  recentOHLCV: string;             // last 5 days formatted
  revenue_ttm: number | null;      // billions
  netIncome_ttm: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  equity: number | null;
  operatingCashFlow: number | null;
  eps_ttm: number | null;
  asOf: string;
}

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null) return 'N/A';
  return n.toFixed(decimals);
}

function toB(n: number | null | undefined): number | null {
  if (n == null) return null;
  return Math.round((n / 1e9) * 100) / 100;
}

export async function fetchMarketContext(symbol: string): Promise<MarketContext | null> {
  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const yearAgo = new Date(Date.now() - 370 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Parallel fetches
  const [refData, aggData, aggYearData, finData] = await Promise.allSettled([
    get(`/v3/reference/tickers/${symbol}`),
    get(`/v2/aggs/ticker/${symbol}/range/1/day/${monthAgo}/${today}`, { limit: '35', sort: 'desc', adjusted: 'true' }),
    get(`/v2/aggs/ticker/${symbol}/range/1/day/${yearAgo}/${today}`, { limit: '365', sort: 'desc', adjusted: 'true' }),
    get(`/vX/reference/financials`, { ticker: symbol, limit: '1', sort: 'period_of_report_date', order: 'desc' }),
  ]);

  const ref = refData.status === 'fulfilled' ? (refData.value as { results?: Record<string, unknown> } | null)?.results ?? null : null;
  const agg = aggData.status === 'fulfilled' ? (aggData.value as { results?: Array<{ o: number; h: number; l: number; c: number; v: number; t: number }> } | null)?.results ?? [] : [];
  const aggYear = aggYearData.status === 'fulfilled' ? (aggYearData.value as { results?: Array<{ h: number; l: number }> } | null)?.results ?? [] : [];
  const fin = finData.status === 'fulfilled' ? (finData.value as { results?: Array<Record<string, unknown>> } | null)?.results?.[0] ?? null : null;

  if (!ref && agg.length === 0) return null;

  // Price metrics
  const latestBar = agg[0];
  const oldest = agg[agg.length - 1];
  const currentPrice = latestBar?.c ?? null;
  const priceChange1M = latestBar && oldest ? ((latestBar.c - oldest.o) / oldest.o) * 100 : null;
  const avgVolume30d = agg.length > 0 ? agg.reduce((s, b) => s + b.v, 0) / agg.length : null;

  // 52-week high/low
  const high52w = aggYear.length > 0 ? Math.max(...aggYear.map(b => b.h)) : null;
  const low52w = aggYear.length > 0 ? Math.min(...aggYear.map(b => b.l)) : null;

  // Recent OHLCV (last 5 trading days)
  const recentOHLCV = agg.slice(0, 5).map(b => {
    const d = new Date(b.t).toISOString().split('T')[0];
    return `${d}: O=${fmt(b.o)} H=${fmt(b.h)} L=${fmt(b.l)} C=${fmt(b.c)} V=${(b.v / 1e6).toFixed(1)}M`;
  }).join('\n');

  // Financials
  const financials = fin ? (fin as { financials?: Record<string, Record<string, { value?: number }>> }).financials ?? null : null;
  const income = financials?.income_statement ?? null;
  const balance = financials?.balance_sheet ?? null;
  const cashflow = financials?.cash_flow_statement ?? null;

  const revenue_ttm = toB(income?.revenues?.value);
  const netIncome_ttm = toB(income?.net_income_loss?.value);
  const totalAssets = toB(balance?.assets?.value);
  const totalLiabilities = toB(balance?.liabilities?.value);
  const equity = toB(balance?.equity?.value);
  const operatingCashFlow = toB(cashflow?.net_cash_flow_from_operating_activities?.value);
  const eps_ttm = income?.basic_earnings_per_share?.value ?? null;

  return {
    ticker: symbol,
    companyName: (ref?.name as string) ?? symbol,
    marketCapB: toB(ref?.market_cap as number | undefined),
    employees: (ref?.total_employees as number) ?? null,
    exchange: (ref?.primary_exchange as string) ?? null,
    description: ((ref?.description as string) ?? '').slice(0, 400) || null,
    sector: (ref?.sic_description as string) ?? null,
    currentPrice,
    priceChange1M,
    avgVolume30d,
    high52w,
    low52w,
    recentOHLCV,
    revenue_ttm,
    netIncome_ttm,
    totalAssets,
    totalLiabilities,
    equity,
    operatingCashFlow,
    eps_ttm,
    asOf: today,
  };
}

export function formatContextForPrompt(ctx: MarketContext): string {
  return `
=== LIVE MARKET DATA (via Massive.com, as of ${ctx.asOf}) ===
Company: ${ctx.companyName} (${ctx.ticker})
Exchange: ${ctx.exchange ?? 'N/A'} | Sector: ${ctx.sector ?? 'N/A'}
Employees: ${ctx.employees?.toLocaleString() ?? 'N/A'}
Market Cap: $${ctx.marketCapB != null ? ctx.marketCapB.toFixed(1) + 'B' : 'N/A'}
${ctx.description ? `Description: ${ctx.description}` : ''}

Price: $${fmt(ctx.currentPrice)} | 1-Month Change: ${fmt(ctx.priceChange1M)}%
52-Week High: $${fmt(ctx.high52w)} | 52-Week Low: $${fmt(ctx.low52w)}
Avg Daily Volume (30d): ${ctx.avgVolume30d != null ? (ctx.avgVolume30d / 1e6).toFixed(1) + 'M shares' : 'N/A'}

Recent OHLCV (last 5 trading days):
${ctx.recentOHLCV || 'N/A'}

TTM Financials (USD billions):
  Revenue:             $${ctx.revenue_ttm ?? 'N/A'}B
  Net Income:          $${ctx.netIncome_ttm ?? 'N/A'}B
  Operating Cash Flow: $${ctx.operatingCashFlow ?? 'N/A'}B
  Total Assets:        $${ctx.totalAssets ?? 'N/A'}B
  Total Liabilities:   $${ctx.totalLiabilities ?? 'N/A'}B
  Shareholder Equity:  $${ctx.equity ?? 'N/A'}B
  EPS (TTM):           $${fmt(ctx.eps_ttm)}
=== END LIVE DATA ===
`.trim();
}
