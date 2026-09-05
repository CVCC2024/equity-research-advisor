interface ConfidenceBadgeProps {
  score: number;
  size?: 'sm' | 'md';
}

export default function ConfidenceBadge({ score, size = 'md' }: ConfidenceBadgeProps) {
  let label: string;
  let cls: string;

  if (score >= 0.85) {
    label = 'HIGH';
    cls = 'badge-high';
  } else if (score >= 0.65) {
    label = 'MODERATE';
    cls = 'badge-moderate';
  } else if (score >= 0.45) {
    label = 'LOW';
    cls = 'badge-low';
  } else {
    label = 'INSUFFICIENT';
    cls = 'badge-insufficient';
  }

  const px = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1 rounded font-mono font-medium ${px} ${cls}`}>
      <span className="font-mono">{(score * 100).toFixed(0)}%</span>
      <span>{label}</span>
    </span>
  );
}
