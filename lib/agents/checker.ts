import fs from 'fs/promises';
import path from 'path';
import { callClaudeForJson } from '@/lib/claude/client';
import type {
  MakerFundamentalsOutput,
  MakerMacroOutput,
  MakerIndustryOutput,
  MakerRegulatoryOutput,
  CorrelationOutput,
  CheckerOutput,
} from './types';

let cachedPrompt: string | null = null;

async function getSystemPrompt(): Promise<string> {
  if (cachedPrompt) return cachedPrompt;
  const p = path.join(process.cwd(), 'prompts', 'checker.md');
  cachedPrompt = await fs.readFile(p, 'utf-8');
  return cachedPrompt;
}

export async function runChecker(params: {
  ticker: string;
  fundamentals: MakerFundamentalsOutput | null;
  macro: MakerMacroOutput | null;
  industry: MakerIndustryOutput | null;
  regulatory: MakerRegulatoryOutput | null;
  correlation?: CorrelationOutput | null;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<{
  output: CheckerOutput;
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
    correlation_agent: params.correlation ?? null,
  };

  const result = await callClaudeForJson<CheckerOutput>({
    systemPrompt,
    userMessage: JSON.stringify(payload),
    maxTokens: params.maxTokens ?? 8000,
    timeoutMs: params.timeoutMs ?? 300_000,
  });

  return {
    output: result.data,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    durationMs: result.durationMs,
  };
}
