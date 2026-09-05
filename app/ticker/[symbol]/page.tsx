'use client';

import { useEffect, useState, use } from 'react';
import SynthesisReport from '@/components/SynthesisReport';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import SignalCard from '@/components/SignalCard';
import { parseReport, type ParsedReport } from '@/lib/utils/parseReport';

interface ResearchResponse {
  sessionId: string;
  ticker: string;
  synthesisMarkdown: string;
  breakingClaimsCount: number;
  status: string;
  error?: string;
}

const DIRECTION_STYLES: Record<string, string> = {
  BULLISH:  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
  BEARISH:  'bg-red-500/20 text-red-400 border border-red-500/40',
  WATCH:    'bg-amber-500/20 text-amber-400 border border-amber-500/40',
  NEUTRAL:  'bg-slate-700/40 text-slate-300 border border-slate-600',
};

const CONF_BAR_COLOR: Record<string, string> = {
  HIGH:     'bg-emerald-500',
  MODERATE: 'bg-amber-500',
  LOW:      'bg-red-500',
};

export default function TickerPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const ticker = symbol.toUpperCase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchResponse | null>(null);
  const [parsed, setParsed] = useState<ParsedReport | null>(null);
  const [showFullReport, setShowFullReport] = useState(false);

  useEffect(() => {
    async function runResearch() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker }),
        });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const data: ResearchResponse = await res.json();
        setResult(data);
        setParsed(parseReport(data.synthesisMarkdown));
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }
    runResearch();
  }, [ticker]);

  const topCatalysts = parsed?.catalysts.slice(0, 3) ?? [];
  const topRisks = parsed?.risks.slice(0, 3) ?? [];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

      {/* Back */}
      <a href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">← Back to watchlist</a>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white font-mono">{ticker}</span>
          </div>
          <LoadingSkeleton />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results */}
      {!loading && !error && result && parsed && (
        <div className="space-y-6">

          {/* ── TOP STRIP ── */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-white font-mono">{ticker}</h1>
              <span className={`text-xs font-bold tracking-widest px-3 py-1 rounded-full ${DIRECTION_STYLES[parsed.direction] ?? DIRECTION_STYLES.NEUTRAL}`}>
                {parsed.directionLabel}
              </span>
              {result.breakingClaimsCount > 0 && (
                <span className="text-xs text-amber-400 border border-amber-500/30 bg-amber-950/30 px-2 py-0.5 rounded">
                  ⚡ {result.breakingClaimsCount} breaking
                </span>
              )}
            </div>

            {/* Confidence meter */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Confidence</p>
                <p className="text-lg font-bold text-white">{Math.round(parsed.confidence * 100)}%</p>
              </div>
              <div className="w-2 h-12 bg-slate-800 rounded-full overflow-hidden flex flex-col justify-end">
                <div
                  className={`w-full rounded-full transition-all ${CONF_BAR_COLOR[parsed.confidenceLabel] ?? 'bg-slate-500'}`}
                  style={{ height: `${parsed.confidence * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── THESIS ── */}
          {parsed.thesis && (
            <p className="text-slate-300 text-sm leading-relaxed border-l-2 border-slate-600 pl-4 italic">
              {parsed.thesis}
            </p>
          )}

          {/* ── SIGNAL CALLOUTS ── */}
          {(topCatalysts.length > 0 || topRisks.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Catalysts */}
              <div className="space-y-3">
                <h2 className="text-xs font-bold tracking-widest text-emerald-400 uppercase">
                  ▲ Bullish Signals
                </h2>
                {topCatalysts.length > 0
                  ? topCatalysts.map((s, i) => <SignalCard key={i} signal={s} />)
                  : <p className="text-slate-600 text-xs">No strong catalysts identified.</p>
                }
              </div>

              {/* Risks */}
              <div className="space-y-3">
                <h2 className="text-xs font-bold tracking-widest text-red-400 uppercase">
                  ▼ Risk Signals
                </h2>
                {topRisks.length > 0
                  ? topRisks.map((s, i) => <SignalCard key={i} signal={s} />)
                  : <p className="text-slate-600 text-xs">No critical risks flagged.</p>
                }
              </div>
            </div>
          )}

          {/* ── FULL REPORT TOGGLE ── */}
          <div className="border-t border-slate-800 pt-4">
            <button
              onClick={() => setShowFullReport(v => !v)}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-2"
            >
              <span className={`transition-transform ${showFullReport ? 'rotate-90' : ''}`}>▶</span>
              {showFullReport ? 'Hide' : 'Show'} full research brief
            </button>
            {showFullReport && (
              <div className="mt-4">
                <SynthesisReport markdown={result.synthesisMarkdown} />
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
