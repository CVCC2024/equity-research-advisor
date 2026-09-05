export interface ParsedSignal {
  title: string;
  description: string;
  confidence: number;
  confidenceLabel: 'HIGH' | 'MODERATE' | 'LOW';
  classification: string;
  type: 'catalyst' | 'risk';
  tier: 'critical' | 'strong' | 'watch' | 'low';
}

export interface ParsedReport {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'WATCH';
  directionLabel: string;
  confidence: number;
  confidenceLabel: string;
  thesis: string;
  catalysts: ParsedSignal[];
  risks: ParsedSignal[];
}

function signalTier(confidence: number, type: 'catalyst' | 'risk'): ParsedSignal['tier'] {
  if (confidence >= 0.85) return type === 'risk' ? 'critical' : 'strong';
  if (confidence >= 0.65) return 'watch';
  return 'low';
}

function parseSignalItems(section: string, type: 'catalyst' | 'risk'): ParsedSignal[] {
  const signals: ParsedSignal[] = [];
  // Match numbered items: 1. **Title** | Confidence: 0.95 (HIGH) | Classification: FOO
  const itemRegex = /\d+\.\s+\*\*([^*]+)\*\*\s*\|\s*Confidence:\s*([\d.]+)\s*\((\w+)\)\s*\|\s*Classification:\s*(\S+)[^\n]*\n([\s\S]*?)(?=\n\d+\.|\n##|$)/g;
  let match;
  while ((match = itemRegex.exec(section)) !== null) {
    const confidence = parseFloat(match[2]);
    const confidenceLabel = match[3] as 'HIGH' | 'MODERATE' | 'LOW';
    signals.push({
      title: match[1].trim(),
      confidence,
      confidenceLabel,
      classification: match[4].trim(),
      description: match[5].replace(/\s+/g, ' ').trim().slice(0, 200),
      type,
      tier: signalTier(confidence, type),
    });
  }
  return signals;
}

export function parseReport(markdown: string): ParsedReport {
  // Confidence
  const confMatch = markdown.match(/Overall Confidence:\*\*\s*([\d.]+)\/1\.00\s*\((\w+)\)/);
  const confidence = confMatch ? parseFloat(confMatch[1]) : 0.5;
  const confidenceLabel = confMatch ? confMatch[2] : 'MODERATE';

  // Direction — scan executive summary for directional keywords
  const execSection = markdown.match(/## Executive Summary\n([\s\S]*?)(?=\n##)/)?.[1] ?? '';
  const lower = execSection.toLowerCase();
  let direction: ParsedReport['direction'] = 'NEUTRAL';
  let directionLabel = 'NEUTRAL';

  if (lower.includes('strongly bullish') || lower.includes('high conviction bullish')) {
    direction = 'BULLISH'; directionLabel = 'STRONG BUY';
  } else if (lower.includes('bullish') && !lower.includes('neutral-to')) {
    direction = 'BULLISH'; directionLabel = 'BULLISH';
  } else if (lower.includes('neutral-to-slightly bullish') || lower.includes('neutral-to-bullish')) {
    direction = 'WATCH'; directionLabel = 'MILD BULLISH';
  } else if (lower.includes('strongly bearish') || lower.includes('high conviction bearish')) {
    direction = 'BEARISH'; directionLabel = 'STRONG SELL';
  } else if (lower.includes('bearish') && !lower.includes('neutral-to')) {
    direction = 'BEARISH'; directionLabel = 'BEARISH';
  } else if (lower.includes('neutral-to-slightly bearish') || lower.includes('neutral-to-bearish')) {
    direction = 'WATCH'; directionLabel = 'MILD BEARISH';
  } else if (lower.includes('neutral')) {
    direction = 'NEUTRAL'; directionLabel = 'NEUTRAL';
  }

  // Thesis — first real sentence of executive summary
  const firstSentence = execSection.replace(/\*\*/g, '').match(/([A-Z][^.!?]+[.!?])/)?.[1] ?? '';
  const thesis = firstSentence.slice(0, 180);

  // Catalysts
  const catalystSection = markdown.match(/## Key Catalysts[\s\S]*?\n([\s\S]*?)(?=\n## |\n---)/)?.[1] ?? '';
  const catalysts = parseSignalItems(catalystSection, 'catalyst');

  // Risks
  const riskSection = markdown.match(/## Key Risks[\s\S]*?\n([\s\S]*?)(?=\n## |\n---)/)?.[1] ?? '';
  const risks = parseSignalItems(riskSection, 'risk');

  return { direction, directionLabel, confidence, confidenceLabel, thesis, catalysts, risks };
}
