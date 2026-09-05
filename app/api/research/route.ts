import { NextRequest, NextResponse } from 'next/server';
import { runResearchPipeline } from '@/lib/agents/orchestrator';

export const maxDuration = 600; // 10 minutes — long-running pipeline

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ticker = (body.ticker as string)?.trim().toUpperCase();

    if (!ticker || !/^[A-Z]{1,5}$/.test(ticker)) {
      return NextResponse.json({ error: 'Invalid ticker symbol' }, { status: 400 });
    }

    const result = await runResearchPipeline(ticker);

    return NextResponse.json({
      sessionId: result.sessionId,
      ticker: result.ticker,
      synthesisMarkdown: result.synthesisMarkdown,
      breakingClaimsCount: result.breakingClaims.length,
      status: 'COMPLETED',
    });
  } catch (err) {
    console.error('Research pipeline error:', err);
    return NextResponse.json(
      { error: 'Research pipeline failed', details: String(err) },
      { status: 500 }
    );
  }
}
