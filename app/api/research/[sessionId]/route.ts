import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/db/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const { data, error } = await supabaseAdmin
    .from('research_sessions')
    .select('*, tickers(symbol, company_name)')
    .eq('session_id', sessionId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
