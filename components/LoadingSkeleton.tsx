'use client';

const TAPE_ITEMS = [
  'Analyzing quarterly earnings reports',
  'Scanning SEC filings & 10-K disclosures',
  'Analyzing world events & geopolitical risk',
  'Reading Federal Reserve policy signals',
  'Analyzing social media sentiment',
  'Scanning institutional investor positioning',
  'Reviewing patent filings & R&D activity',
  'Analyzing options market signals',
  'Scanning macroeconomic indicators',
  'Reviewing analyst price targets',
  'Analyzing supply chain intelligence',
  'Scanning regulatory & antitrust filings',
  'Reviewing insider trading disclosures',
  'Analyzing competitor earnings calls',
  'Scanning bond market & credit spreads',
  'Reviewing FDA & regulatory approvals',
  'Analyzing short interest & borrow rates',
  'Scanning merger & acquisition activity',
  'Reviewing executive compensation filings',
  'Analyzing consumer sentiment data',
];

// Duplicate for seamless loop
const TAPE = [...TAPE_ITEMS, ...TAPE_ITEMS];

export default function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-10 select-none overflow-hidden">

      {/* Flashing message */}
      <div className="text-center space-y-2 animate-[pulse_2.5s_ease-in-out_infinite]">
        <p className="text-slate-200 text-lg font-semibold tracking-wide">
          Generating your research brief
        </p>
        <p className="text-slate-500 text-sm">
          This report may take{' '}
          <span className="text-amber-400 font-semibold animate-[pulse_2.5s_ease-in-out_infinite]">
            2 – 3 minutes
          </span>
          {' '}while our agents work
        </p>
      </div>

      {/* Spinner */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-slate-500 animate-spin [animation-duration:1.5s]" />
      </div>

      {/* Ticker tape */}
      <div className="w-full border-y border-slate-800 bg-slate-900/60 py-3 overflow-hidden relative">
        {/* fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />

        <div className="flex gap-0 animate-[ticker_60s_linear_infinite] whitespace-nowrap w-max">
          {TAPE.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-3 px-6 text-xs text-slate-400 font-mono uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500/70 shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-600 text-center max-w-sm">
        7 AI agents are running in parallel — cross-correlating data sources and validating every claim
      </p>

    </div>
  );
}
