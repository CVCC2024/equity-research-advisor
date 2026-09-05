export default function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header */}
      <div className="h-8 bg-slate-800 rounded w-2/3" />
      <div className="h-4 bg-slate-800/60 rounded w-1/3" />

      {/* Table-like rows */}
      <div className="mt-6 space-y-2">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-4 bg-slate-800 rounded w-32" />
            <div className="h-4 bg-slate-800/60 rounded flex-1" />
            <div className="h-4 bg-slate-800/40 rounded w-24" />
          </div>
        ))}
      </div>

      {/* Paragraph blocks */}
      <div className="mt-8 space-y-2">
        <div className="h-4 bg-slate-800 rounded w-full" />
        <div className="h-4 bg-slate-800 rounded w-5/6" />
        <div className="h-4 bg-slate-800 rounded w-4/6" />
      </div>
    </div>
  );
}
