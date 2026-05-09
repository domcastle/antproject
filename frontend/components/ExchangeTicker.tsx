'use client';
import { useEffect, useState } from 'react';

interface ExchangeRate {
  currency: string;
  label: string;
  rate: number;
  change: number;
  change_pct: number;
  direction: 'up' | 'down' | 'flat';
}

const MOCK_RATES: ExchangeRate[] = [
  { currency: 'USD', label: '달러',   rate: 1379.5,  change: -5.1,  change_pct: -0.37, direction: 'down' },
  { currency: 'EUR', label: '유로',   rate: 1521.3,  change:  2.3,  change_pct:  0.15, direction: 'up'   },
  { currency: 'JPY', label: '엔',     rate:    9.21, change: -0.05, change_pct: -0.54, direction: 'down' },
  { currency: 'CNY', label: '위안',   rate:  190.4,  change:  0.2,  change_pct:  0.11, direction: 'up'   },
  { currency: 'GBP', label: '파운드', rate: 1751.8,  change: -8.2,  change_pct: -0.47, direction: 'down' },
];

function formatRate(r: ExchangeRate) {
  const arrow    = r.direction === 'up' ? '▲' : r.direction === 'down' ? '▼' : '—';
  const sign     = r.change >= 0 ? '+' : '';
  const color    = r.direction === 'up' ? '#FF4D4D' : r.direction === 'down' ? '#3182F6' : '#8B95A1';
  const rateStr  = r.rate < 100
    ? r.rate.toFixed(2)
    : r.rate.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  return { arrow, sign, color, rateStr };
}

export default function ExchangeTicker() {
  const [rates, setRates] = useState<ExchangeRate[]>(MOCK_RATES);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) return;

    const load = () =>
      fetch(`${base}/api/market/exchange`)
        .then(r => r.json())
        .then((data: ExchangeRate[]) => {
          if (Array.isArray(data) && data.length > 0) setRates(data);
        })
        .catch(() => {});

    load();
    const id = setInterval(load, 900_000);
    return () => clearInterval(id);
  }, []);

  // 심리스 루프: 아이템 2벌 복사
  const items = [...rates, ...rates];

  return (
    <div className="bg-[#06080f] border-b border-[#1e2330] overflow-hidden py-1.5 select-none">
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex;
          gap: 2.5rem;
          white-space: nowrap;
          animation: ticker-scroll 35s linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="ticker-track">
        {items.map((r, i) => {
          const { arrow, sign, color, rateStr } = formatRate(r);
          return (
            <span key={i} className="inline-flex items-center gap-1.5 text-xs flex-shrink-0">
              <span className="text-gray-500">{r.label}</span>
              <span className="text-white font-medium">{rateStr}</span>
              <span style={{ color }} className="font-medium tabular-nums">
                {sign}{Math.abs(r.change).toFixed(2)}&nbsp;
                ({sign}{Math.abs(r.change_pct).toFixed(2)}%){arrow}
              </span>
              <span className="text-[#1e2330] mx-1">|</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
