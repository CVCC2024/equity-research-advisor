import fs from 'fs/promises';
import path from 'path';
import { callClaudeForJson } from '@/lib/claude/client';
import type { MakerIndustryOutput } from './types';

let cachedPrompt: string | null = null;

async function getSystemPrompt(): Promise<string> {
  if (cachedPrompt) return cachedPrompt;
  const p = path.join(process.cwd(), 'prompts', 'maker-industry.md');
  cachedPrompt = await fs.readFile(p, 'utf-8');
  return cachedPrompt;
}

export async function runIndustryMaker(ticker: string, companyName?: string): Promise<{
  output: MakerIndustryOutput;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}> {
  const systemPrompt = await getSystemPrompt();
  const today = new Date().toISOString().split('T')[0];
  const company = companyName ? ` (${companyName})` : '';

  const result = await callClaudeForJson<MakerIndustryOutput>({
    systemPrompt,
    userMessage: `Research ${ticker}${company}. Today's date is ${today}.`,
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
