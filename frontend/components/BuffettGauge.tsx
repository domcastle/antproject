'use client';

interface Props {
  usValue: number;
  krValue: number;
}

function getStatus(v: number): { label: string; color: string } {
  if (v < 70)  return { label: '저평가', color: '#3182F6' };
  if (v < 100) return { label: '적정',   color: '#8B95A1' };
  if (v < 150) return { label: '고평가', color: '#FF8C42' };
  return             { label: '버블',   color: '#FF4D4D' };
}

function Bar({ label, value }: { label: string; value: number }) {
  const { label: statusLabel, color } = getStatus(value);
  const pct = Math.min((value / 200) * 100, 100);
  return (
    <div className="mb-3">
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="font-bold" style={{ color }}>
          {value.toFixed(1)}%{' '}
          <span className="font-normal text-gray-500">({statusLabel})</span>
        </span>
      </div>
      <div className="relative h-2 bg-[#1e2330] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="relative h-3">
        {[70, 100, 150].map(t => (
          <div key={t} className="absolute top-0 flex flex-col items-center" style={{ left: `${(t / 200) * 100}%` }}>
            <div className="w-px h-2 bg-gray-600 opacity-60" />
            <span className="text-[8px] text-gray-600">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BuffettGauge({ usValue, krValue }: Props) {
  return (
    <div>
      <Bar label="🇺🇸 미국 (S&P500/GDP)" value={usValue} />
      <Bar label="🇰🇷 한국 (KOSPI/GDP)"   value={krValue} />
    </div>
  );
}
