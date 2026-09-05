import fs from 'fs/promises';
import path from 'path';
import { callClaude } from '@/lib/claude/client';
import type {
  MakerFundamentalsOutput,
  MakerMacroOutput,
  MakerIndustryOutput,
  MakerRegulatoryOutput,
  CorrelationOutput,
  CheckerOutput,
  BreakingClaim,
} from './types';

let cachedPrompt: string | null = null;

async function getSystemPrompt(): Promise<string> {
  if (cachedPrompt) return cachedPrompt;
  const p = path.join(process.cwd(), 'prompts', 'synthesis.md');
  cachedPrompt = await fs.readFile(p, 'utf-8');
  return cachedPrompt;
}

export async function runSynthesis(params: {
  ticker: string;
  fundamentals: MakerFundamentalsOutput | null;
  macro: MakerMacroOutput | null;
  industry: MakerIndustryOutput | null;
  regulatory: MakerRegulatoryOutput | null;
  correlation: CorrelationOutput | null;
  checkerFirst: CheckerOutput | null;
  checkerSecond: CheckerOutput | null;
  breakingClaims: BreakingClaim[];
  priorSessionSummary?: string | null;
}): Promise<{
  markdown: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}> {
  const systemPrompt = await getSystemPrompt();
  const today = new Date().toISOString();

  const payload = {
    ticker: params.ticker,
    generated_at: today,
    maker_fundamentals: params.fundamentals,
    maker_macro: params.macro,
    maker_industry: params.industry,
    maker_regulatory: params.regulatory,
    correlation_agent: params.correlation,
    checker_first_pass: params.checkerFirst,
    checker_second_pass: params.checkerSecond,
    breaking_news_queue: params.breakingClaims,
    prior_session_summary: params.priorSessionSummary ?? null,
  };

  const result = await callClaude({
    systemPrompt,
    userMessage: JSON.stringify(payload),
    maxTokens: 16000,
    timeoutMs: 300_000,
  });

  return {
    markdown: result.content,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    durationMs: result.durationMs,
  };
}
