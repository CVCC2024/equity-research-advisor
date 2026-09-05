import fs from 'fs/promises';
import path from 'path';
import { callClaudeForJson } from '@/lib/claude/client';
import type { MakerFundamentalsOutput } from './types';

let cachedPrompt: string | null = null;

async function getSystemPrompt(): Promise<string> {
  if (cachedPrompt) return cachedPrompt;
  const p = path.join(process.cwd(), 'prompts', 'maker-fundamentals.md');
  cachedPrompt = await fs.readFile(p, 'utf-8');
  return cachedPrompt;
}

export async function runFundamentalsMaker(ticker: string, companyName?: string, liveContext?: string): Promise<{
  output: MakerFundamentalsOutput;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}> {
  const systemPrompt = await getSystemPrompt();
  const today = new Date().toISOString().split('T')[0];
  const company = companyName ? ` (${companyName})` : '';
  const context = liveContext ? `\n\n${liveContext}` : '';

  const result = await callClaudeForJson<MakerFundamentalsOutput>({
    systemPrompt,
    userMessage: `Research ${ticker}${company}. Today's date is ${today}.${context}`,
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
