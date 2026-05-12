'use client';
import { useEffect, useState } from 'react';
import { fetchExchange } from '@/lib/api';

const MOCK = [
  { currency: 'USD', label: '달러',   rate: 1378.5, change: 4.2,  change_pct: 0.31, direction: 'up' },
  { currency: 'EUR', label: '유로',   rate: 1492.1, change: -2.1, change_pct: -0.14, direction: 'down' },
  { currency: 'JPY', label: '엔',    rate: 906.4,  change: 0.8,  change_pct: 0.09, direction: 'up' },
  { currency: 'CNY', label: '위안',   rate: 192.3,  change: 0.0,  change_pct: 0.00, direction: 'flat' },
  { currency: 'GBP', label: '파운드', rate: 1741.2, change: -5.8, change_pct: -0.33, direction: 'down' },
];

export default function ExchangeTicker() {
  const [rates, setRates] = useState(MOCK);
  useEffect(() => {
    fetchExchange().then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : d?.rates;
      if (Array.isArray(list) && list.length) setRates(list);
    }).catch(() => {});
  }, []);
  const items = [...rates, ...rates];
  return (
    <div className="border-b border-line bg-bg overflow-hidden">
      <div className="flex items-center">
        <div className="px-4 py-2 bg-bg-2 border-r border-line text-[10px] tracking-[0.18em] uppercase text-accent font-mono shrink-0">
          ◉ 환율
        </div>
        <div className="overflow-hidden flex-1">
          <div className="ticker-track">
            {items.map((r, i) => {
              const up = r.direction === 'up';
              const flat = r.direction === 'flat';
              const c = flat ? '#aab2bf' : up ? '#ff5b5b' : '#4a90ff';
              return (
                <div key={i} className="flex items-center gap-3 px-6 py-2 border-r border-line/50 shrink-0">
                  <span className="text-[11px] text-fg-2 w-12">{r.label}</span>
                  <span className="num text-sm text-fg">{r.rate.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</span>
                  <span className="num text-[11px]" style={{ color: c }}>
                    {up ? '▲' : flat ? '–' : '▼'} {Math.abs(r.change).toFixed(2)} ({Math.abs(r.change_pct).toFixed(2)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
