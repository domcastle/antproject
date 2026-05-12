'use client';
import { useEffect, useMemo, useState } from 'react';
import { fetchOhlcv } from '@/lib/api';

interface Candle {
  date: string; open: number; high: number; low: number; close: number;
  ma5?: number | null; ma20?: number | null; ma60?: number | null; ma120?: number | null;
  bb_upper?: number | null; bb_lower?: number | null;
}

const MA_COLORS: Record<string, string> = { ma5: '#c8a464', ma20: '#42a5f5', ma60: '#f5a623', ma120: '#ff5b5b' };
const MA_LABELS: Record<string, string> = { ma5: 'MA5', ma20: 'MA20', ma60: 'MA60', ma120: 'MA120' };

// SVG 레이아웃 상수
const W = 1000, H = 390;
const PAD_L = 14, PAD_R = 66, PAD_T = 16, PAD_B = 36;
const INNER_W = W - PAD_L - PAD_R;
const INNER_H = H - PAD_T - PAD_B;

export default function CandleChart({ code }: { code: string }) {
  const [data, setData] = useState<Candle[]>([]);
  const [period, setPeriod] = useState('3m');
  const [showMA, setShowMA] = useState({ ma5: true, ma20: true, ma60: true, ma120: false });
  const [showBB, setShowBB] = useState(false);

  useEffect(() => {
    setData([]);
    fetchOhlcv(code, period).then(r => r.json()).then(d => {
      if (Array.isArray(d) && d.length) setData(d);
    }).catch(() => {});
  }, [code, period]);

  // 실제 데이터에 값이 있는 지표만 토글 표시
  const availableMA = useMemo(() => ({
    ma5:   data.some(d => d.ma5   != null),
    ma20:  data.some(d => d.ma20  != null),
    ma60:  data.some(d => d.ma60  != null),
    ma120: data.some(d => d.ma120 != null),
  }), [data]);
  const hasBB = useMemo(() => data.some(d => d.bb_upper != null), [data]);

  if (!data.length) {
    return (
      <div className="card h-[440px] flex items-center justify-center text-fg-3 text-sm">
        차트 데이터 로드 중…
      </div>
    );
  }

  const lows  = data.map(d => Math.min(d.low,  d.bb_lower  ?? d.low));
  const highs = data.map(d => Math.max(d.high, d.bb_upper ?? d.high));
  const rawMin = Math.min(...lows), rawMax = Math.max(...highs);
  // 상하 5% 여백
  const pad5  = (rawMax - rawMin) * 0.05;
  const min   = rawMin - pad5, max = rawMax + pad5;
  const range = max - min || 1;
  const colW  = INNER_W / data.length;

  const xFor = (i: number) => PAD_L + (i + 0.5) * colW;
  const yFor = (v: number) => PAD_T + ((max - v) / range) * INNER_H;

  // 가격축 tick 5개
  const priceTicks = [0, 1, 2, 3, 4].map(i => rawMin + (rawMax - rawMin) * i / 4);
  const fmtPrice = (v: number) =>
    v >= 1000
      ? v.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
      : v.toFixed(2);

  // 날짜축 tick ~6개 균등
  const dateStep = Math.max(1, Math.floor(data.length / 6));
  const dateTicks = data
    .map((d, i) => ({ d, i }))
    .filter(({ i }) => i % dateStep === 0 || i === data.length - 1);

  const fmtDate = (s: string) => s.slice(5).replace('-', '/');

  // null 값 있어도 M/L 올바르게 처리
  const linePath = (key: keyof Candle) => {
    const parts: string[] = [];
    let inPath = false;
    for (let i = 0; i < data.length; i++) {
      const v = data[i][key] as number | null | undefined;
      if (v == null) { inPath = false; continue; }
      parts.push(`${inPath ? 'L' : 'M'} ${xFor(i)} ${yFor(v)}`);
      inPath = true;
    }
    return parts.join(' ');
  };

  const bbArea = (() => {
    const upper = data
      .map((d, i) => d.bb_upper != null ? { x: xFor(i), y: yFor(d.bb_upper!) } : null)
      .filter(Boolean) as { x: number; y: number }[];
    const lower = data
      .map((d, i) => d.bb_lower != null ? { x: xFor(i), y: yFor(d.bb_lower!) } : null)
      .filter(Boolean) as { x: number; y: number }[];
    if (!upper.length || !lower.length) return '';
    const up = upper.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const dn = [...lower].reverse().map(p => `L ${p.x} ${p.y}`).join(' ');
    return `${up} ${dn} Z`;
  })();

  return (
    <div className="card">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="kicker">OHLCV</div>
          <h2 className="headline text-xl text-fg mt-1">캔들 차트</h2>
        </div>
        <div className="flex bg-bg-3 border border-line rounded-md overflow-hidden">
          {[['1m','1M'], ['3m','3M'], ['6m','6M'], ['1y','1Y']].map(([k, l]) => (
            <button key={k} onClick={() => setPeriod(k)}
              className={`px-3 py-1 text-[11px] font-mono ${period === k ? 'bg-accent text-bg' : 'text-fg-2 hover:text-fg'}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* 가용 지표 토글 */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        {(['ma5', 'ma20', 'ma60', 'ma120'] as const).filter(k => availableMA[k]).map(k => (
          <label key={k} className="flex items-center gap-1.5 text-[11px] cursor-pointer select-none">
            <input type="checkbox" checked={showMA[k]}
              onChange={e => setShowMA(s => ({ ...s, [k]: e.target.checked }))}
              className="accent-accent" />
            <span style={{ color: MA_COLORS[k] }}>━</span>
            <span className="font-mono text-fg-2">{MA_LABELS[k]}</span>
          </label>
        ))}
        {hasBB && (
          <label className="flex items-center gap-1.5 text-[11px] cursor-pointer select-none">
            <input type="checkbox" checked={showBB} onChange={e => setShowBB(e.target.checked)} className="accent-accent" />
            <span className="text-[#86d96d]">▒</span>
            <span className="font-mono text-fg-2">볼린저</span>
          </label>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* 가격축 grid + 레이블 */}
        {priceTicks.map((p, i) => {
          const y = yFor(p);
          return (
            <g key={i}>
              <line
                x1={PAD_L} x2={W - PAD_R}
                y1={y} y2={y}
                stroke="#232936" strokeWidth="1" strokeDasharray="2 4"
              />
              <text
                x={W - PAD_R + 6} y={y + 3.5}
                fontSize="9.5" fontFamily="'IBM Plex Mono', monospace"
                fill="#6f7785" textAnchor="start" dominantBaseline="middle"
              >
                {fmtPrice(p)}
              </text>
            </g>
          );
        })}

        {/* 가격축 세로선 */}
        <line
          x1={W - PAD_R} x2={W - PAD_R}
          y1={PAD_T} y2={PAD_T + INNER_H}
          stroke="#2a3040" strokeWidth="1"
        />

        {/* BB 영역 */}
        {showBB && hasBB && <path d={bbArea} fill="#86d96d" fillOpacity="0.06" />}

        {/* 캔들 */}
        {data.map((d, i) => {
          const x = xFor(i);
          const up = d.close >= d.open;
          const c  = up ? '#ff5b5b' : '#4a90ff';
          const bT = Math.min(yFor(d.open), yFor(d.close));
          const bH = Math.max(1, Math.abs(yFor(d.close) - yFor(d.open)));
          const bW = Math.max(1, colW * 0.6);
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={yFor(d.high)} y2={yFor(d.low)} stroke={c} strokeWidth="1" />
              <rect x={x - bW / 2} y={bT} width={bW} height={bH} fill={c} />
            </g>
          );
        })}

        {/* MA 선 */}
        {(['ma5', 'ma20', 'ma60', 'ma120'] as const).map(k =>
          showMA[k] && availableMA[k] && (
            <path key={k} d={linePath(k)} fill="none" stroke={MA_COLORS[k]} strokeWidth="1.5" />
          )
        )}

        {/* BB 라인 */}
        {showBB && hasBB && (
          <>
            <path d={linePath('bb_upper')} fill="none" stroke="#86d96d" strokeWidth="1" strokeDasharray="3 3" />
            <path d={linePath('bb_lower')} fill="none" stroke="#86d96d" strokeWidth="1" strokeDasharray="3 3" />
          </>
        )}

        {/* 날짜축 가로선 + 레이블 */}
        <line
          x1={PAD_L} x2={W - PAD_R}
          y1={PAD_T + INNER_H} y2={PAD_T + INNER_H}
          stroke="#2a3040" strokeWidth="1"
        />
        {dateTicks.map(({ d, i }) => {
          const x = xFor(i);
          return (
            <g key={i}>
              <line
                x1={x} x2={x}
                y1={PAD_T + INNER_H} y2={PAD_T + INNER_H + 4}
                stroke="#3a4455" strokeWidth="1"
              />
              <text
                x={x} y={PAD_T + INNER_H + 18}
                fontSize="9.5" fontFamily="'IBM Plex Mono', monospace"
                fill="#6f7785" textAnchor="middle"
              >
                {fmtDate(d.date)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
