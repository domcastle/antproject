'use client';

const STATUS_COLORS: Record<string, string> = {
  extreme_fear: '#1565c0', fear: '#1976d2', neutral: '#8b95a1',
  greed: '#f5a623', extreme_greed: '#ff5b5b',
  공포: '#1976d2', 탐욕: '#f5a623',
};

const COMPONENT_ROWS = [
  { key: 'vkospi', label: 'VKOSPI 변동성', weight: '0.30' },
  { key: 'momentum', label: '모멘텀', weight: '0.25' },
  { key: 'stock_strength', label: '주가강도', weight: '0.15' },
  { key: 'trend', label: '추세', weight: '0.15' },
  { key: 'kosdaq', label: 'KOSDAQ', weight: '0.10' },
  { key: 'safe_asset', label: '안전자산 수요', weight: '0.05' },
];

export default function FearGreedGauge({
  score, label, market, components,
}: {
  score: number;
  label: string;
  market: 'KR' | 'US';
  components?: Record<string, number> | null;
}) {
  const color = STATUS_COLORS[label] ?? STATUS_COLORS[label.toLowerCase()] ?? '#c8a464';
  const cx = 140, cy = 140, r = 100;
  const pol = (deg: number) => {
    const rad = (Math.PI * deg) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const arcPath = (fromPct: number, toPct: number) => {
    const a1 = 180 + fromPct * 1.8, a2 = 180 + toPct * 1.8;
    const [x1, y1] = pol(a1), [x2, y2] = pol(a2);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };
  const segs = [
    { from: 0, to: 25, c: '#1565c0' },
    { from: 25, to: 45, c: '#42a5f5' },
    { from: 45, to: 55, c: '#8b95a1' },
    { from: 55, to: 75, c: '#f5a623' },
    { from: 75, to: 100, c: '#ff5b5b' },
  ];
  const needleA = 180 + score * 1.8;
  const [nx, ny] = pol(needleA);

  return (
    <div>
      <div className="flex items-center gap-6">
        <svg viewBox="0 0 280 195" className="w-[60%]">
          {segs.map((s, i) => (
            <path key={i} d={arcPath(s.from, s.to)} fill="none"
                  stroke={s.c} strokeWidth="22" strokeLinecap="round" opacity="0.92" />
          ))}
          {/* numeric ticks */}
          <text x={cx + (r + 18) * Math.cos(Math.PI)} y={cy + (r + 18) * Math.sin(Math.PI)}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="11" fill="#aab2bf" fontFamily="var(--font-mono)" fontWeight="600">0</text>
          <text x={cx} y={cy - r - 14} textAnchor="middle" dominantBaseline="middle"
                fontSize="11" fill="#aab2bf" fontFamily="var(--font-mono)" fontWeight="600">50</text>
          <text x={cx + (r + 18)} y={cy} textAnchor="middle" dominantBaseline="middle"
                fontSize="11" fill="#aab2bf" fontFamily="var(--font-mono)" fontWeight="600">100</text>
          {/* end labels */}
          <text x={cx - r - 4} y={cy + 22} textAnchor="middle" fontSize="9.5"
                fill="#1976d2" fontFamily="var(--font-mono)" letterSpacing="0.06em" fontWeight="600">EXTREME</text>
          <text x={cx - r - 4} y={cy + 34} textAnchor="middle" fontSize="9.5"
                fill="#1976d2" fontFamily="var(--font-mono)" letterSpacing="0.06em" fontWeight="600">FEAR</text>
          <text x={cx + r + 4} y={cy + 22} textAnchor="middle" fontSize="9.5"
                fill="#ff5b5b" fontFamily="var(--font-mono)" letterSpacing="0.06em" fontWeight="600">EXTREME</text>
          <text x={cx + r + 4} y={cy + 34} textAnchor="middle" fontSize="9.5"
                fill="#ff5b5b" fontFamily="var(--font-mono)" letterSpacing="0.06em" fontWeight="600">GREED</text>
          {/* needle */}
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#eef0f4" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="9" fill="#12151c" stroke="#eef0f4" strokeWidth="2"/>
          <circle cx={cx} cy={cy} r="3" fill={color}/>
        </svg>
        <div className="flex-1">
          <div className="num text-6xl font-semibold" style={{ color }}>{Math.round(score)}</div>
          <div className="text-base mt-1 text-fg">{label}</div>
          <div className="text-[11px] text-fg-3 mt-1">
            {market === 'KR' ? '국내 (KOSPI200 실현변동성)' : '미국 (CNN Fear & Greed)'}
          </div>
        </div>
      </div>

      {market === 'KR' && components && (
        <div className="mt-4 pt-4 border-t border-line space-y-1.5">
          {COMPONENT_ROWS.map(r => {
            const v = components[r.key] ?? 50;
            const c = v < 40 ? '#42a5f5' : v < 60 ? '#8b95a1' : '#f5a623';
            return (
              <div key={r.key} className="grid grid-cols-[120px_1fr_28px_36px] items-center gap-3 text-[11px]">
                <span className="text-fg-2">{r.label}</span>
                <div className="h-1.5 bg-bg-3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${v}%`, background: c }} />
                </div>
                <span className="num text-right text-fg">{v}</span>
                <span className="num text-right text-fg-3">{r.weight}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
