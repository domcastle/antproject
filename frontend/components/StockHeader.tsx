'use client';
import Link from 'next/link';
import type { StockData } from '@/lib/mockData';

const ZONE_META: Record<number, { label: string; color: string }> = {
  1: { label: '발목', color: '#4ade80' },
  2: { label: '종아리', color: '#86d96d' },
  3: { label: '허리', color: '#c8a464' },
  4: { label: '어깨', color: '#f5a623' },
  5: { label: '머리', color: '#ff5b5b' },
};

export default function StockHeader({
  stock, onBack,
}: {
  stock: StockData & { silhouetteZone?: number };
  onBack?: () => void;
}) {
  const up = stock.changePct >= 0;
  const c = up ? '#ff5b5b' : '#4a90ff';
  const zone = ZONE_META[stock.silhouetteZone ?? 3] ?? ZONE_META[3];
  return (
    <div className="card flex items-center gap-6 mb-4">
      <Link href="/" className="text-fg-3 hover:text-accent transition-colors text-sm">← 시장 요약</Link>
      <div className="border-l border-line h-10" />
      <div>
        <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-fg-3">
          {stock.market} · {stock.code}
        </div>
        <div className="headline text-2xl text-fg mt-0.5">{stock.name}</div>
      </div>
      <div className="ml-auto text-right">
        <div className="num text-3xl text-fg font-semibold">
          {stock.market === 'KR'
            ? stock.price.toLocaleString('ko-KR')
            : `$${stock.price.toFixed(2)}`}
        </div>
        <div className="num text-sm" style={{ color: c }}>
          {up ? '▲' : '▼'} {Math.abs(stock.change)} ({up ? '+' : ''}{stock.changePct.toFixed(2)}%)
        </div>
      </div>
      <span className="px-3 py-1.5 rounded-full border text-xs whitespace-nowrap"
            style={{ borderColor: zone.color + '55', background: zone.color + '12', color: zone.color }}>
        ● {zone.label}
      </span>
    </div>
  );
}
