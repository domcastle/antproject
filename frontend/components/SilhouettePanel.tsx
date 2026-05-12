'use client';

const ZONE_META: Record<number, { label: string; color: string; signal: string; desc: string }> = {
  1: { label: '발목',   color: '#4ade80', signal: '강한 매수', desc: '52주 저점 부근. 좋은 종목이라면 분할 매수 고려 구간.' },
  2: { label: '종아리', color: '#86d96d', signal: '매수 고려', desc: '저평가 영역. 추세 확인하며 들어가도 부담 적음.' },
  3: { label: '허리',   color: '#c8a464', signal: '중립',     desc: '52주 가격 범위의 중간. 추세에 따라 양방향 모두 가능.' },
  4: { label: '어깨',   color: '#f5a623', signal: '매도 고려', desc: '고점 부근. 신규 진입은 부담, 일부 익절 검토.' },
  5: { label: '머리',   color: '#ff5b5b', signal: '강한 경고', desc: '52주 고점 부근. 새로 사긴 위험 — 보유분 일부 정리 검토.' },
};

export default function SilhouettePanel({
  zone, positionPct, signal, rsi,
}: {
  zone: number;
  positionPct: number;
  signal?: string;
  rsi?: number | null;
}) {
  const meta = ZONE_META[zone] ?? ZONE_META[3];
  const dotY = { 1: 88, 2: 72, 3: 52, 4: 32, 5: 12 }[zone] ?? 50;

  const rsiLabel = rsi != null
    ? rsi >= 70 ? '과매수' : rsi <= 30 ? '과매도' : '중립'
    : null;
  const rsiColor = rsi != null
    ? rsi >= 70 ? '#ff5b5b' : rsi <= 30 ? '#4ade80' : '#aab2bf'
    : '#aab2bf';

  return (
    <div className="card">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="kicker">Position</div>
          <h2 className="headline text-xl text-fg mt-1">실루엣 위치</h2>
        </div>
        <span className="px-3 py-1 rounded-full text-xs whitespace-nowrap"
              style={{ background: meta.color + '18', color: meta.color, border: `1px solid ${meta.color}55` }}>
          {meta.signal}
        </span>
      </div>

      <div className="grid grid-cols-[160px_1fr] gap-5 items-center">
        <div className="relative h-[200px] flex items-center justify-center">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
            {[1, 2, 3, 4, 5].map(z => {
              const y = { 1: 92, 2: 76, 3: 56, 4: 36, 5: 16 }[z]!;
              const m = ZONE_META[z];
              const active = z === zone;
              return (
                <line key={z} x1="4" y1={y} x2="96" y2={y}
                      stroke={m.color}
                      strokeOpacity={active ? 0.6 : 0.14}
                      strokeWidth={active ? 0.6 : 0.4}
                      strokeDasharray={active ? '' : '1 1.5'}
                      vectorEffect="non-scaling-stroke" />
              );
            })}
          </svg>
          <img src="/person-silhouette.png" alt="" className="h-[92%] w-auto relative z-10" style={{ filter: 'brightness(0) saturate(100%) invert(85%) sepia(15%) saturate(420%) hue-rotate(5deg) brightness(0.95)', opacity: 0.85 }} />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-20">
            <circle cx="50" cy={dotY} r="3.2" fill={meta.color} opacity="0.3"/>
            <circle cx="50" cy={dotY} r="1.8" fill={meta.color}>
              <animate attributeName="r" values="1.8;2.6;1.8" dur="2s" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>

        <div className="space-y-3">
          {[5,4,3,2,1].map(z => {
            const m = ZONE_META[z];
            const active = z === zone;
            return (
              <div key={z} className={`flex items-center gap-3 transition-opacity ${active ? '' : 'opacity-50'}`}>
                <span className="font-mono text-[10px] text-fg-3 w-3">{z}</span>
                <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                <span className={`text-sm w-14 ${active ? 'text-fg font-semibold' : 'text-fg-2'}`} style={active ? { color: m.color } : undefined}>{m.label}</span>
                <span className="text-xs text-fg-3">{m.signal}</span>
              </div>
            );
          })}
          <div className="pt-3 mt-3 border-t border-line space-y-2">
            <div>
              <div className="num text-2xl font-semibold" style={{ color: meta.color }}>{positionPct}%</div>
              <div className="text-[11px] text-fg-3 mt-0.5">52주 가격 범위 내 위치</div>
            </div>
            {rsi != null && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-fg-3">RSI(14)</span>
                <span className="num text-sm font-semibold" style={{ color: rsiColor }}>{rsi.toFixed(1)}</span>
                {rsiLabel && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: rsiColor + '18', color: rsiColor }}>
                    {rsiLabel}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {signal && (
        <div className="plain-help mt-4">{signal}</div>
      )}
    </div>
  );
}
