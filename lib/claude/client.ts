import OpenAI from 'openai';

// Google Gemini via OpenAI-compatible endpoint — free tier: 1M tokens/min, 1500 req/day
const gemini = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY ?? '',
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

const MODEL = 'gemini-3.6-flash';

export interface ClaudeCallOptions {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface ClaudeCallResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

export async function callClaude(options: ClaudeCallOptions): Promise<ClaudeCallResult> {
  const { systemPrompt, userMessage, maxTokens = 8000, timeoutMs = 300_000 } = options;

  const start = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      const backoff = Math.pow(2, attempt) * 1000;
      await sleep(backoff);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await gemini.chat.completions.create(
        {
          model: MODEL,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        },
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      const content = response.choices[0]?.message?.content ?? '';

      return {
        content,
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      lastError = err as Error;

      const isRateLimit =
        err instanceof Error &&
        (err.message.includes('429') || err.message.includes('rate_limit') || err.message.includes('quota'));

      if (!isRateLimit || attempt === 2) {
        throw err;
      }
    }
  }

  throw lastError ?? new Error('Gemini API call failed after retries');
}

export async function callClaudeForJson<T>(options: ClaudeCallOptions): Promise<{
  data: T;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}> {
  const result = await callClaude(options);
  const cleaned = stripMarkdownFences(result.content);

  let data: T;
  try {
    data = JSON.parse(cleaned) as T;
  } catch {
    // Retry once with stricter JSON instruction
    const retryResult = await callClaude({
      ...options,
      userMessage: options.userMessage + '\n\nCRITICAL: Respond with ONLY valid JSON. No markdown, no preamble, no explanation.',
    });
    data = JSON.parse(stripMarkdownFences(retryResult.content)) as T;
    return {
      data,
      inputTokens: result.inputTokens + retryResult.inputTokens,
      outputTokens: result.outputTokens + retryResult.outputTokens,
      durationMs: result.durationMs + retryResult.durationMs,
    };
  }

  return {
    data,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    durationMs: result.durationMs,
  };
}
