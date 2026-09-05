import { NextRequest, NextResponse } from 'next/server';
import { runResearchPipeline } from '@/lib/agents/orchestrator';

export const maxDuration = 600;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ticker = (body.ticker as string)?.trim().toUpperCase();

    if (!ticker || !/^[A-Z]{1,5}$/.test(ticker)) {
      return NextResponse.json({ error: 'Invalid ticker symbol' }, { status: 400 });
    }

    // Pipeline auto-detects INCREMENTAL vs FULL based on last_researched_at
    const result = await runResearchPipeline(ticker);

    return NextResponse.json({
      sessionId: result.sessionId,
      ticker: result.ticker,
      synthesisMarkdown: result.synthesisMarkdown,
      status: 'COMPLETED',
    });
  } catch (err) {
    console.error('Incremental research error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
