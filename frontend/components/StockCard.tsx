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
  const isUp      = changePct >= 0;
  const zoneColor = (SILHOUETTE_COLORS as Record<number, string>)[silhouetteZone] ?? '#7e8a9c';
  const upColor   = 'var(--up)';
  const downColor = 'var(--down)';

  const priceStr  = market === 'KR'
    ? price.toLocaleString('ko-KR')
    : `$${price.toFixed(2)}`;
  const changeStr = market === 'KR'
    ? `${isUp ? '+' : ''}${change.toLocaleString('ko-KR')}`
    : `${isUp ? '+' : ''}${change.toFixed(2)}`;

  return (
    <Link href={`/stock/${code}`} style={{ display: 'block', textDecoration: 'none' }}>
      <div
        style={{
          position: 'relative',
          background: 'var(--surface)',
          border: `1px solid ${hovered ? 'var(--accent)' : 'var(--line)'}`,
          borderRadius: 12, padding: 14, cursor: 'pointer',
          transition: 'border-color 0.12s',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>{name}</div>
            <div style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 1 }}>{code} · {market}</div>
          </div>
          <div style={{
            width: 9, height: 9, borderRadius: '50%',
            background: zoneColor, flexShrink: 0, marginTop: 2,
          }} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: 'var(--fg)',
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            {priceStr}
          </div>
          <div style={{
            fontSize: 11, fontWeight: 600, marginTop: 1,
            color: isUp ? upColor : downColor,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            {changeStr} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, fontSize: 9, color: 'var(--fg-3)' }}>
          {per !== null && <span>PER {per}</span>}
          {pbr !== null && <span>PBR {pbr}</span>}
        </div>

        {/* Hover silhouette panel */}
        <div style={{
          position: 'absolute', left: '100%', top: 0, marginLeft: 8, zIndex: 50,
          width: 130, transition: 'all 0.2s',
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateX(0)' : 'translateX(-6px)',
          pointerEvents: hovered ? 'auto' : 'none',
        }}>
          <div style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--line-2)',
            borderRadius: 10, padding: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: 9, color: 'var(--fg-3)', marginBottom: 8 }}>실루엣 위치</div>
            <div style={{ position: 'relative', height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
              <svg viewBox="0 0 40 100" style={{ height: 90, opacity: 0.15 }} fill="var(--fg-3)">
                <ellipse cx="20" cy="8"  rx="6" ry="6" />
                <rect x="13" y="15" width="14" height="30" rx="3" />
                <rect x="6"  y="16" width="7"  height="22" rx="3" />
                <rect x="27" y="16" width="7"  height="22" rx="3" />
                <rect x="13" y="45" width="6"  height="30" rx="3" />
                <rect x="21" y="45" width="6"  height="30" rx="3" />
              </svg>
              <div style={{
                position: 'absolute',
                width: 10, height: 10, borderRadius: '50%',
                background: zoneColor,
                border: '2px solid rgba(255,255,255,0.8)',
                top: `${100 - silhouettePct}%`,
                left: '50%',
                transform: 'translate(-50%, -50%)',
                boxShadow: `0 0 8px ${zoneColor}80`,
              }} />
            </div>
            <div style={{
              fontSize: 10, fontWeight: 700, textAlign: 'center',
              color: zoneColor, marginBottom: 2,
            }}>
              {silhouetteSignal}
            </div>
            <div style={{ fontSize: 9, color: 'var(--fg-3)', textAlign: 'center' }}>
              {silhouettePct}% 구간
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
