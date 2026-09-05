# Equity Research Advisor — Build Decisions & Tradeoffs

## What We Built

A wealth management signal tool that accepts a US stock ticker, fans out 7 parallel AI research agents across multiple data domains, cross-correlates findings, adversarially validates every claim, and surfaces structured signals — critical risks, strong catalysts, confidence scores — in a format a wealth manager can scan in under 30 seconds.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14+ App Router | Vercel-native, server components, API routes with `maxDuration=600` for long-running pipelines |
| Hosting | Vercel | Zero-config deployment, edge-ready, integrates with Next.js natively |
| Database | Supabase (Postgres) | Managed Postgres, built-in REST API, row-level security ready, generous free tier |
| Caching | Upstash Redis | Serverless-friendly, TTL-based report caching (24h fundamentals, 5min quotes) |
| AI | Google Gemini 3.6 Flash | See AI provider journey below |
| Styling | Tailwind CSS v4 | Utility-first, dark theme, no runtime cost |
| Language | TypeScript throughout | Type-safe agent I/O contracts prevent silent data shape failures |

---

## The AI Provider Journey

This was the most consequential decision chain in the build.

### Started: Anthropic Claude Sonnet (`claude-sonnet-4-6`)

**Why:** The build spec called for Claude with the `web_search_20250305` tool — a native Anthropic capability that lets agents search the web in real time without external API dependencies. This is the ideal setup: agents get live market data, regulatory filings, and breaking news baked into each inference call.

**What happened:** The Anthropic API key was shared in plaintext in the development chat on multiple occasions. Bots actively scrape conversations for API keys. An estimated $40 in credits was drained by automated abuse before the pattern was identified. Additionally, the `web_search_20250305` tool requires a higher billing tier than basic model access, which created a secondary blocker.

**Lesson:** Never share API keys in plaintext in any communication channel. Always use environment variables loaded via terminal (`nano .env.local`).

### Attempted: Groq (llama / compound models)

**Why:** Groq advertises a generous free tier and fast inference. Seemed like a logical fallback while the Anthropic billing situation was resolved.

**What happened:** The free tier is more restrictive than advertised for production use cases:
- `llama-3.3-70b-versatile` — not available on the account
- `groq/compound-mini` — 70k TPM limit, 30 RPM, and 413 errors on large system prompts (our prompts are 5-10KB each)
- `qwen/qwen3.8-27b` — only 1,000 output tokens per minute total across all requests — insufficient for an 8-agent pipeline

**Tradeoff accepted:** Groq works well for single-agent, small-prompt use cases. For a pipeline firing 8 concurrent agents with 5-10KB system prompts and 4-8k token outputs, the free tier is not viable without upgrading.

### Landed: Google Gemini 3.6 Flash (via OpenAI-compatible endpoint)

**Why this works:**
- 1,000,000 tokens per minute free tier — the pipeline uses ~30,000 tokens per run, well within budget
- 1,500 requests per day — enough for heavy development and demos
- OpenAI-compatible REST endpoint — minimal code change (swap base URL and API key, keep same SDK interface)
- `gemini-3.6-flash` is fast and produces strong structured JSON output with minimal hallucination on financial data

**Tradeoff:** No native web search tool. Agents use training knowledge rather than live data. This means prices, earnings dates, and breaking news may be stale. When Anthropic billing is resolved, the architecture supports a one-line swap back to Claude + `web_search_20250305`.

---

## Architecture Decisions

### Multi-Agent Pipeline (not a monolith)

**Decision:** 4 parallel Maker agents → Checker → Correlation → Checker → Synthesis, rather than one large prompt.

**Why:** A single prompt asking for fundamentals + macro + industry + regulatory + correlation analysis would exceed context limits and produce lower-quality outputs. Specialization works — the Fundamentals agent focuses exclusively on financials, the Regulatory agent exclusively on legal/compliance risk. The Checker agent then adversarially validates each claim independently.

**Tradeoff:** More complexity, longer wall-clock time (2-3 minutes vs ~30 seconds for a single call), higher token cost per run.

### `Promise.allSettled()` for Parallel Makers

**Decision:** Run all 4 Makers in parallel, collect results even if some fail.

**Why:** If the Macro agent fails, we don't want to block the Fundamentals, Industry, and Regulatory agents from running. `allSettled` captures partial results and logs individual agent failures without aborting the pipeline.

**Tradeoff:** The Synthesis agent may work with incomplete data if some Makers fail. The system degrades gracefully rather than failing completely.

### DB Calls with `.catch()` Fallbacks

**Decision:** Every Supabase call in the orchestrator has a `.catch()` that returns an ephemeral UUID fallback.

**Why:** At build time, Supabase environment variables may not be configured. Without this pattern, the pipeline crashes before a single agent fires. With it, the research pipeline runs end-to-end even without a database — results just aren't persisted.

**Tradeoff:** Silent DB failures. If Supabase is misconfigured in production, the pipeline appears to work but nothing is stored. Mitigated by logging `errorLog` to the response payload.

### Lazy Proxy Pattern for Supabase Client

**Decision:** The Supabase client is wrapped in a `Proxy` object that only calls `createClient()` on first property access, not at module import time.

**Why:** Next.js evaluates all server modules at build time. If `createClient()` is called at the top level and environment variables aren't set, the build fails. The Proxy defers initialization until runtime.

### Signal-First UI (No Tabs)

**Decision:** Replaced the 8-tab layout with a single-page signal dashboard — direction badge, confidence meter, top 3 bullish cards, top 3 risk cards, collapsible full report.

**Why:** The user is a wealth manager who needs to identify signals quickly before a client call. Tabs require clicking. The new layout is scannable in under 30 seconds without any interaction.

**Tradeoff:** Less raw data visible by default. The full synthesis report is still accessible via the "Show full research brief" toggle, so depth is preserved for analysts who need it.

### Animated Loading Screen

**Decision:** Full-screen loading state with flashing "2-3 minutes" message, dual spinner, and scrolling ticker tape of 20 data point labels.

**Why:** The pipeline genuinely takes 2-3 minutes. A blank spinner with no context reads as broken. The ticker tape communicates that real work is happening — quarterly reports, SEC filings, social media sentiment, options market signals — without requiring actual streaming infrastructure.

**Tradeoff:** The loading messages are static (not tied to real agent progress). A future improvement is Server-Sent Events (SSE) to push real-time agent completion events to the UI.

---

## What's Not Done Yet

| Item | Status | Notes |
|---|---|---|
| Upstash Redis caching | Not configured | `UPSTASH_REDIS_REST_URL` and token are empty. Without it, every request runs the full pipeline — no cache hits. |
| Live web search | Disabled | Requires Anthropic credits + `web_search_20250305` tier access. One-line re-enable when billing is resolved. |
| SSE streaming | Not built | Would show live agent progress during the 2-3 min wait. CSS loading screen is the interim solution. |
| Watchlist / multi-ticker | Not built | Home page exists but watchlist persistence and alerts are not wired up. |
| ATR-normalized alert scoring | Not built | Thresholds file exists (`lib/thresholds/alerts.ts`) but not called from anywhere. |
| Auth | Intentionally omitted | Single-tenant by design. Would add before any multi-user deployment. |

---

## Security Notes

- All API keys are in `.env.local` which is gitignored
- Several API keys were shared in plaintext during development — **all should be rotated before any production use**
- The Gemini key in the repo environment should be regenerated before going live
- Supabase service role key has full DB access — ensure RLS policies are configured before exposing any public endpoint
