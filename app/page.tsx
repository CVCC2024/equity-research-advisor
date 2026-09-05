import { getRecentTickers } from '@/lib/db/queries';
import SearchBar from '@/components/SearchBar';

export const revalidate = 60;

interface RecentTicker {
  ticker_id: string;
  symbol: string;
  company_name: string | null;
  last_researched_at: string | null;
  research_sessions?: Array<{ confidence_composite: number | null }>;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function confidenceLabel(score: number | null): { label: string; cls: string } {
  if (score === null) return { label: '—', cls: 'text-slate-500' };
  if (score >= 0.85) return { label: `${(score * 100).toFixed(0)}% HIGH`, cls: 'text-emerald-400' };
  if (score >= 0.65) return { label: `${(score * 100).toFixed(0)}% MOD`, cls: 'text-blue-400' };
  return { label: `${(score * 100).toFixed(0)}% LOW`, cls: 'text-amber-400' };
}

export default async function HomePage() {
  let recentTickers: RecentTicker[] = [];
  try {
    recentTickers = (await getRecentTickers(10)) as RecentTicker[];
  } catch {
    // Supabase not yet configured — show empty state
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-white mb-2">Equity Research Advisor</h1>
        <p className="text-slate-400 text-sm">
          Multi-agent AI research platform. Enter a US ticker to initiate a full research session.
        </p>
      </div>

      <SearchBar />

      {recentTickers.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Recent Research
          </h2>
          <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden">
            {recentTickers.map((t) => {
              const latestSession = t.research_sessions?.[0];
              const conf = confidenceLabel(latestSession?.confidence_composite ?? null);
              return (
                <a
                  key={t.ticker_id}
                  href={`/ticker/${t.symbol}`}
                  className="flex items-center justify-between px-4 py-3 bg-slate-900/50 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-white text-sm w-14">{t.symbol}</span>
                    <span className="text-slate-400 text-sm">{t.company_name ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-6 text-xs">
                    <span className={`font-mono ${conf.cls}`}>{conf.label}</span>
                    <span className="text-slate-600">{formatDate(t.last_researched_at)}</span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
