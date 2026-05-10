'use client';
import type { IndexData } from '@/lib/mockData';

export default function IndexCard({ idx }: { idx: IndexData }) {
  const up = idx.changePct >= 0;
  const c = up ? '#ff5b5b' : '#4a90ff';
  const min = Math.min(...idx.sparkline);
  const max = Math.max(...idx.sparkline);
  const range = max - min || 1;
  const W = 100, H = 32;
  const points = idx.sparkline.map((v, i) => {
    const x = (i / (idx.sparkline.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="card !p-4">
      <div className="flex items-baseline justify-between mb-1">
        <div className="font-mono text-[11px] tracking-[0.12em] text-fg-3 uppercase">{idx.name}</div>
        <div className="num text-xs" style={{ color: c }}>
          {up ? '+' : ''}{idx.changePct.toFixed(2)}%
        </div>
      </div>
      <div className="num text-2xl text-fg font-semibold mb-2">
        {idx.value.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8" preserveAspectRatio="none">
        <polyline fill="none" stroke={c} strokeWidth="1.5" points={points} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="num text-[10px] text-fg-3 mt-1">
        {up ? '+' : ''}{idx.change.toFixed(1)}
      </div>
    </div>
  );
}
