'use client';

const STATUS_LABEL: Record<string, string> = {
  undervalued: '저평가', neutral: '적정', overvalued: '고평가', bubble: '버블',
};
const STATUS_COLOR: Record<string, string> = {
  undervalued: '#4ade80', neutral: '#c8a464', overvalued: '#f5a623', bubble: '#ff5b5b',
};

export default function BuffettGauge({ value, status }: { value: number; status: string }) {
  const max = 220;
  const pct = Math.min(value / max, 1);
  const color = STATUS_COLOR[status] ?? '#c8a464';
  const label = STATUS_LABEL[status] ?? status;

  return (
    <div className="pt-1">
      <div className="flex items-baseline gap-3 mb-3">
        <span className="num text-5xl font-semibold" style={{ color }}>{value.toFixed(1)}</span>
        <span className="text-fg-3 text-sm">%</span>
        <span className="text-sm ml-auto px-2 py-0.5 rounded-md border border-line text-fg-2">{label}</span>
      </div>
      <div className="relative h-2 bg-bg-3 rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full transition-all"
             style={{ width: `${pct * 100}%`, background: `linear-gradient(90deg, #4ade80 0%, #c8a464 45%, #f5a623 70%, #ff5b5b 100%)` }} />
        {[70, 100, 150].map(t => (
          <div key={t} className="absolute top-0 bottom-0 w-px bg-fg-3/40"
               style={{ left: `${(t / max) * 100}%` }} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-fg-3 mt-1.5 font-mono">
        <span>0</span><span>70 저평가</span><span>100 적정</span><span>150 고평가</span><span>{max}+</span>
      </div>
      <div className="text-[11px] text-fg-3 mt-3">
        시가총액 / GDP × 100% — 시장 전체가 적정한지 가늠하는 지표
      </div>
    </div>
  );
}
