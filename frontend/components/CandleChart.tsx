'use client';
import { useEffect, useState } from 'react';
import { fetchOhlcv } from '@/lib/api';

interface Candle { date: string; open: number; high: number; low: number; close: number; ma5?: number; ma20?: number; ma60?: number; ma120?: number; bb_upper?: number; bb_lower?: number; }

const MA_COLORS: Record<string, string> = { ma5: '#c8a464', ma20: '#42a5f5', ma60: '#f5a623', ma120: '#ff5b5b' };

export default function CandleChart({ code }: { code: string }) {
  const [data, setData] = useState<Candle[]>([]);
  const [period, setPeriod] = useState('3m');
  const [showMA, setShowMA] = useState({ ma5: true, ma20: true, ma60: true, ma120: false });
  const [showBB, setShowBB] = useState(false);

  useEffect(() => {
    fetchOhlcv(code, period).then(r => r.json()).then(d => {
      if (Array.isArray(d) && d.length) setData(d);
    }).catch(() => {});
  }, [code, period]);

  if (!data.length) {
    return (
      <div className="card h-[420px] flex items-center justify-center text-fg-3 text-sm">
        차트 데이터 로드 중…
      </div>
    );
  }

  const W = 1000, H = 360;
  const padX = 12, padTop = 12, padBottom = 30;
  const innerW = W - padX * 2, innerH = H - padTop - padBottom;
  const lows = data.map(d => Math.min(d.low, d.bb_lower ?? d.low));
  const highs = data.map(d => Math.max(d.high, d.bb_upper ?? d.high));
  const min = Math.min(...lows), max = Math.max(...highs);
  const range = max - min || 1;
  const colW = innerW / data.length;
  const yFor = (v: number) => padTop + ((max - v) / range) * innerH;

  const linePath = (key: keyof Candle) => data.map((d, i) => {
    const v = d[key] as number | undefined;
    if (v === undefined || v === null) return '';
    const x = padX + i * colW + colW / 2;
    const y = yFor(v);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).filter(Boolean).join(' ');

  const bbArea = (() => {
    const upper = data.map((d, i) => {
      const v = d.bb_upper; if (v === undefined) return '';
      return `${i === 0 ? 'M' : 'L'} ${padX + i * colW + colW / 2} ${yFor(v)}`;
    }).filter(Boolean).join(' ');
    const lower = data.map((d, i) => d.bb_lower).map((v, i) => {
      if (v === undefined) return '';
      return `L ${padX + (data.length - 1 - i) * colW + colW / 2} ${yFor(v)}`;
    }).filter(Boolean).reverse().join(' ');
    return upper + ' ' + lower + ' Z';
  })();

  return (
    <div className="card">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="kicker">OHLCV</div>
          <h2 className="headline text-xl text-fg mt-1">캔들 차트</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-bg-3 border border-line rounded-md overflow-hidden">
            {[['1m','1M'], ['3m','3M'], ['6m','6M'], ['1y','1Y']].map(([k, l]) => (
              <button key={k} onClick={() => setPeriod(k)}
                className={`px-3 py-1 text-[11px] font-mono ${period === k ? 'bg-accent text-bg' : 'text-fg-2 hover:text-fg'}`}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3 flex-wrap">
        {(['ma5', 'ma20', 'ma60', 'ma120'] as const).map(k => (
          <label key={k} className="flex items-center gap-1.5 text-[11px] cursor-pointer">
            <input type="checkbox" checked={showMA[k]} onChange={e => setShowMA(s => ({ ...s, [k]: e.target.checked }))} className="accent-accent" />
            <span style={{ color: MA_COLORS[k] }}>━</span>
            <span className="font-mono text-fg-2">{k.toUpperCase()}</span>
          </label>
        ))}
        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
          <input type="checkbox" checked={showBB} onChange={e => setShowBB(e.target.checked)} className="accent-accent" />
          <span className="text-[#86d96d]">▒</span>
          <span className="font-mono text-fg-2">볼린저</span>
        </label>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* grid */}
        {[0.25, 0.5, 0.75].map(p => (
          <line key={p} x1={padX} x2={W - padX} y1={padTop + innerH * p} y2={padTop + innerH * p}
                stroke="#232936" strokeWidth="1" strokeDasharray="2 4" />
        ))}
        {/* BB band */}
        {showBB && <path d={bbArea} fill="#86d96d" fillOpacity="0.06" stroke="none" />}
        {/* Candles */}
        {data.map((d, i) => {
          const x = padX + i * colW + colW / 2;
          const up = d.close >= d.open;
          const c = up ? '#ff5b5b' : '#4a90ff';
          const yHigh = yFor(d.high), yLow = yFor(d.low);
          const yOpen = yFor(d.open), yClose = yFor(d.close);
          const bodyTop = Math.min(yOpen, yClose);
          const bodyH = Math.max(1, Math.abs(yClose - yOpen));
          const bodyW = Math.max(1, colW * 0.6);
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={yHigh} y2={yLow} stroke={c} strokeWidth="1" />
              <rect x={x - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH} fill={c} />
            </g>
          );
        })}
        {/* MA lines */}
        {(['ma5', 'ma20', 'ma60', 'ma120'] as const).map(k => showMA[k] && (
          <path key={k} d={linePath(k)} fill="none" stroke={MA_COLORS[k]} strokeWidth="1.5" />
        ))}
      </svg>
    </div>
  );
}
