'use client';

import type { ParsedSignal } from '@/lib/utils/parseReport';

const TIER_STYLES = {
  critical: 'border-red-500/60 bg-red-950/40',
  strong:   'border-emerald-500/60 bg-emerald-950/40',
  watch:    'border-amber-500/60 bg-amber-950/40',
  low:      'border-slate-700 bg-slate-900/40',
};

const TIER_BADGE = {
  critical: 'bg-red-500/20 text-red-400 border border-red-500/40',
  strong:   'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
  watch:    'bg-amber-500/20 text-amber-400 border border-amber-500/40',
  low:      'bg-slate-700/40 text-slate-400 border border-slate-700',
};

const TIER_LABEL = {
  critical: 'CRITICAL RISK',
  strong:   'STRONG SIGNAL',
  watch:    'WATCH',
  low:      'LOW SIGNAL',
};

const CONF_DOT = {
  HIGH:     'bg-emerald-400',
  MODERATE: 'bg-amber-400',
  LOW:      'bg-slate-500',
};

export default function SignalCard({ signal }: { signal: ParsedSignal }) {
  const tierStyle = TIER_STYLES[signal.tier];
  const badgeStyle = TIER_BADGE[signal.tier];
  const confDot = CONF_DOT[signal.confidenceLabel] ?? 'bg-slate-500';

  return (
    <div className={`rounded-lg border p-4 flex flex-col gap-2 ${tierStyle}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded ${badgeStyle}`}>
          {TIER_LABEL[signal.tier]}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className={`w-2 h-2 rounded-full ${confDot}`} />
          {Math.round(signal.confidence * 100)}% {signal.confidenceLabel}
        </span>
      </div>
      <p className="text-sm font-semibold text-white leading-snug">{signal.title}</p>
      {signal.description && (
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{signal.description}</p>
      )}
    </div>
  );
}
