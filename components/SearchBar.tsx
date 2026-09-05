'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchBar() {
  const [ticker, setTicker] = useState('');
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sym = ticker.trim().toUpperCase();
    if (!sym || !/^[A-Z]{1,5}$/.test(sym)) return;
    router.push(`/ticker/${sym}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value.toUpperCase())}
        placeholder="Enter ticker (e.g. AAPL)"
        maxLength={5}
        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white font-mono text-lg placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
        autoFocus
      />
      <button
        type="submit"
        disabled={!ticker.trim()}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg transition-colors"
      >
        Research
      </button>
    </form>
  );
}
