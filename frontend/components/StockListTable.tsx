'use client';
import Link from 'next/link';

const ZONE_META: Record<number, { label: string; color: string; signal: string }> = {
  1: { label: '발목',   color: '#4ade80', signal: '강한 매수' },
  2: { label: '종아리', color: '#86d96d', signal: '매수 고려' },
  3: { label: '허리',   color: '#c8a464', signal: '중립'      },
  4: { label: '어깨',   color: '#f5a623', signal: '매도 고려' },
  5: { label: '머리',   color: '#ff5b5b', signal: '강한 경고' },
};

export default function StockListTable({ stocks }: { stocks: any[] }) {
  return (
    <div>
      <div className="grid grid-cols-[32px_1.4fr_1fr_1fr_1fr_92px] gap-x-3 px-3 pb-2 border-b border-line text-[10px] font-mono tracking-[0.14em] uppercase text-fg-3">
        <span></span>
        <span>종목</span>
        <span className="text-right">현재가</span>
        <span className="text-right">등락률</span>
        <span className="text-right">거래량</span>
        <span>위치</span>
      </div>
      <div className="divide-y divide-line/50">
        {stocks.map((s, i) => {
          const up = s.changePct >= 0;
          const zone = ZONE_META[s.silhouetteZone] ?? ZONE_META[3];
          return (
            <Link key={s.code} href={`/stock/${s.code}`}
              className="grid grid-cols-[32px_1.4fr_1fr_1fr_1fr_92px] gap-x-3 px-3 py-3 items-center text-sm hover:bg-bg-3/40 transition-colors group">
              <span className="num text-[10px] text-fg-3">{(i + 1).toString().padStart(2, '0')}</span>
              <div className="min-w-0">
                <div className="text-fg group-hover:text-accent transition-colors truncate">{s.name}</div>
                <div className="font-mono text-[10px] text-fg-3 mt-0.5">
                  {s.market} · {s.code}
                </div>
              </div>
              <div className="num text-right text-fg">
                {s.market === 'KR'
                  ? s.price.toLocaleString('ko-KR')
                  : `$${s.price.toFixed(2)}`}
              </div>
              <div className="num text-right" style={{ color: up ? '#ff5b5b' : '#4a90ff' }}>
                {up ? '+' : ''}{s.changePct.toFixed(2)}%
              </div>
              <div className="num text-right text-fg-2 text-xs">
                {s.market === 'KR' ? (s.volume ?? 0).toLocaleString('ko-KR') : '–'}
              </div>
              <div className="flex items-center justify-start">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border whitespace-nowrap text-[11px]"
                      style={{ borderColor: zone.color + '55', background: zone.color + '12', color: zone.color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: zone.color }} />
                  {zone.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
