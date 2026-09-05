import fs from 'fs/promises';
import path from 'path';
import { callClaudeForJson } from '@/lib/claude/client';
import type {
  MakerFundamentalsOutput,
  MakerMacroOutput,
  MakerIndustryOutput,
  MakerRegulatoryOutput,
  CheckerOutput,
  CorrelationOutput,
} from './types';

let cachedPrompt: string | null = null;

async function getSystemPrompt(): Promise<string> {
  if (cachedPrompt) return cachedPrompt;
  const p = path.join(process.cwd(), 'prompts', 'correlation.md');
  cachedPrompt = await fs.readFile(p, 'utf-8');
  return cachedPrompt;
}

export async function runCorrelation(params: {
  ticker: string;
  fundamentals: MakerFundamentalsOutput | null;
  macro: MakerMacroOutput | null;
  industry: MakerIndustryOutput | null;
  regulatory: MakerRegulatoryOutput | null;
  checkerSummary: CheckerOutput['summary'] | null;
}): Promise<{
  output: CorrelationOutput;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}> {
  const systemPrompt = await getSystemPrompt();
  const today = new Date().toISOString().split('T')[0];

  const payload = {
    ticker: params.ticker,
    today,
    maker_fundamentals: params.fundamentals,
    maker_macro: params.macro,
    maker_industry: params.industry,
    maker_regulatory: params.regulatory,
    checker_validation_summary: params.checkerSummary,
  };

  const result = await callClaudeForJson<CorrelationOutput>({
    systemPrompt,
    userMessage: JSON.stringify(payload),
    maxTokens: 8000,
    timeoutMs: 300_000,
  });

  return {
    output: result.data,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    durationMs: result.durationMs,
  };
}
