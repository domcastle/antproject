'use client';
import Link from 'next/link';
import { useState } from 'react';
import { SILHOUETTE_COLORS } from '@/lib/constants';
import type { StockData } from '@/lib/mockData';

type MergedStock = StockData & {
  silhouetteZone: number;
  silhouetteSignal: string;
  silhouettePct: number;
};

export default function StockCard({ stock }: { stock: MergedStock }) {
  const [hovered, setHovered] = useState(false);
  const {
    code, name, market, price, change, changePct,
    per, pbr, silhouetteZone, silhouetteSignal, silhouettePct,
  } = stock;
  const isUp = changePct >= 0;
  const zoneColor = (SILHOUETTE_COLORS as Record<number, string>)[silhouetteZone] ?? '#8B95A1';

  const priceStr = market === 'KR'
    ? price.toLocaleString('ko-KR')
    : `$${price.toFixed(2)}`;
  const changeStr = market === 'KR'
    ? `${isUp ? '+' : ''}${change.toLocaleString('ko-KR')}`
    : `${isUp ? '+' : ''}${change.toFixed(2)}`;

  return (
    <Link href={`/stock/${code}`} className="block">
      <div
        className="relative bg-[#0f1117] border border-[#1e2330] rounded-xl p-4 cursor-pointer transition-colors hover:border-[#3182f6]/50"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-xs font-bold text-white">{name}</div>
            <div className="text-[10px] text-gray-500">{code} · {market}</div>
          </div>
          <div className="w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: zoneColor }} />
        </div>
        <div className="mb-2">
          <div className="text-sm font-bold text-white">{priceStr}</div>
          <div className="text-xs font-medium" style={{ color: isUp ? '#FF4D4D' : '#3182F6' }}>
            {changeStr} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
          </div>
        </div>
        <div className="flex gap-3 text-[9px] text-gray-500">
          {per  !== null && <span>PER {per}</span>}
          {pbr  !== null && <span>PBR {pbr}</span>}
        </div>

        {/* Hover 실루엣 패널 */}
        <div
          className={`absolute left-full top-0 ml-2 z-50 transition-all duration-300 ${
            hovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'
          }`}
          style={{ width: '140px' }}
        >
          <div className="bg-[#0f1117] border border-[#1e2330] rounded-xl p-3 shadow-xl">
            <div className="text-[10px] text-gray-400 mb-2">실루엣 위치</div>
            <div className="relative h-28 flex items-center justify-center mb-2">
              <svg viewBox="0 0 40 100" className="h-24 opacity-20" fill="#8B95A1">
                <ellipse cx="20" cy="8"  rx="6" ry="6" />
                <rect x="13" y="15" width="14" height="30" rx="3" />
                <rect x="6"  y="16" width="7"  height="22" rx="3" />
                <rect x="27" y="16" width="7"  height="22" rx="3" />
                <rect x="13" y="45" width="6"  height="30" rx="3" />
                <rect x="21" y="45" width="6"  height="30" rx="3" />
              </svg>
              <div
                className="absolute w-3 h-3 rounded-full border-2 border-white animate-pulse"
                style={{
                  backgroundColor: zoneColor,
                  top: `${100 - silhouettePct}%`,
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </div>
            <div className="text-[10px] font-semibold text-center" style={{ color: zoneColor }}>
              {silhouetteSignal}
            </div>
            <div className="text-[9px] text-gray-500 text-center">{silhouettePct}% 구간</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
