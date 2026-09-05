'use client';

import { useEffect, useState, use } from 'react';
import SynthesisReport from '@/components/SynthesisReport';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import ConfidenceBadge from '@/components/ConfidenceBadge';

interface ResearchResponse {
  sessionId: string;
  ticker: string;
  synthesisMarkdown: string;
  breakingClaimsCount: number;
  status: string;
  error?: string;
}

interface AgentTabData {
  fundamentals?: unknown;
  macro?: unknown;
  industry?: unknown;
  regulatory?: unknown;
  correlation?: unknown;
  checker?: unknown;
}

type TabId = 'report' | 'fundamentals' | 'macro' | 'industry' | 'regulatory' | 'correlation' | 'validation' | 'sources';

const TABS: { id: TabId; label: string }[] = [
  { id: 'report', label: 'Research Brief' },
  { id: 'fundamentals', label: 'Fundamentals' },
  { id: 'macro', label: 'Macro' },
  { id: 'industry', label: 'Industry' },
  { id: 'regulatory', label: 'Regulatory' },
  { id: 'correlation', label: 'Correlations' },
  { id: 'validation', label: 'Validation' },
  { id: 'sources', label: 'Sources' },
];

function JsonViewer({ data }: { data: unknown }) {
  return (
    <pre className="text-xs text-slate-300 font-mono overflow-auto bg-slate-900/50 rounded p-4 border border-slate-800 max-h-[70vh]">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function TickerPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const ticker = symbol.toUpperCase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchResponse | null>(null);
  const [agentData, setAgentData] = useState<AgentTabData>({});
  const [activeTab, setActiveTab] = useState<TabId>('report');

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

        // Fetch session details for agent tabs
        if (data.sessionId) {
          const sessionRes = await fetch(`/api/research/${data.sessionId}`);
          if (sessionRes.ok) {
            const session = await sessionRes.json();
            setAgentData({
              fundamentals: session.maker_fundamentals_output,
              macro: session.maker_macro_output,
              industry: session.maker_industry_output,
              regulatory: session.maker_regulatory_output,
              correlation: session.correlation_output,
              checker: session.checker_output,
            });
          }
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }

    runResearch();
  }, [ticker]);

  const getSourcesFromChecker = () => {
    if (!agentData.checker) return { tier1: [], tier2: [], tier3: [], tier4: [] };
    const assignments = (agentData.checker as { source_tier_assignments?: Array<{ assigned_tier: number; source_name: string; source_url: string; tier_label: string }> })
      ?.source_tier_assignments ?? [];
    return {
      tier1: assignments.filter((s) => s.assigned_tier === 1),
      tier2: assignments.filter((s) => s.assigned_tier === 2),
      tier3: assignments.filter((s) => s.assigned_tier === 3),
      tier4: assignments.filter((s) => s.assigned_tier >= 4),
    };
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white font-mono">{ticker}</h1>
            {loading && (
              <span className="text-xs text-slate-400 animate-pulse">Researching...</span>
            )}
            {result && !loading && (
              <ConfidenceBadge score={0.75} />
            )}
          </div>
          {result?.breakingClaimsCount ? (
            <p className="text-xs text-amber-400 mt-1">
              {result.breakingClaimsCount} breaking claim(s) flagged for verification
            </p>
          ) : null}
        </div>
        <a href="/" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
          ← Back
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-800 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && <LoadingSkeleton />}

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && result && (
        <>
          {activeTab === 'report' && (
            <SynthesisReport markdown={result.synthesisMarkdown} />
          )}
          {activeTab === 'fundamentals' && (
            agentData.fundamentals
              ? <JsonViewer data={agentData.fundamentals} />
              : <p className="text-slate-500 text-sm">No fundamentals data available.</p>
          )}
          {activeTab === 'macro' && (
            agentData.macro
              ? <JsonViewer data={agentData.macro} />
              : <p className="text-slate-500 text-sm">No macro data available.</p>
          )}
          {activeTab === 'industry' && (
            agentData.industry
              ? <JsonViewer data={agentData.industry} />
              : <p className="text-slate-500 text-sm">No industry data available.</p>
          )}
          {activeTab === 'regulatory' && (
            agentData.regulatory
              ? <JsonViewer data={agentData.regulatory} />
              : <p className="text-slate-500 text-sm">No regulatory data available.</p>
          )}
          {activeTab === 'correlation' && (
            agentData.correlation
              ? <JsonViewer data={agentData.correlation} />
              : <p className="text-slate-500 text-sm">No correlation data available.</p>
          )}
          {activeTab === 'validation' && (
            agentData.checker
              ? <JsonViewer data={agentData.checker} />
              : <p className="text-slate-500 text-sm">No validation data available.</p>
          )}
          {activeTab === 'sources' && (() => {
            const sources = getSourcesFromChecker();
            const tierLabels = ['Tier 1 (Audited/Regulatory)', 'Tier 2 (Institutional)', 'Tier 3 (Professional)', 'Tier 4 (Social/Crowdsourced)'];
            const tiers = [sources.tier1, sources.tier2, sources.tier3, sources.tier4];
            return (
              <div className="space-y-6">
                {tiers.map((tier, idx) => (
                  tier.length > 0 && (
                    <div key={idx}>
                      <h3 className="text-sm font-semibold text-slate-300 mb-2">{tierLabels[idx]}</h3>
                      <div className="space-y-1">
                        {tier.map((s, i) => (
                          <div key={i} className="flex items-start gap-3 text-xs py-1.5 border-b border-slate-800/50">
                            <span className="text-slate-300 font-medium min-w-0 flex-1">{s.source_name}</span>
                            {s.source_url && (
                              <a
                                href={s.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 shrink-0"
                              >
                                ↗
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
                {Object.values(sources).every((t) => t.length === 0) && (
                  <p className="text-slate-500 text-sm">No source data available.</p>
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
